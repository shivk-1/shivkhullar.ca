"use client";

import {
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { isRoomReady, subscribeRoomReady } from "./room-ready";

/** How long the room takes to come up, once it is ready to be seen. */
const FADE_MS = 700;

/**
 * Longest we wait before showing the room anyway. Everything in the scene is
 * inside one Suspense boundary with a null fallback, so a stalled or failed
 * GLB would otherwise leave the page black forever.
 */
const FALLBACK_MS = 6000;

/** There is no room on the server, so it is never ready there. */
const notReadyOnServer = () => false;

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
 *
 * The signal is read with useSyncExternalStore rather than subscribed to by
 * hand. room-ready is an external store in the exact shape that hook wants,
 * and reading it this way closes the gap the manual version had to paper over:
 * the room can finish drawing between a render and the effect that would have
 * subscribed to it, and the hook handles that case itself instead of needing a
 * catch-up read.
 */
export function RoomFade({ children }: { children: ReactNode }) {
  const ready = useSyncExternalStore(
    subscribeRoomReady,
    isRoomReady,
    notReadyOnServer,
  );

  const [shown, setShown] = useState(ready);

  /**
   * Latched on purpose: once the room has been seen it is never hidden again.
   *
   * The signal underneath is not monotonic — the canvas clears it on unmount
   * so a later visit fades in again — and following it directly would mean a
   * re-suspend or a hot reload could fade the room back out mid-session, which
   * is the one thing the fade exists to prevent. Setting state during render
   * rather than in an effect keeps it to a single pass, with no frame painted
   * in between.
   */
  if (ready && !shown) setShown(true);

  useEffect(() => {
    if (shown) return;
    const timer = setTimeout(() => setShown(true), FALLBACK_MS);
    return () => clearTimeout(timer);
  }, [shown]);

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
