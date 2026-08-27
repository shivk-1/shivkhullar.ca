"use client";

import { useEffect } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";
import { usePointerDecoration } from "@/lib/use-media-query";

/**
 * A circle that inverts whatever it passes over.
 *
 * `mix-blend-mode: difference` subtracts this element from the backdrop, so a
 * white disc comes out as near black over the light theme's near white page
 * and near white over the dark theme's near black one. That is the whole point
 * of choosing it: every previous cursor here needed a colour picked against a
 * background, and this site has two of them. The pale blue blob measured about
 * 1.07:1 against the light background and 9.84:1 against the dark. A difference
 * blend cannot land in that position, because its contrast is a function of the
 * backdrop rather than a constant chosen in advance.
 *
 * The native cursor is deliberately left visible. Hiding it is the usual way to
 * do this and it does look cleaner, but this is a page of prose and links, and
 * the i-beam and the pointing hand are doing real work telling people what they
 * are over. The disc rides along with them rather than replacing them.
 */

/** Across. Big enough to read as a highlight, small enough not to cover words. */
const SIZE = 28;

/** Tight, with just enough give that it trails rather than teleports. */
const FOLLOW = { stiffness: 700, damping: 40, mass: 0.5 };

/** How the disc comes and goes at the edges of the page. */
const FADE = { stiffness: 300, damping: 30, mass: 0.4 };

/** Parked off screen so nothing sits in the corner before the first move. */
const AWAY = -100;

export function DifferenceCursor({ size = SIZE }: { size?: number }) {
  const wanted = usePointerDecoration();

  const x = useMotionValue(AWAY);
  const y = useMotionValue(AWAY);
  const shown = useMotionValue(0);

  const springX = useSpring(x, FOLLOW);
  const springY = useSpring(y, FOLLOW);
  // Sprung rather than set: a motion value written straight into `style` moves
  // the instant it changes, and a cursor that blinks on and off at the edge of
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

    // Fading out on the way off the page stops the disc from sitting frozen
    // against the edge while the pointer is somewhere else entirely.
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
        // White is what makes difference a straight inversion of the backdrop.
        // Any other colour tints the result and reintroduces the very problem
        // this blend mode is here to avoid.
        backgroundColor: "#fff",
        mixBlendMode: "difference",
        opacity: fade,
        x: springX,
        y: springY,
        // Never between anyone and what they are clicking.
        pointerEvents: "none",
        // Under the curtain, so the page fade covers this too.
        zIndex: 50,
        willChange: "transform",
      }}
    />
  );
}
