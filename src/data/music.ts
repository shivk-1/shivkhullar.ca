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
};

/**
 * One of mine. Carries the two things a spotify row cannot: when I made it,
 * and a line about what it is. Both are only ever shown on the produced tab,
 * which is why they live here rather than on `Track`.
 */
export type ProducedTrack = Track & {
  source: "produced";
  /** ISO date, e.g. "2026-04-18". Only the year is rendered. */
  date: string;
  /** One line: the sample, the intent, the gear. Kept short enough to sit
      under the title without wrapping past two lines. */
  note: string;
};

/**
 * My own productions. Full length, served from /public, no third party in the
 * path — these load even when the on-repeat fetch fails.
 *
 * TODO: placeholder rows. Drop the real mp3s in public/music/tracks and the
 * covers in public/music/art, then fix the titles, dates and notes below.
 */
const produced: ProducedTrack[] = [
  {
    id: "mine-1",
    title: "first track",
    artist: "shivansh",
    artwork: "/music/art/placeholder.svg",
    audioSrc: "/music/tracks/first-track.mp3",
    source: "produced",
    date: "2026-04-18",
    note: "placeholder — say what this one is here.",
  },
  {
    id: "mine-2",
    title: "second track",
    artist: "shivansh",
    artwork: "/music/art/placeholder.svg",
    audioSrc: "/music/tracks/second-track.mp3",
    source: "produced",
    date: "2025-11-02",
    note: "placeholder — say what this one is here.",
  },
];

/** Newest first, so the top of the tab is always the most recent thing. */
export const producedTracks: ProducedTrack[] = [...produced].sort((a, b) =>
  a.date < b.date ? 1 : -1,
);

/**
 * The spotify playlist behind the "on repeat" list. Must be public, and must
 * be one you made: spotify's own algorithmic playlists (discover weekly, daily
 * mix, and friends) are blocked for apps created after november 2024.
 *
 * TODO: replace with a real playlist id.
 */
export const ON_REPEAT_PLAYLIST_ID = "37i9dQZF1DXcBWIGoYBM5M";

/** How many playlist tracks to show. Spotify pages at 100. */
export const ON_REPEAT_LIMIT = 30;

/** Just the year, for the produced rows. */
export function trackYear(iso: string) {
  return iso.slice(0, 4);
}
