/** A track the deck can play, whatever it was sourced from. */
export type Track = {
  id: string;
  title: string;
  artist: string;
  /** Square cover, mapped onto the record label. */
  artwork: string;
  /** Anything an <audio> element can play. */
  audioSrc: string;
  /** Where it came from, so the library can group and label it. */
  source: "produced" | "on-repeat";
  /** Album name, shown in the middle column of a row. Absent for my own. */
  album?: string;
  /** Seconds. Known up front for pulled tracks, so the row can print a
      duration without waiting for the audio element to load metadata. */
  seconds?: number;
  /**
   * The line that lands on the notepad in the room while this is playing.
   *
   * Hand written for every track, mine and pulled alike — nothing derives it,
   * because the whole point is that it is a note from me rather than metadata.
   * Absent leaves the page blank, which is better than printing a stand-in.
   *
   * Keep it to a line or two: the pad is on the floor and foreshortened, and
   * a paragraph there is decoration nobody can read.
   *
   * Letters and `. , ! ? ' " : ;` only. The hand lettering the pad is set in
   * carries 70 glyphs and no others — no digits, no hyphens, no brackets, no
   * ampersand — and troika draws what it cannot find as nothing at all, so a
   * year or a dash here comes out as a hole in the sentence.
   */
  message?: string;
};

/**
 * One of mine. Carries the two things a pulled row cannot: when I made it,
 * and a line about what it is. Both are only ever shown on the produced tab,
 * which is why they live here rather than on `Track`.
 */
export type ProducedTrack = Track & {
  source: "produced";
  /** ISO date, e.g. "2026-04-18". Only the year is rendered. */
  date: string;
  /** One line: the sample, the intent, the gear. Kept short enough to sit
      under the title without wrapping past two lines. This is the library
      row's subtitle, not the notepad — that is `message`, on `Track`, and the
      two are written for different places. */
  note: string;
};

/**
 * My own productions. Full length, served from /public, no third party in the
 * path — these load even when the on-repeat fetch fails.
 *
 * TODO: placeholder rows. Drop the real mp3s in public/music/tracks and the
 * covers in public/music/art, then fix the titles, dates, notes, messages and
 * lengths below.
 */
const produced: ProducedTrack[] = [
  {
    id: "mine-1",
    title: "first track",
    artist: "shivansh",
    artwork: "/music/art/placeholder.svg",
    audioSrc: "/music/tracks/first-track.mp3",
    source: "produced",
    seconds: 180,
    date: "2026-04-18",
    note: "placeholder — say what this one is here.",
    message: "placeholder note. replace this with something about the track.",
  },
  {
    id: "mine-2",
    title: "second track",
    artist: "shivansh",
    artwork: "/music/art/placeholder.svg",
    audioSrc: "/music/tracks/second-track.mp3",
    source: "produced",
    seconds: 180,
    date: "2025-11-02",
    note: "placeholder — say what this one is here.",
    message:
      "placeholder note, a good deal longer than the other one, so that the two of them do not come out the same size on the page.",
  },
];

/** Newest first, so the top of the tab is always the most recent thing. */
export const producedTracks: ProducedTrack[] = [...produced].sort((a, b) =>
  a.date < b.date ? 1 : -1,
);

/** One song I want on the "on repeat" tab, named the way I'd say it out loud. */
export type OnRepeatSeed = {
  title: string;
  artist: string;
  /**
   * Optional override, for when the obvious search lands on the wrong thing —
   * a live cut, a remaster, someone else's cover. Paste the numeric id out of
   * any music.apple.com/…/song/…/<id> url and the search is skipped.
   */
  itunesId?: string;
  /** Copied onto the resolved track by /api/on-repeat. See `Track.message`. */
  message?: string;
};

/**
 * The "on repeat" list, written by hand.
 *
 * Spotify is not in this path on purpose: `preview_url` has come back null for
 * every app created after november 2024, so spotify can name a track but can
 * never voice one. The itunes search api needs no key and no auth, and hands
 * back artwork, album, duration and a 30 second preview for a plain
 * "artist title" query — so this list is just the names, and the route at
 * /api/on-repeat resolves them.
 *
 * Order here is the order on the tab. A row itunes cannot match is dropped
 * rather than listed dead.
 *
 * TODO: placeholder picks — replace with the real rotation.
 */
export const onRepeatSeeds: OnRepeatSeed[] = [
  {
    title: "Nights",
    artist: "Frank Ocean",
    message: "two words.",
  },
  {
    title: "Passionfruit",
    artist: "Drake",
    message: "a short placeholder note.",
  },
  {
    title: "Redbone",
    artist: "Childish Gambino",
    message:
      "a middling placeholder note, long enough that it has to wrap onto a couple of lines before it will sit on the paper.",
  },
  {
    title: "Sunflower",
    artist: "Rex Orange County",
    message:
      "a longer placeholder note. the lettering is measured after troika has laid it out, then stepped down until the whole block sits inside the margins of the page, however many lines that turns out to take.",
  },
  {
    title: "Time Moves Slow",
    artist: "BADBADNOTGOOD",
    message:
      "the longest placeholder of the set, here to prove the other end of the range. it keeps going for a while yet, so that the fitting pass has to bring the writing right down to the smallest size the page allows before all of it will fit between the margins.",
  },
];

/** Just the year, for the produced rows. */
export function trackYear(iso: string) {
  return iso.slice(0, 4);
}

/**
 * mm:ss, shared by the rows and the dock so the two never drift apart.
 * Undefined means the length is genuinely unknown, which prints as dashes;
 * NaN is a duration that has not landed from the audio element yet, which
 * reads better as a zero counting up.
 */
export function clock(seconds: number | undefined) {
  if (seconds === undefined) return "--:--";
  if (!Number.isFinite(seconds)) return "0:00";
  const whole = Math.floor(seconds);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}
