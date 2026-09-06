import type { Track } from "@/data/music";

/**
 * Ranked substring-and-subsequence matching over the fields a row already
 * shows. Not embeddings — there is no model in the path here — but it covers
 * what a crate search is actually asked to do: partial words ("wknd"),
 * out-of-order terms ("blinding weeknd"), and a dropped letter or two.
 *
 * Every query term has to hit something, so extra words narrow rather than
 * widen. The score only orders what already matched.
 */

/** What a term hit, best first. The gaps are wide enough that a title hit
    always outranks an artist hit no matter how many artist hits follow. */
const FIELD_WEIGHT = {
  title: 100,
  artist: 55,
  album: 30,
  message: 20,
} as const;

type Field = keyof typeof FIELD_WEIGHT;

/** Lowercased and stripped of punctuation, so "don't" matches "dont" and
    "r&b" matches "r b". Whitespace is the only separator left afterwards. */
function normalize(value: string) {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

/**
 * The searchable text of a row, one normalized string per field.
 *
 * The note lives on the notepad rather than in the row now, but it is still
 * indexed: it is the only place a beat's story is written down, and someone
 * looking for the anime one is searching for a word only it contains.
 */
function fields(track: Track): Array<[Field, string]> {
  const entries: Array<[Field, string]> = [
    ["title", normalize(track.title)],
    ["artist", normalize(track.artist)],
  ];
  if (track.album) entries.push(["album", normalize(track.album)]);
  if (track.message) entries.push(["message", normalize(track.message)]);
  return entries;
}

/**
 * Does `term` appear in `text` letter by letter, in order, with gaps? The
 * fallback for typos and abbreviations: "wknd" runs through "the weeknd".
 * Returns the span it took, since a tight run is a better match than one
 * scattered across the whole string.
 */
function subsequenceSpan(text: string, term: string) {
  let cursor = 0;
  let start = -1;
  for (const character of term) {
    const found = text.indexOf(character, cursor);
    if (found === -1) return null;
    if (start === -1) start = found;
    cursor = found + 1;
  }
  return cursor - start;
}

/** How well one term does against one row. Zero means it never matched. */
function scoreTerm(entries: Array<[Field, string]>, term: string) {
  let best = 0;

  for (const [field, text] of entries) {
    const weight = FIELD_WEIGHT[field];
    const index = text.indexOf(term);

    if (index === 0 || (index > 0 && text[index - 1] === " ")) {
      // Start of the field or of a word in it — what someone typing the
      // first letters of a title is aiming at.
      best = Math.max(best, weight * 3 - (index === 0 ? 0 : 1));
    } else if (index > 0) {
      best = Math.max(best, weight * 2);
    } else {
      const span = subsequenceSpan(text, term);
      // Scattered letters are the weakest evidence there is, so a
      // subsequence hit stays below every literal one, and a tighter run
      // beats a looser one.
      if (span !== null)
        best = Math.max(best, weight / (1 + span / term.length));
    }
  }

  return best;
}

/**
 * Filters and reorders `tracks` by `query`. An empty query returns the list
 * untouched and in its original order — the crate has its own ordering, and
 * search should only override it while someone is typing.
 */
export function searchTracks<T extends Track>(tracks: T[], query: string): T[] {
  const terms = normalize(query).split(" ").filter(Boolean);
  if (terms.length === 0) return tracks;

  const ranked: Array<{ track: T; score: number; index: number }> = [];

  tracks.forEach((track, index) => {
    const entries = fields(track);
    let total = 0;

    for (const term of terms) {
      const score = scoreTerm(entries, term);
      // One miss disqualifies the row: added words should narrow the list.
      if (score === 0) return;
      total += score;
    }

    ranked.push({ track, score: total, index });
  });

  // Ties fall back to the original order rather than shuffling on every
  // keystroke.
  ranked.sort((a, b) => b.score - a.score || a.index - b.index);
  return ranked.map((entry) => entry.track);
}
