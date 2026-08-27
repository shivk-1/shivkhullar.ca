"use client";

import { useEffect } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";
import { usePointerDecoration } from "@/lib/use-media-query";

/**
 * A soft violet light that follows the pointer.
 *
 * It sits *behind* the text rather than over it, which is the detail that
 * makes it work. Laid on top, a glow this size and this saturated washes the
 * words it covers; behind them the letters stay at full contrast and the glow
 * reads as a light shining through the page. That is what a negative z-index
 * buys here: css paints negative-index descendants after the stacking
 * context's background but before inline content, so the glow lands between
 * the page colour and the words.
 *
 * It relies on nothing between this element and the body creating a stacking
 * context, since a negative index cannot escape one. Nothing does today. If a
 * wrapper ever gains a transform, a filter, or an opacity below one, the glow
 * will jump in front of the text and that is the reason why.
 */

/** Across, including the part that has already faded to nothing. */
const SIZE = 150;

/** The violet, as a bare rgb triple. */
const VIOLET = "160, 110, 246";

/** A whitened version of it for the core, so the middle reads as lit. */
const CORE = "214, 190, 255";

/**
 * Softens the banding a gradient this wide would otherwise show, and takes the
 * last hard edge off the rim.
 */
const BLUR = 14;

/** Loose on purpose. A light with some drag behind it feels lit, not glued. */
const FOLLOW = { stiffness: 260, damping: 30, mass: 0.7 };
const FADE = { stiffness: 300, damping: 30, mass: 0.4 };

/** Parked off screen so nothing sits in the corner before the first move. */
const AWAY = -400;

export function SpotlightCursor({
  size = SIZE,
  color = VIOLET,
  core = CORE,
}: {
  size?: number;
  /** `r, g, b` triple for the halo. */
  color?: string;
  /** `r, g, b` triple for the lit middle. */
  core?: string;
}) {
  const wanted = usePointerDecoration();

  const x = useMotionValue(AWAY);
  const y = useMotionValue(AWAY);
  const shown = useMotionValue(0);

  const springX = useSpring(x, FOLLOW);
  const springY = useSpring(y, FOLLOW);
  // Sprung rather than set: a motion value written straight into `style` moves
  // the instant it changes, and a light that blinks on and off at the edge of
  // the window reads as a glitch.
  const fade = useSpring(shown, FADE);

  useEffect(() => {
    if (!wanted) return;

    const move = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      x.set(event.clientX - size / 2);
      y.set(event.clientY - size / 2);
      shown.set(1);
    };

    const leave = () => shown.set(0);
    const enter = () => shown.set(1);

    window.addEventListener("pointermove", move, { passive: true });
    document.addEventListener("pointerleave", leave);
    document.addEventListener("pointerenter", enter);

    return () => {
      window.removeEventListener("pointermove", move);
      document.removeEventListener("pointerleave", leave);
      document.removeEventListener("pointerenter", enter);
    };
  }, [wanted, size, x, y, shown]);

  if (!wanted) return null;

  return (
    <motion.div
      aria-hidden="true"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: size,
        height: size,
        borderRadius: "50%",
        // Alpha carries the whole falloff, so the light dies out into the page
        // rather than ending on a colour the page has to absorb.
        backgroundImage: `radial-gradient(circle closest-side,
          rgba(${core}, 0.62) 0%,
          rgba(${color}, 0.46) 32%,
          rgba(${color}, 0.20) 58%,
          rgba(${color}, 0.06) 80%,
          rgba(${color}, 0) 100%)`,
        filter: `blur(${BLUR}px)`,
        opacity: fade,
        x: springX,
        y: springY,
        // Behind the words. See the note at the top of this file.
        zIndex: -1,
        // Never between anyone and what they are clicking.
        pointerEvents: "none",
        willChange: "transform",
      }}
    />
  );
}
