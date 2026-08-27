"use client";

import { useEffect, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import {
  curtainState,
  entryMs,
  openCurtain,
  serverCurtainState,
  subscribeCurtain,
} from "@/components/curtain-state";

/**
 * The black sheet itself, rendered once by the root layout.
 *
 * It has to live above every route rather than inside one, because the whole
 * point is to stay put while the page under it is replaced. Being in the root
 * layout means react keeps this component mounted across a client side
 * navigation, so the curtain that closed on the way out is the same element
 * that opens on the way in.
 */
export function Curtain() {
  const { closed, ms } = useSyncExternalStore(
    subscribeCurtain,
    curtainState,
    serverCurtainState,
  );

  const pathname = usePathname();

  // Arrival. Effects run after the new route has been committed, so by the
  // time this opens the curtain the page behind it is already painted and
  // ready to be uncovered. Opening an open curtain does nothing, which is what
  // makes this safe to run on every navigation and on first mount.
  useEffect(() => {
    openCurtain(entryMs(pathname));
  }, [pathname]);

  return (
    <div
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "#000",
        opacity: closed ? 1 : 0,
        transition: `opacity ${ms}ms ${closed ? "ease-in" : "ease-out"}`,
        // Swallows clicks while the screen is covered, so a second click
        // during the fade cannot start another navigation.
        pointerEvents: closed ? "auto" : "none",
        // Above everything, including the room's own overlaid controls.
        zIndex: 9999,
      }}
    />
  );
}
