"use client";

import { useId } from "react";
import type { CSSProperties, ReactNode } from "react";

/**
 * The apple "liquid glass" treatment: a pane that bends what is behind it,
 * rather than a translucent window that merely blurs it.
 *
 * The lens is the whole point. `backdrop-filter` can blur, tint and brighten,
 * but it cannot magnify — so the refraction is done with an svg displacement
 * map, chained into the same filter list. See `GlassLens` for how the map is
 * built and why it is a pair of gradients rather than noise.
 *
 * On top of the lens sit two flat layers: a tint, so the pane stays readable
 * over a dark backdrop, and an inset highlight, which is what actually reads
 * as a bevelled edge. Content sits above both. Nothing here is interactive on
 * its own — this is a surface, and whatever is dropped into it keeps its own
 * behaviour.
 */
export function LiquidGlass({
  children,
  className = "",
  /**
   * How far the rim pulls the backdrop inward, in pixels — the thickness of
   * the glass, in effect. Past roughly a tenth of the pane's short side the
   * edges start to smear rather than bend. Zero drops the lens entirely and
   * leaves a plain frosted pane.
   */
  distortion = 14,
  /**
   * White tint, 0–1. The default is tuned for the dark room this sits in;
   * over a light background it wants to go up.
   */
  tint = 0.1,
  style,
}: {
  children: ReactNode;
  className?: string;
  distortion?: number;
  tint?: number;
  style?: CSSProperties;
}) {
  // Scoped per instance: two panes at different `distortion` values would
  // otherwise fight over one filter id.
  const lens = `glass${useId().replace(/:/g, "")}`;
  const backdrop = `blur(3px) saturate(1.3) brightness(1.06)${
    distortion > 0 ? ` url(#${lens})` : ""
  }`;

  return (
    <div
      className={`relative isolate overflow-hidden ${className}`}
      style={{
        // Two shadows: a tight one that seats the pane on the page, and a wide
        // soft one that gives it some thickness.
        boxShadow: "0 6px 6px rgba(0,0,0,0.2), 0 0 20px rgba(0,0,0,0.1)",
        ...style,
      }}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 rounded-[inherit]"
        style={{
          backdropFilter: backdrop,
          // Safari ignores a url() filter here and takes the rest of the list,
          // which leaves a frosted pane rather than a broken one.
          WebkitBackdropFilter: backdrop,
        }}
      />

      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-10 rounded-[inherit]"
        style={{ background: `rgba(255,255,255,${tint})` }}
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-20 rounded-[inherit]"
        style={{
          boxShadow:
            "inset 2px 2px 1px 0 rgba(255,255,255,0.35), inset -1px -1px 1px 1px rgba(255,255,255,0.25)",
        }}
      />

      <div className="relative z-30">{children}</div>

      {distortion > 0 && <GlassLens id={lens} distortion={distortion} />}
    </div>
  );
}

/**
 * A ramp across one axis, as a data-uri image, for `feDisplacementMap` to read
 * as offsets.
 *
 * A displacement map moves each pixel by `scale * (channel - 0.5)`, so 128 is
 * "leave this alone". A ramp that runs 255 → 128 → 128 → 0 therefore samples
 * from the right at the left edge and from the left at the right edge — both
 * inward — which is magnification. The flat middle is what keeps the centre of
 * the pane clear, and the text on top of it undistorted.
 *
 * Direction matters: reverse the stops and the same map minifies, which looks
 * like a dent rather than a lens.
 */
function ramp(axis: "x" | "y") {
  const horizontal = axis === "x";
  // The moving channel is red for x and green for y; the other two sit at 128
  // so this pass cannot nudge the axis it is not responsible for.
  const at = (value: number) =>
    horizontal ? `rgb(${value},128,128)` : `rgb(128,${value},128)`;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><linearGradient id="g" x1="0" y1="0" x2="${
    horizontal ? 1 : 0
  }" y2="${horizontal ? 0 : 1}"><stop offset="0" stop-color="${at(
    255,
  )}"/><stop offset="0.35" stop-color="${at(
    128,
  )}"/><stop offset="0.65" stop-color="${at(
    128,
  )}"/><stop offset="1" stop-color="${at(
    0,
  )}"/></linearGradient><rect width="100" height="100" fill="url(#g)"/></svg>`;

  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/**
 * Two displacement passes, one per axis.
 *
 * Split in two because a single map would need a red ramp and a green ramp in
 * the same image, which means compositing two gradients — and `mix-blend-mode`
 * inside a data-uri consumed by `feImage` is not something to rely on. Chained
 * passes are the same maths and render identically everywhere.
 */
function GlassLens({ id, distortion }: { id: string; distortion: number }) {
  return (
    <svg aria-hidden="true" className="absolute size-0">
      <filter
        id={id}
        x="0%"
        y="0%"
        width="100%"
        height="100%"
        filterUnits="objectBoundingBox"
        // Without this the 128 midpoint is converted to linearRGB before the
        // displacement reads it, which drags the whole pane off to one side.
        colorInterpolationFilters="sRGB"
      >
        <feImage
          href={ramp("x")}
          preserveAspectRatio="none"
          result="mapX"
          // Both maps stretch to the filter region, so the ramp always lines up
          // with the pane whatever size it is drawn at.
        />
        <feImage href={ramp("y")} preserveAspectRatio="none" result="mapY" />

        <feDisplacementMap
          in="SourceGraphic"
          in2="mapX"
          scale={distortion}
          xChannelSelector="R"
          yChannelSelector="B"
          result="bentX"
        />
        <feDisplacementMap
          in="bentX"
          in2="mapY"
          scale={distortion}
          xChannelSelector="B"
          yChannelSelector="G"
        />
      </filter>
    </svg>
  );
}
