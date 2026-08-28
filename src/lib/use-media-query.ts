"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Reads a media query without a state-setting effect.
 *
 * The browser's own matchMedia is already an external store with exactly the
 * subscribe and snapshot pair useSyncExternalStore wants, so there is nothing
 * to mirror into react state.
 *
 * The server snapshot is always false. Anything gated on this renders nothing
 * server side, and the first client paint agrees with that before switching to
 * the real answer, so there is no hydration mismatch to warn about.
 */
export function useMediaQuery(query: string) {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const media = window.matchMedia(query);
      media.addEventListener("change", onChange);
      return () => media.removeEventListener("change", onChange);
    },
    [query],
  );

  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}

/** A real pointer that can hover, and an owner who has not asked for stillness. */
export function usePointerDecoration() {
  const fine = useMediaQuery("(hover: hover) and (pointer: fine)");
  const still = useMediaQuery("(prefers-reduced-motion: reduce)");
  return fine && !still;
}
