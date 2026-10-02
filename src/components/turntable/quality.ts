/**
 * How much the room asks of the machine it is running on.
 *
 * "high" is the room as designed. "low" is the same room with the expensive
 * parts trimmed where they barely show: one shadow-casting lamp instead of
 * two, half-resolution record maps, the bulb's internals left out from
 * behind a shade that is opaque anyway, and a lower pixel ratio.
 *
 * Phones start low. They are not short of GPU so much as of memory: iOS kills
 * a tab that holds too much, and the high room keeps a few hundred megabytes
 * of textures, shadow maps and canvas copies resident. Desktops start high and
 * are moved down by the scene's performance monitor if they cannot hold it,
 * which is what catches the slower laptops a static check cannot tell apart.
 *
 * `?quality=low` or `?quality=high` on the url forces either, for testing.
 */
export type Quality = "high" | "low";

export function detectQuality(): Quality {
  if (typeof window === "undefined") return "high";

  const forced = new URLSearchParams(window.location.search).get("quality");
  if (forced === "low" || forced === "high") return forced;

  const coarse = window.matchMedia("(pointer: coarse)").matches;
  if (coarse && navigator.maxTouchPoints > 0) return "low";

  // Chrome only; Safari leaves it undefined and caps the core count, which is
  // why the runtime fallback exists at all.
  const memory = (navigator as Navigator & { deviceMemory?: number })
    .deviceMemory;
  if (memory !== undefined && memory <= 4) return "low";
  if (navigator.hardwareConcurrency > 0 && navigator.hardwareConcurrency <= 4) {
    return "low";
  }

  return "high";
}

/** Pixel ratio range per tier: where it starts, and how far it may move. */
export const DPR: Record<Quality, { start: number; min: number; max: number }> =
  {
    high: { start: 1.5, min: 1, max: 2 },
    low: { start: 1.25, min: 1, max: 1.5 },
  };
