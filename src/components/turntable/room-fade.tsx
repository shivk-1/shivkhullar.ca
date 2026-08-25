"use client";

import { useEffect, useState, type ReactNode } from "react";
import { isRoomReady, subscribeRoomReady } from "./room-ready";

/** How long the room takes to come up, once it is ready to be seen. */
const FADE_MS = 700;

/**
 * Longest we wait before showing the room anyway. Everything in the scene is
 * inside one Suspense boundary with a null fallback, so a stalled or failed
 * GLB would otherwise leave the page black forever.
 */
const FALLBACK_MS = 6000;

/**
 * Holds the room at zero opacity until it has actually been drawn, then eases
 * it up. Without this the canvas paints an empty floor on the first frame and
 * the lamps, speakers and plant snap in one at a time as their GLBs land.
 *
 * The gate is a signal sent from inside the canvas once two frames have been
 * rendered, not drei's loader store. The loader reports on batches: models
 * requested from components that mount at different times land in different
 * cycles, and it goes idle between them. A cold visit therefore hit "idle with
 * a non-zero total" while half the room was still on the wire, started the
 * fade against a half-built scene, and cut to the finished one when the rest
 * arrived. A warm cache resolved every batch fast enough to hide the gap,
 * which is why it only misbehaved on the first few loads.
 */
export function RoomFade({ children }: { children: ReactNode }) {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    // Covers the case where the canvas got there first, between this render
    // and this effect.
    if (isRoomReady()) {
      setShown(true);
      return;
    }

    const unsubscribe = subscribeRoomReady(() => setShown(true));
    const timer = setTimeout(() => setShown(true), FALLBACK_MS);

    return () => {
      unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  return (
    <div
      className="h-full w-full"
      style={{
        opacity: shown ? 1 : 0,
        transition: `opacity ${FADE_MS}ms ease-out`,
      }}
    >
      {children}
    </div>
  );
}
