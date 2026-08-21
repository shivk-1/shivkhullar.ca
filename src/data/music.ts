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
  source: "mine" | "on-repeat";
};

/**
 * My own productions. Full length, served from /public, no third party in the
 * path — these load even when the on-repeat fetch fails.
 *
 * TODO: placeholder rows. Drop the real mp3s in public/music/tracks and the
 * covers in public/music/art, then fix the titles below.
 */
export const myTracks: Track[] = [
  {
    id: "mine-1",
    title: "first track",
    artist: "shivansh",
    artwork: "/music/art/placeholder.svg",
    audioSrc: "/music/tracks/first-track.mp3",
    source: "mine",
  },
  {
    id: "mine-2",
    title: "second track",
    artist: "shivansh",
    artwork: "/music/art/placeholder.svg",
    audioSrc: "/music/tracks/second-track.mp3",
    source: "mine",
  },
];

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
