"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";

/**
 * Three blurred blobs trailing the pointer, merged into one gooey shape.
 *
 * After the blob cursor on cursify.ui-layouts.com, rebuilt rather than
 * dropped in. The original hangs its `onMouseMove` on the overlay itself,
 * which means the overlay has to sit on top of the page and receive pointer
 * events — on a page made of links that swallows every click. This one is
 * `pointer-events: none` and listens on the window instead, so it cannot get
 * between anyone and the thing they are trying to click.
 *
 * It also drops the original's @react-spring/web dependency. Framer motion is
 * already here for the rest of the site and its springs chain directly: a
 * `useSpring` can take another motion value as its source, which is the whole
 * mechanism behind the trail.
 */

/** The lead blob, which effectively keeps up with the pointer. */
const FAST = { stiffness: 1200, damping: 40, mass: 1 };

/** The two it drags behind it. Heavy enough to lag by a visible beat. */
const SLOW = { stiffness: 200, damping: 50, mass: 10 };

/**
 * Sizes and inner-dot geometry, straight from the original's stylesheet, at
 * the scale it was drawn for. Everything below is derived from these by
 * `scale` rather than written out again. The dots are real elements here
 * rather than ::after, since these are inline styles and a pseudo-element
 * cannot be one.
 */
const BLOBS = [
  { size: 60, dot: 20, dotAt: 20 },
  { size: 125, dot: 35, dotAt: 35 },
  { size: 75, dot: 25, dotAt: 25 },
] as const;

/** Blur, and the drop shadow, at that same reference scale. */
const BLUR = 30;
const SHADOW = { x: 10, y: 10, spread: 5 };

/** Off screen, so nothing sits in the corner before the pointer first moves. */
const AWAY = -300;

/**
 * Reads a media query without a state-setting effect. The browser's own
 * matchMedia is the external store, and it already has the subscribe and
 * snapshot pair useSyncExternalStore wants.
 */
function useMediaQuery(query: string) {
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
    // No pointer on the server, so nothing is rendered there and the first
    // client paint agrees with it.
    () => false,
  );
}

export function BlobCursor({
  scale = 0.6,
  opacity = 0.85,
  color = "#dfeffc",
  dotColor = "rgba(158, 205, 240, 0.8)",
}: {
  /**
   * One dial for the whole thing. The goo is scale dependent: the colour
   * matrix keeps only what survives the blur, so shrinking the blobs without
   * shrinking the blur by the same amount thins them until they drop under
   * the threshold and disappear. Scaling both together keeps the shape and
   * only changes how big it is.
   */
  scale?: number;
  opacity?: number;
  /** The bubble. Light enough that the deeper dot inside reads as depth. */
  color?: string;
  /** The core, a few shades down from `color` rather than a contrast to it. */
  dotColor?: string;
}) {
  const x = useMotionValue(AWAY);
  const y = useMotionValue(AWAY);

  // Chained rather than three springs on the same source: each blob follows
  // the one in front of it, which is what makes this a trail instead of three
  // blobs arriving at the same place at different speeds.
  const x1 = useSpring(x, FAST);
  const y1 = useSpring(y, FAST);
  const x2 = useSpring(x1, SLOW);
  const y2 = useSpring(y1, SLOW);
  const x3 = useSpring(x2, SLOW);
  const y3 = useSpring(y2, SLOW);

  const positions = [
    { x: x1, y: y1 },
    { x: x2, y: y2 },
    { x: x3, y: y3 },
  ];

  // A trailing blob is decoration and it is motion, so it is skipped for
  // anyone who has asked for less of it, and for anything without a real
  // pointer to trail — a touch screen has no cursor to decorate.
  const fine = useMediaQuery("(hover: hover) and (pointer: fine)");
  const still = useMediaQuery("(prefers-reduced-motion: reduce)");
  const wanted = fine && !still;

  useEffect(() => {
    if (!wanted) return;

    const move = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      x.set(event.clientX);
      y.set(event.clientY);
    };

    window.addEventListener("pointermove", move, { passive: true });
    return () => window.removeEventListener("pointermove", move);
  }, [wanted, x, y]);

  if (!wanted) return null;

  return (
    <>
      {/*
        The goo. Blur everything heavily, then run the result through a colour
        matrix that multiplies alpha hard and subtracts a constant: soft edges
        below the threshold vanish, everything above it snaps to opaque, and
        two blurred circles that overlap fuse into one shape with a neck
        between them rather than sitting on top of each other.
      */}
      <svg
        aria-hidden="true"
        style={{ position: "absolute", width: 0, height: 0 }}
      >
        <filter id="blob-cursor-goo">
          <feGaussianBlur
            in="SourceGraphic"
            result="blur"
            stdDeviation={BLUR * scale}
          />
          <feColorMatrix
            in="blur"
            values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 35 -10"
          />
        </filter>
      </svg>

      <div
        aria-hidden="true"
        style={{
          position: "fixed",
          inset: 0,
          filter: "url(#blob-cursor-goo)",
          overflow: "hidden",
          // Never in the way of a click, which is the whole reason this is a
          // window listener rather than a handler on this element.
          pointerEvents: "none",
          // Under the curtain, so the fade out of the page covers this too.
          zIndex: 50,
        }}
      >
        {BLOBS.map((blob, index) => {
          const size = blob.size * scale;

          return (
            <motion.div
              key={blob.size}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: size,
                height: size,
                // Centres the blob on the pointer without a translate, which
                // would fight the one the motion values are already writing.
                marginLeft: -size / 2,
                marginTop: -size / 2,
                borderRadius: "50%",
                backgroundColor: color,
                boxShadow: `${SHADOW.x * scale}px ${SHADOW.y * scale}px ${
                  SHADOW.spread * scale
                }px 0 rgba(0, 0, 0, 0.75)`,
                opacity,
                willChange: "transform",
                x: positions[index].x,
                y: positions[index].y,
              }}
            >
              <span
                style={{
                  position: "absolute",
                  top: blob.dotAt * scale,
                  left: blob.dotAt * scale,
                  width: blob.dot * scale,
                  height: blob.dot * scale,
                  borderRadius: "50%",
                  backgroundColor: dotColor,
                }}
              />
            </motion.div>
          );
        })}
      </div>
    </>
  );
}
