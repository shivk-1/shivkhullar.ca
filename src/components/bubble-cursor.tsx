"use client";

import { useEffect, useRef } from "react";
import { usePointerDecoration } from "@/lib/use-media-query";

/**
 * A trail of small bubbles behind the pointer, and bubbles that rise from it
 * once it comes to rest.
 *
 * After Sora Lee's "cursor trails and bubbling effect", whose one real idea is
 * that the two halves are exclusive: the trail belongs to a moving pointer and
 * the bubbling belongs to a still one, so the effect answers what the pointer
 * is doing rather than running the whole time. Stillness is measured the way
 * that piece measures it, by comparing the pointer against where it was.
 *
 * Drawn on a canvas rather than as elements. The blob cursor this replaces put
 * an svg blur filter over the whole viewport and repainted it on every pointer
 * move, which is the expensive way to do this; a few dozen small arcs on one
 * canvas costs almost nothing, and bubbles that come and go constantly would
 * otherwise mean mounting and unmounting dom nodes several times a second.
 */

/** Still for this long and the pointer is considered at rest. */
const REST_MS = 200;

/** One bubble roughly this often while it stays there. */
const SPAWN_MS = 110;

/** A trail point is drawn until it is this old. */
const TRAIL_MS = 360;

/** Nothing on screen and no pointer for this long stops the loop entirely. */
const SLEEP_MS = 1200;

type Bubble = {
  x: number;
  y: number;
  r: number;
  /** Upward speed, px per second. */
  rise: number;
  /** How far it wanders either side of straight up, and how fast. */
  sway: number;
  swayRate: number;
  phase: number;
  born: number;
  life: number;
};

type Point = { x: number; y: number; at: number };

/** Rim and body. Two alphas of the same pale blue, the rim carrying the edge. */
const RIM = "120, 180, 225";
const BODY = "223, 239, 252";

function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}

export function BubbleCursor({ scale = 1 }: { scale?: number }) {
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
      // Backing store at device resolution, css box at css resolution, so the
      // arcs are crisp on a retina panel instead of drawn at half density.
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

    const bubbles: Bubble[] = [];
    const trail: Point[] = [];

    let pointer: { x: number; y: number } | null = null;
    let movedAt = 0;
    let spawnedAt = 0;
    let inside = false;
    let frame = 0;

    const spawn = (now: number) => {
      if (!pointer) return;
      const size = rand(2.5, 7) * scale;
      bubbles.push({
        // Off to one side of the pointer rather than exactly under it, so they
        // look like they are coming off it rather than out of one hole.
        x: pointer.x + rand(-9, 9) * scale,
        y: pointer.y + rand(-4, 6) * scale,
        r: size,
        rise: rand(20, 46),
        sway: rand(5, 15) * scale,
        swayRate: rand(0.8, 1.8),
        phase: Math.random() * Math.PI * 2,
        born: now,
        life: rand(1500, 2700),
      });
    };

    /** One bubble: translucent body, brighter rim, small offset highlight. */
    const draw = (x: number, y: number, r: number, alpha: number) => {
      if (alpha <= 0.01 || r <= 0.2) return;

      context.beginPath();
      context.arc(x, y, r, 0, Math.PI * 2);
      context.fillStyle = `rgba(${BODY}, ${alpha * 0.38})`;
      context.fill();
      context.lineWidth = Math.max(0.6, r * 0.13);
      context.strokeStyle = `rgba(${RIM}, ${alpha * 0.85})`;
      context.stroke();

      // The glint. What actually reads as "bubble" rather than "circle".
      context.beginPath();
      context.arc(
        x - r * 0.32,
        y - r * 0.34,
        Math.max(0.5, r * 0.2),
        0,
        Math.PI * 2,
      );
      context.fillStyle = `rgba(255, 255, 255, ${alpha * 0.75})`;
      context.fill();
    };

    const tick = (now: number) => {
      frame = requestAnimationFrame(tick);
      context.clearRect(0, 0, width, height);

      const resting = pointer !== null && now - movedAt > REST_MS;

      // Bubbling belongs to a still pointer, so this is the only place they
      // are made and it is gated on exactly that.
      if (resting && inside && now - spawnedAt > SPAWN_MS) {
        spawnedAt = now;
        spawn(now);
      }

      // Trail belongs to a moving one. Old points go whether or not the
      // pointer is still moving, so the tail retracts into the cursor rather
      // than freezing in place when it stops.
      while (trail.length > 0 && now - trail[0].at > TRAIL_MS) trail.shift();

      for (const point of trail) {
        const age = (now - point.at) / TRAIL_MS;
        const fade = 1 - age;
        draw(point.x, point.y, (2 + 5 * fade) * scale, fade * 0.55);
      }

      for (let i = bubbles.length - 1; i >= 0; i--) {
        const bubble = bubbles[i];
        const age = (now - bubble.born) / bubble.life;

        if (age >= 1) {
          bubbles.splice(i, 1);
          continue;
        }

        const seconds = (now - bubble.born) / 1000;
        const x =
          bubble.x +
          Math.sin(bubble.phase + seconds * bubble.swayRate) * bubble.sway;
        const y = bubble.y - seconds * bubble.rise;

        // In fast, hold, then pop: over the last stretch it swells and its
        // edge goes at once, which reads as bursting rather than dissolving.
        const popping = age > 0.86;
        const grow = popping ? 1 + (age - 0.86) / 0.14 : 1;
        const alpha =
          age < 0.12 ? age / 0.12 : popping ? 1 - (age - 0.86) / 0.14 : 1;

        draw(x, y, bubble.r * grow, alpha);
      }

      // Nothing to draw and nobody here: stop burning frames until the
      // pointer comes back.
      if (bubbles.length === 0 && trail.length === 0 && !inside) {
        if (now - movedAt > SLEEP_MS) {
          cancelAnimationFrame(frame);
          frame = 0;
        }
      }
    };

    const wake = () => {
      if (frame === 0) frame = requestAnimationFrame(tick);
    };

    const move = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      const now = performance.now();
      const next = { x: event.clientX, y: event.clientY };

      // "Moved" means actually moved. A pointermove that lands on the same
      // pixel must not keep resetting the rest timer, or the bubbling would
      // never start on a hand holding still on a trackpad.
      if (
        !pointer ||
        Math.hypot(next.x - pointer.x, next.y - pointer.y) > 1.2
      ) {
        movedAt = now;
        trail.push({ ...next, at: now });
      }

      pointer = next;
      inside = true;
      wake();
    };

    const leave = () => {
      inside = false;
    };

    const enter = () => {
      inside = true;
      wake();
    };

    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerover", enter, { passive: true });
    document.addEventListener("pointerleave", leave);
    window.addEventListener("resize", resize);
    wake();

    return () => {
      if (frame !== 0) cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerover", enter);
      document.removeEventListener("pointerleave", leave);
      window.removeEventListener("resize", resize);
    };
  }, [wanted, scale]);

  if (!wanted) return null;

  return (
    <canvas
      ref={canvas}
      aria-hidden="true"
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
