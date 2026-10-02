"use client";

import { useRef, useState, type PointerEvent, type MouseEvent } from "react";

/**
 * Where the crate sits on a phone. "open" is the drawer under the room, "full"
 * takes the screen for browsing, and "closed" leaves only the tab.
 *
 * A desk only ever uses closed and open: there the crate is a column beside
 * the room, and dragging is never started.
 */
export type Sheet = "closed" | "open" | "full";

const ORDER: Sheet[] = ["closed", "open", "full"];

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

function isPhone() {
  return window.matchMedia("(max-width: 639px)").matches;
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
  const [sheet, setSheet] = useState<Sheet>("open");
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
    setDrag(Math.min(Math.max(g.startHeight + lift, 0), heights().full));
  };

  const onPointerUp = (event: PointerEvent<HTMLElement>) => {
    const g = gesture.current;
    if (!g || g.id !== event.pointerId) return;
    gesture.current = null;
    if (!g.moved) return;

    const stops = heights();
    const height = Math.min(
      Math.max(g.startHeight + g.startY - event.clientY, 0),
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
        [...ORDER].reverse().find((stop) => stops[stop] < height) ?? "closed";
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

  /** A tap on the tab: a full sheet comes down to the drawer, otherwise it
      opens and closes as it always has. */
  const toggle = () =>
    setSheet((current) =>
      current === "full" ? "open" : current === "open" ? "closed" : "open",
    );

  return {
    sheet,
    /** Live height in px while a finger is on it, null otherwise. */
    drag,
    toggle,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel: onPointerUp,
      onClickCapture,
    },
  };
}
