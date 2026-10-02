"use client";

import {
  useRef,
  useState,
  useSyncExternalStore,
  type PointerEvent,
  type MouseEvent,
} from "react";

/**
 * Where the crate sits. A desk uses closed and open: there it is a column
 * beside the room, folded away by its tab. A phone uses open and full: the
 * drawer under the room, and the sheet pulled up to browse. A phone has no
 * tab to bring a closed crate back with, so it never closes.
 */
export type Sheet = "closed" | "open" | "full";

/** The stops a drag can land on, bottom to top. Drags only happen on a phone. */
const ORDER: Sheet[] = ["open", "full"];

/** h-72, the drawer's resting height. Kept in step with the class. */
const OPEN_PX = 288;
/** 4.5rem left above a full sheet, so the back button and a sliver of the
    room still show and it reads as a sheet over the room, not a new page. */
const FULL_GAP_PX = 72;
/** How far a finger moves before a press on the handle becomes a drag. */
const SLOP_PX = 6;
/** A release faster than this, in px/ms, is a flick: it goes to the next
    stop in its direction rather than the nearest one. */
const FLICK = 0.4;

function heights() {
  return {
    closed: 0,
    open: OPEN_PX,
    full: Math.max(OPEN_PX, window.innerHeight - FULL_GAP_PX),
  };
}

const PHONE = "(max-width: 639px)";

function isPhone() {
  return window.matchMedia(PHONE).matches;
}

function subscribePhone(onChange: () => void) {
  const query = window.matchMedia(PHONE);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

/**
 * The crate as a bottom sheet you can drag between its stops.
 *
 * Only elements marked `data-sheet-handle` start a drag — the tab and the
 * header strip — so the list itself still scrolls like a list. While a drag
 * is live the height is a pixel value that follows the finger, and on release
 * it snaps to a stop and hands back to the class, which is what animates.
 */
export function useSheet() {
  const [chosen, setSheet] = useState<Sheet>("open");
  const phone = useSyncExternalStore(subscribePhone, isPhone, () => false);
  // Read through the device rather than stored per device, so a window that
  // closed the crate on a desk and was then narrowed to a phone does not
  // strand it closed with no tab to reopen it.
  const sheet: Sheet =
    phone && chosen === "closed"
      ? "open"
      : !phone && chosen === "full"
        ? "open"
        : chosen;
  const [drag, setDrag] = useState<number | null>(null);

  const gesture = useRef<{
    id: number;
    startY: number;
    startHeight: number;
    moved: boolean;
    samples: { y: number; t: number }[];
  } | null>(null);
  /** A drag ends in a pointerup, and the browser follows it with a click on
      whatever was under the finger. That click is not a tap and is eaten. */
  const swallowClicksUntil = useRef(0);

  const onPointerDown = (event: PointerEvent<HTMLElement>) => {
    if (!isPhone()) return;
    if (!(event.target as Element).closest("[data-sheet-handle]")) return;
    gesture.current = {
      id: event.pointerId,
      startY: event.clientY,
      startHeight: heights()[sheet],
      moved: false,
      samples: [{ y: event.clientY, t: event.timeStamp }],
    };
  };

  const onPointerMove = (event: PointerEvent<HTMLElement>) => {
    const g = gesture.current;
    if (!g || g.id !== event.pointerId) return;

    const lift = g.startY - event.clientY;
    if (!g.moved) {
      if (Math.abs(lift) < SLOP_PX) return;
      g.moved = true;
      // Held from here so the finger can leave the handle, and the sheet,
      // without the drag dropping. Throws if the pointer is already gone,
      // which only costs the capture, not the drag.
      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {}
    }

    g.samples.push({ y: event.clientY, t: event.timeStamp });
    if (g.samples.length > 6) g.samples.shift();
    const stops = heights();
    setDrag(Math.min(Math.max(g.startHeight + lift, stops.open), stops.full));
  };

  const onPointerUp = (event: PointerEvent<HTMLElement>) => {
    const g = gesture.current;
    if (!g || g.id !== event.pointerId) return;
    gesture.current = null;
    if (!g.moved) return;

    const stops = heights();
    const height = Math.min(
      Math.max(g.startHeight + g.startY - event.clientY, stops.open),
      stops.full,
    );

    const first = g.samples[0];
    const last = g.samples[g.samples.length - 1];
    const dt = last.t - first.t;
    // Positive is the sheet growing, which is the finger moving up.
    const velocity = dt > 0 ? (first.y - last.y) / dt : 0;

    let next: Sheet;
    if (velocity > FLICK) {
      next = ORDER.find((stop) => stops[stop] > height) ?? "full";
    } else if (velocity < -FLICK) {
      next =
        [...ORDER].reverse().find((stop) => stops[stop] < height) ?? "open";
    } else {
      next = ORDER.reduce((best, stop) =>
        Math.abs(stops[stop] - height) < Math.abs(stops[best] - height)
          ? stop
          : best,
      );
    }

    setSheet(next);
    setDrag(null);
    swallowClicksUntil.current = performance.now() + 350;
  };

  const onClickCapture = (event: MouseEvent<HTMLElement>) => {
    if (performance.now() < swallowClicksUntil.current) {
      event.preventDefault();
      event.stopPropagation();
      swallowClicksUntil.current = 0;
    }
  };

  /** The desk's tab: folds the column away and back. */
  const toggle = () => setSheet(sheet === "closed" ? "open" : "closed");

  /** The phone's grab bar: a tap does what a drag would, between its stops. */
  const toggleFull = () => setSheet(sheet === "full" ? "open" : "full");

  return {
    sheet,
    /** Live height in px while a finger is on it, null otherwise. */
    drag,
    toggle,
    toggleFull,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel: onPointerUp,
      onClickCapture,
    },
  };
}
