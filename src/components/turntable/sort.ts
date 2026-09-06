import type { Track } from "@/data/music";

/**
 * The orders a list can be put in.
 *
 * "shuffle" is not an ordering so much as the absence of one: both lists
 * arrive already shuffled once per page load, and picking it hands back that
 * order untouched. Re-shuffling on every render would reorder rows under the
 * cursor while someone is reading them.
 */
export type SortKey =
  | "shuffle"
  | "a-z"
  | "z-a"
  | "shortest"
  | "longest"
  | "newest"
  | "oldest";

export const SORT_LABELS: Record<SortKey, string> = {
  shuffle: "shuffled",
  "a-z": "title a–z",
  "z-a": "title z–a",
  shortest: "shortest first",
  longest: "longest first",
  newest: "newest first",
  oldest: "oldest first",
};

/** Menu order, which is grouped by what you are sorting on rather than a-z. */
export const SORT_KEYS: SortKey[] = [
  "shuffle",
  "a-z",
  "z-a",
  "shortest",
  "longest",
  "newest",
  "oldest",
];

/**
 * Fisher-Yates, on a copy.
 *
 * Only ever called after hydration, so the randomness never has a server
 * render to disagree with.
 */
export function shuffle<T>(items: T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Rows a comparison cannot place — no duration, no release date — sink to the
 * bottom in both directions rather than clumping at the top of one of them.
 * An unknown is not "very short" or "very old"; it is unknown, and the honest
 * place for it is out of the way.
 */
function compare(a: number | undefined, b: number | undefined, desc: boolean) {
  if (a === undefined && b === undefined) return 0;
  if (a === undefined) return 1;
  if (b === undefined) return -1;
  return desc ? b - a : a - b;
}

function released(track: Track) {
  const value = track.released ? Date.parse(track.released) : NaN;
  return Number.isNaN(value) ? undefined : value;
}

/**
 * Ordered copy. `tracks` is expected to already be in its shuffled order, so
 * that is what "shuffle" returns and what every other key ties on.
 */
export function sortTracks<T extends Track>(tracks: T[], key: SortKey): T[] {
  if (key === "shuffle") return tracks;

  const out = [...tracks];
  switch (key) {
    case "a-z":
    case "z-a":
      // Locale compare so "Ámbar" files with the a's, and numeric so a title
      // ending in 2 lands before one ending in 10.
      out.sort((a, b) => {
        const order = a.title.localeCompare(b.title, undefined, {
          numeric: true,
          sensitivity: "base",
        });
        return key === "z-a" ? -order : order;
      });
      break;
    case "shortest":
    case "longest":
      out.sort((a, b) =>
        compare(a.seconds, b.seconds, key === "longest"),
      );
      break;
    case "newest":
    case "oldest":
      out.sort((a, b) => compare(released(a), released(b), key === "newest"));
      break;
  }
  return out;
}
