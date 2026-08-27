"use client";

import { useEffect, useRef } from "react";
import { usePointerDecoration } from "@/lib/use-media-query";

/**
 * A bright pink streak that follows the pointer and burns out just behind it.
 *
 * The glow half of the "magic cursor" sparkle component, without the sparkles.
 * That component's shape is kept: points laid along the segment the pointer
 * travelled since the last event, spaced evenly, each living for a fixed short
 * time so the streak is always the same length however fast the hand moves.
 *
 * Everything else in it went with the stars. The falling sparkles were the only
 * reason it needed lucide-react for an icon, a react root per star to render
 * that icon, `cn` from a shadcn utils module, and three sets of keyframes. None
 * of that is here, so this adds no dependency.
 *
 * Drawn on a canvas rather than as divs. The original appends one element to
 * document.body per glow point and removes it on a timer, which at speed is
 * hundreds of nodes and timers a second; the same points are a handful of arcs
 * here. Canvas also gets the look right, because additive blending is what
 * makes overlapping points saturate into a hot core instead of stacking up as
 * flat translucent circles.
 */

/** The pink, from the original's --mouse-sparkles-glow-rgb. */
const GLOW = "239, 42, 201";

/** Its maximumGlowPointSpacing: how finely the travelled path is filled in. */
const SPACING = 10;

/** Its glowDuration. How far behind the pointer the streak reaches. */
const LIFE_MS = 75;

/** Radius of one point's bloom. The streak is this wide. */
const RADIUS = 17;

type Point = { x: number; y: number; born: number };

export function GlowCursor({
  color = GLOW,
  life = LIFE_MS,
  radius = RADIUS,
}: {
  /** `r, g, b` as a bare triple, the way the original's css variable holds it. */
  color?: string;
  life?: number;
  radius?: number;
}) {
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
      // Backing store at device resolution so the bloom is smooth rather than
      // drawn at half density and scaled up.
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

    const points: Point[] = [];
    let last: { x: number; y: number } | null = null;
    let frame = 0;

    const tick = (now: number) => {
      context.clearRect(0, 0, width, height);

      // Oldest first, so dropping from the front empties the tail.
      while (points.length > 0 && now - points[0].born >= life) points.shift();

      if (points.length === 0) {
        // Nothing left to draw. Stop rather than clearing an empty canvas
        // sixty times a second until the pointer moves again.
        frame = 0;
        return;
      }

      frame = requestAnimationFrame(tick);

      // Additive: where points overlap the colour climbs past its own value
      // and the middle of the streak goes hot and nearly white, which is what
      // separates a neon streak from a row of translucent dots.
      context.globalCompositeOperation = "lighter";

      for (const point of points) {
        const left = 1 - (now - point.born) / life;

        const bloom = context.createRadialGradient(
          point.x,
          point.y,
          0,
          point.x,
          point.y,
          radius,
        );
        bloom.addColorStop(0, `rgba(${color}, ${left * 0.5})`);
        bloom.addColorStop(1, `rgba(${color}, 0)`);
        context.fillStyle = bloom;
        context.beginPath();
        context.arc(point.x, point.y, radius, 0, Math.PI * 2);
        context.fill();

        // A tighter, whiter centre inside the bloom. Without it the streak is
        // evenly pink and reads as a smudge rather than something lit.
        const core = context.createRadialGradient(
          point.x,
          point.y,
          0,
          point.x,
          point.y,
          radius * 0.34,
        );
        core.addColorStop(0, `rgba(255, 214, 246, ${left * 0.55})`);
        core.addColorStop(1, `rgba(${color}, 0)`);
        context.fillStyle = core;
        context.beginPath();
        context.arc(point.x, point.y, radius * 0.34, 0, Math.PI * 2);
        context.fill();
      }

      context.globalCompositeOperation = "source-over";
    };

    const wake = () => {
      if (frame === 0) frame = requestAnimationFrame(tick);
    };

    const move = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      const now = performance.now();
      const to = { x: event.clientX, y: event.clientY };

      // First move of a visit, or the first after leaving and coming back.
      // Without this the streak would be drawn from wherever the pointer was
      // last seen, straight across the page.
      if (!last) {
        last = to;
        points.push({ ...to, born: now });
        wake();
        return;
      }

      // Fill in the whole segment travelled since the last event, not just its
      // end. A fast hand covers far more than one point's width between two
      // events, and only marking the ends leaves a dotted line.
      const span = Math.hypot(to.x - last.x, to.y - last.y);
      const steps = Math.max(Math.floor(span / SPACING), 1);
      const dx = (to.x - last.x) / steps;
      const dy = (to.y - last.y) / steps;

      for (let i = 1; i <= steps; i++) {
        points.push({ x: last.x + dx * i, y: last.y + dy * i, born: now });
      }

      last = to;
      wake();
    };

    const leave = () => {
      last = null;
    };

    window.addEventListener("pointermove", move, { passive: true });
    document.addEventListener("pointerleave", leave);
    window.addEventListener("resize", resize);

    return () => {
      if (frame !== 0) cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", move);
      document.removeEventListener("pointerleave", leave);
      window.removeEventListener("resize", resize);
    };
  }, [wanted, color, life, radius]);

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
