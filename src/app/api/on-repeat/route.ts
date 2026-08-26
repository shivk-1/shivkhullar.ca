import { NextResponse } from "next/server";
import { onRepeatSeeds, type OnRepeatSeed, type Track } from "@/data/music";

/**
 * Turns the hand-written list in src/data/music.ts into playable rows.
 *
 * The itunes api is the whole backend here: no key, no auth, no oauth dance,
 * and it returns artwork, album, duration and a 30 second preview. Spotify is
 * deliberately absent — its `preview_url` is null for every app registered
 * after november 2024, so it can name a track but never voice one.
 */

/** Refetched daily. The list only changes when I edit the file. */
export const revalidate = 86400;

type ItunesSong = {
  wrapperType?: string;
  trackId: number;
  trackName: string;
  artistName: string;
  collectionName?: string;
  artworkUrl100?: string;
  previewUrl?: string;
  trackTimeMillis?: number;
};

/** itunes serves 100px covers by default; the label on the record wants more. */
function upscale(artwork: string) {
  return artwork.replace(/\/\d+x\d+bb\./, "/600x600bb.");
}

async function itunes(url: URL): Promise<ItunesSong[]> {
  const response = await fetch(url, { next: { revalidate } });
  if (!response.ok) return [];

  // The api answers text/javascript, so `response.json()` refuses it.
  const { results } = JSON.parse(await response.text()) as {
    results?: ItunesSong[];
  };
  return results ?? [];
}

/** Loose compare: case, punctuation and spacing are all noise here. */
function fold(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

/**
 * Versions that float to the top of a plain search but are never what I meant:
 * a live cut, someone's dj set, a string-quartet tribute, karaoke.
 */
const NOT_THE_ORIGINAL =
  /\b(live|dj mix|remix|karaoke|instrumental|tribute|lullaby|cover|performs|made popular)\b/i;

/**
 * How well one hit answers the seed. Higher wins; zero means no match at all,
 * so a bad list drops the row rather than putting the wrong song on the tab.
 */
function score(song: ItunesSong, seed: OnRepeatSeed) {
  if (!song.previewUrl) return 0;

  const title = fold(song.trackName);
  const wanted = fold(seed.title);

  // The title has to be the title. A hit that merely starts with it is often
  // "Nights (Slowed)" or a medley, so it scores but does not win outright.
  let points = title === wanted ? 6 : title.startsWith(wanted) ? 3 : 0;
  if (points === 0) return 0;

  if (fold(song.artistName).includes(fold(seed.artist))) points += 4;
  if (NOT_THE_ORIGINAL.test(`${song.trackName} ${song.collectionName ?? ""}`)) {
    points -= 5;
  }

  return Math.max(points, 0);
}

function best(songs: ItunesSong[], seed: OnRepeatSeed) {
  return (
    songs
      .filter((song) => song.wrapperType !== "collection")
      .map((song) => ({ song, points: score(song, seed) }))
      .filter(({ points }) => points > 0)
      .sort((a, b) => b.points - a.points)[0]?.song ?? null
  );
}

/**
 * The artist's catalogue, up to itunes' 200 row ceiling.
 *
 * This exists because the plain search endpoint is genuinely bad at this: an
 * "frank ocean nights" query returns six other Blonde tracks, a piano tribute
 * and a Billy Ocean single, and never the song itself. Walking in through the
 * artist id instead puts the real recording in the list every time.
 *
 * Memoised per request so a rotation with three tracks by one artist costs one
 * lookup rather than three.
 */
function artistCatalogue() {
  const cache = new Map<string, Promise<ItunesSong[]>>();

  return (artist: string) => {
    const key = fold(artist);
    const hit = cache.get(key);
    if (hit) return hit;

    const pending = (async () => {
      const search = new URL("https://itunes.apple.com/search");
      search.searchParams.set("term", artist);
      search.searchParams.set("entity", "musicArtist");
      search.searchParams.set("limit", "1");

      const [found] = await itunes(search);
      const artistId = (found as { artistId?: number } | undefined)?.artistId;
      if (!artistId) return [];

      const lookup = new URL("https://itunes.apple.com/lookup");
      lookup.searchParams.set("id", String(artistId));
      lookup.searchParams.set("entity", "song");
      lookup.searchParams.set("limit", "200");
      return itunes(lookup);
    })();

    cache.set(key, pending);
    return pending;
  };
}

/** Last resort when the artist walk comes up empty — a plain scored search. */
async function searchFallback(seed: OnRepeatSeed) {
  const url = new URL("https://itunes.apple.com/search");
  url.searchParams.set("term", `${seed.artist} ${seed.title}`);
  url.searchParams.set("media", "music");
  url.searchParams.set("entity", "song");
  url.searchParams.set("limit", "25");
  return best(await itunes(url), seed);
}

export async function GET() {
  const catalogue = artistCatalogue();

  const resolve = async (seed: OnRepeatSeed) => {
    // An explicit id skips every guess: paste the number out of any
    // music.apple.com/…/song/…/<id> url and that is the recording you get.
    if (seed.itunesId) {
      const url = new URL("https://itunes.apple.com/lookup");
      url.searchParams.set("id", seed.itunesId);
      url.searchParams.set("entity", "song");
      const [song] = await itunes(url);
      return song?.previewUrl ? song : null;
    }

    return (
      best(await catalogue(seed.artist), seed) ?? (await searchFallback(seed))
    );
  };

  try {
    const resolved = await Promise.all(
      onRepeatSeeds.map(async (seed): Promise<Track | null> => {
        const song = await resolve(seed);
        // No preview means no audio, and a row that cannot play is worse than
        // a row that is not there.
        if (!song?.previewUrl) return null;

        return {
          id: `itunes-${song.trackId}`,
          // Prefer what I wrote over what itunes returns: my spelling is the
          // one the rest of the page was designed around, and itunes likes to
          // append "(Remastered 2019)" and friends.
          title: seed.title,
          artist: seed.artist,
          artwork: song.artworkUrl100
            ? upscale(song.artworkUrl100)
            : "/music/art/placeholder.svg",
          audioSrc: song.previewUrl,
          source: "on-repeat",
          album: song.collectionName,
          seconds: song.trackTimeMillis
            ? Math.round(song.trackTimeMillis / 1000)
            : undefined,
          // Mine, not itunes': the notepad in the room prints this verbatim.
          message: seed.message,
        };
      }),
    );

    return NextResponse.json({ tracks: resolved.filter((t) => t !== null) });
  } catch (error) {
    // 200 with an empty list: the page is expected to work off my own uploads
    // alone, so this reports the gap and lets the client render the rest.
    return NextResponse.json(
      { tracks: [], reason: error instanceof Error ? error.message : "failed" },
      { status: 200 },
    );
  }
}
