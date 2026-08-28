"use client";

import { useEffect, useRef } from "react";
import { usePointerDecoration } from "@/lib/use-media-query";

/**
 * A trail of square pixels dropped behind the pointer, fading and shrinking.
 *
 * The look and the numbers are kept from the component this came from: a pixel
 * every twelve pixels travelled, forty of them at most, opacity down by 0.04 a
 * frame, each shrinking with age to a floor of three tenths.
 *
 * What is not kept is its shape. That one is a page: a fixed, full screen div
 * painting bg-background, listening for mousemove on itself, with a "move
 * cursor" label in the middle. Dropped into a layout it would cover the site
 * with an opaque rectangle and take every click on the way. This is an overlay
 * with no background, no pointer events, and a window listener.
 *
 * Its animation loop also called setState on every frame forever — a new array
 * sixty times a second whether or not a single pixel existed, each one a
 * re-render reconciling up to forty nodes. Here the pixels are rectangles on a
 * canvas, and the loop stops itself once the trail is empty.
 */

/**
 * Side of one pixel, and the distance the pointer must travel to drop the
 * next. The two are deliberately the same number: at that spacing consecutive
 * squares just touch, so the trail reads as a continuous run rather than a
 * dotted line. Shrinking the square without shrinking the step would open gaps
 * between them, which is why this is one value and not two.
 */
const PIXEL_SIZE = 8;

/** How many are alive at once before the oldest is dropped. */
const TRAIL_LENGTH = 40;

/**
 * Opacity lost per second.
 *
 * The original loses 0.04 per *frame*, which is only the intended speed on a
 * sixty hertz display and twice as fast on a hundred and twenty. This is that
 * same rate expressed against the clock, so it looks the same everywhere.
 */
const FADE_PER_SECOND = 0.04 * 60;

/** Shrink to this fraction, over this long. Also converted from frames. */
const SHRINK_FLOOR = 0.3;
const SHRINK_MS = (100 / 60) * 1000;

/** Improbable enough that reading it back means the assignment was refused. */
const SENTINEL = "#ff00ff";

type Pixel = { x: number; y: number; born: number };

export function PixelTrail({ size = PIXEL_SIZE }: { size?: number }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const wanted = usePointerDecoration();

  useEffect(() => {
    if (!wanted) return;
    const element = canvas.current;
    if (!element) return;
    const context = element.getContext("2d");
    if (!context) return;

    let width = 0;
    let height = 0;

    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      element.width = Math.floor(width * ratio);
      element.height = Math.floor(height * ratio);
      element.style.width = `${width}px`;
      element.style.height = `${height}px`;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    };
    resize();

    /**
     * The pixels are drawn in the theme's own foreground colour, which is what
     * the original's `bg-foreground` resolves to: dark on the light theme,
     * light on the dark one. Reading it off the canvas' computed style rather
     * than naming a colour means the trail follows the theme for free, and is
     * the reason this needs no contrast decision at all.
     */
    let ink = "#000";
    const readInk = () => {
      const token = getComputedStyle(element).color;

      // The theme tokens are oklch, and canvas silently *ignores* a fillStyle
      // it cannot parse rather than throwing. Left unchecked that is an
      // invisible trail on whichever theme fails, with nothing in the console.
      // So: park a sentinel, assign, and read back. Canvas returns its own
      // normalised form when it took the value and the sentinel when it did
      // not, which makes the failure detectable instead of silent.
      context.fillStyle = SENTINEL;
      context.fillStyle = token;
      ink =
        context.fillStyle === SENTINEL
          ? // Rejected. Fall back to the two ends of the theme rather than
            // leaving the default black on a dark page.
            document.documentElement.classList.contains("dark")
            ? "#fff"
            : "#2e2e2e"
          : context.fillStyle;
    };
    readInk();

    // next-themes swaps a class on <html>, so that is what to watch.
    const themes = new MutationObserver(readInk);
    themes.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    const pixels: Pixel[] = [];
    let last: { x: number; y: number } | null = null;
    let frame = 0;

    const tick = (now: number) => {
      context.clearRect(0, 0, width, height);

      // Oldest first, so dropping from the front retires the tail.
      while (
        pixels.length > 0 &&
        (now - pixels[0].born) * (FADE_PER_SECOND / 1000) >= 1
      ) {
        pixels.shift();
      }

      if (pixels.length === 0) {
        // Nothing left. Stop, rather than clearing an empty canvas sixty times
        // a second until the pointer moves again.
        frame = 0;
        return;
      }

      frame = requestAnimationFrame(tick);
      context.fillStyle = ink;

      for (const pixel of pixels) {
        const alive = now - pixel.born;
        context.globalAlpha = Math.max(0, 1 - alive * (FADE_PER_SECOND / 1000));

        // Older pixels are smaller, down to the floor.
        const side = size * Math.max(SHRINK_FLOOR, 1 - alive / SHRINK_MS);

        // Rounded to whole pixels. These are squares with hard edges and the
        // point of them is to look like pixels, so half-covered edge columns
        // would be working against the idea.
        context.fillRect(
          Math.round(pixel.x - side / 2),
          Math.round(pixel.y - side / 2),
          Math.round(side),
          Math.round(side),
        );
      }

      context.globalAlpha = 1;
    };

    const wake = () => {
      if (frame === 0) frame = requestAnimationFrame(tick);
    };

    const move = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      const to = { x: event.clientX, y: event.clientY };

      // One pixel per `size` travelled, so the trail is evenly spaced however
      // fast the hand moves rather than bunching up when it is slow.
      if (last && Math.hypot(to.x - last.x, to.y - last.y) <= size) {
        return;
      }

      last = to;
      pixels.push({ ...to, born: performance.now() });
      if (pixels.length > TRAIL_LENGTH) pixels.shift();
      wake();
    };

    // Coming back on somewhere else should not draw a line from where the
    // pointer left.
    const leave = () => {
      last = null;
    };

    window.addEventListener("pointermove", move, { passive: true });
    document.addEventListener("pointerleave", leave);
    window.addEventListener("resize", resize);

    return () => {
      if (frame !== 0) cancelAnimationFrame(frame);
      themes.disconnect();
      window.removeEventListener("pointermove", move);
      document.removeEventListener("pointerleave", leave);
      window.removeEventListener("resize", resize);
    };
  }, [wanted, size]);

  if (!wanted) return null;

  return (
    <canvas
      ref={canvas}
      aria-hidden="true"
      // Inherits the theme's foreground, which the loop reads back off it.
      className="text-foreground"
      style={{
        position: "fixed",
        inset: 0,
        // Never between anyone and what they are clicking.
        pointerEvents: "none",
        // Under the curtain, so the page fade covers this too.
        zIndex: 50,
      }}
    />
  );
}
