import { NextResponse } from "next/server";
import {
  ON_REPEAT_LIMIT,
  ON_REPEAT_PLAYLIST_ID,
  type Track,
} from "@/data/music";

/**
 * The "on repeat" list, assembled from two services because neither one can
 * do the whole job:
 *
 * - spotify knows the playlist and has the artwork, but `preview_url` has
 *   returned null for apps created after november 2024, so it cannot supply
 *   audio at all.
 * - itunes has no idea what my playlist is, but will hand back a 30 second
 *   preview for any track by name with no key and no auth.
 *
 * So: spotify names the tracks, itunes voices them. A track that itunes cannot
 * match is dropped rather than listed as a dead row.
 */

/** Refetched hourly. The playlist changes far slower than the traffic. */
export const revalidate = 3600;

type SpotifyTrack = {
  track: {
    id: string | null;
    name: string;
    artists: { name: string }[];
    album: { images: { url: string; width: number }[] };
  } | null;
};

async function spotifyToken(id: string, secret: string) {
  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      // Client credentials: an app-level token, so no visitor ever sees a
      // spotify login and nothing needs a refresh token on disk.
      Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    // Tokens last an hour; this route is revalidated on the same clock.
    next: { revalidate: 3000 },
  });

  if (!response.ok) {
    throw new Error(`spotify auth failed: ${response.status}`);
  }

  const { access_token } = (await response.json()) as { access_token: string };
  return access_token;
}

async function playlistTracks(token: string) {
  const url = new URL(
    `https://api.spotify.com/v1/playlists/${ON_REPEAT_PLAYLIST_ID}/tracks`,
  );
  url.searchParams.set("limit", String(ON_REPEAT_LIMIT));
  url.searchParams.set(
    "fields",
    "items(track(id,name,artists(name),album(images(url,width))))",
  );

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    next: { revalidate },
  });

  if (!response.ok) {
    throw new Error(`spotify playlist failed: ${response.status}`);
  }

  const { items } = (await response.json()) as { items: SpotifyTrack[] };
  return items;
}

/** Finds a playable 30s preview for a track spotify will not give audio for. */
async function itunesPreview(title: string, artist: string) {
  const url = new URL("https://itunes.apple.com/search");
  url.searchParams.set("term", `${artist} ${title}`);
  url.searchParams.set("media", "music");
  url.searchParams.set("entity", "song");
  url.searchParams.set("limit", "1");

  const response = await fetch(url, { next: { revalidate: 86400 } });
  if (!response.ok) return null;

  const { results } = (await response.json()) as {
    results: { previewUrl?: string }[];
  };
  return results[0]?.previewUrl ?? null;
}

export async function GET() {
  const id = process.env.SPOTIFY_CLIENT_ID;
  const secret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!id || !secret) {
    // Not an error: the page is expected to work with just my own uploads, so
    // this reports the gap and lets the client render the rest.
    return NextResponse.json(
      { tracks: [], reason: "spotify credentials are not configured" },
      { status: 200 },
    );
  }

  try {
    const token = await spotifyToken(id, secret);
    const items = await playlistTracks(token);

    const resolved = await Promise.all(
      items.map(async ({ track }): Promise<Track | null> => {
        if (!track?.id) return null;

        const artist = track.artists.map((a) => a.name).join(", ");
        const audioSrc = await itunesPreview(track.name, artist);
        if (!audioSrc) return null;

        // Widest image first; the label wants the highest resolution available.
        const artwork = [...track.album.images].sort(
          (a, b) => b.width - a.width,
        )[0]?.url;

        return {
          id: track.id,
          title: track.name,
          artist,
          artwork: artwork ?? "/music/art/placeholder.svg",
          audioSrc,
          source: "on-repeat",
        };
      }),
    );

    return NextResponse.json({ tracks: resolved.filter((t) => t !== null) });
  } catch (error) {
    return NextResponse.json(
      { tracks: [], reason: error instanceof Error ? error.message : "failed" },
      { status: 200 },
    );
  }
}
