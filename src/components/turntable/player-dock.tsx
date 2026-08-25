"use client";

import Image from "next/image";
import { clock, type Track } from "@/data/music";
import { LiquidGlass } from "./liquid-glass";

export function PlayerDock({
  track,
  playing,
  time,
  duration,
  rpm,
  volume,
  onToggle,
  onSeek,
  onRpm,
  onVolume,
}: {
  track: Track | null;
  playing: boolean;
  time: number;
  duration: number;
  rpm: number;
  volume: number;
  onToggle: () => void;
  onSeek: (seconds: number) => void;
  onRpm: (rpm: number) => void;
  onVolume: (volume: number) => void;
}) {
  return (
    <LiquidGlass className="pointer-events-auto w-full max-w-md rounded-2xl">
      <div className="p-4">
        <div className="flex items-center gap-3">
          <span className="relative size-12 shrink-0 overflow-hidden rounded-lg bg-white/10 ring-1 ring-white/15">
            {track && (
              <Image
                src={track.artwork}
                alt=""
                fill
                sizes="48px"
                unoptimized
                className="object-cover"
              />
            )}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[15px] font-bold text-white">
              {track?.title ?? "no track selected"}
            </span>
            <span className="block truncate text-[13px] text-white/55">
              {track?.artist ?? "pick one from the library"}
            </span>
          </span>
        </div>

        <div className="mt-4 flex items-center gap-3 text-[12px] text-white/55">
          <span className="tabular-nums">{clock(time)}</span>
          <Slider
            min={0}
            max={duration || 0}
            step={0.1}
            value={time}
            disabled={!track}
            onChange={onSeek}
            label="seek"
            className="flex-1"
          />
          <span className="tabular-nums">{clock(duration)}</span>
        </div>

        {/* One flat row rather than a transport plus two grouped sliders.
            Grouping made each group flex-1, so the rpm group spent part of its
            share on the icon and the readout and its bar came out shorter than
            the volume one. As siblings on the same basis the two bars are the
            same width by construction, and the last one ends on the container
            padding — the same inset the play button starts from. */}
        <div className="mt-4 flex items-center gap-3">
          <button
            type="button"
            onClick={onToggle}
            disabled={!track}
            aria-label={playing ? "pause" : "play"}
            className="mr-1 grid size-8 shrink-0 place-items-center rounded-full bg-white text-neutral-950 shadow-[0_2px_10px_rgba(0,0,0,0.35)] transition-transform duration-200 hover:scale-105 active:scale-95 disabled:scale-100 disabled:opacity-30 disabled:shadow-none"
          >
            {playing ? (
              <svg
                width="12"
                height="14"
                viewBox="0 0 11 13"
                aria-hidden="true"
              >
                <rect width="3.6" height="13" rx="1.3" fill="currentColor" />
                <rect
                  x="7.4"
                  width="3.6"
                  height="13"
                  rx="1.3"
                  fill="currentColor"
                />
              </svg>
            ) : (
              <svg
                width="13"
                height="15"
                viewBox="0 0 12 14"
                // A triangle's visual centre sits behind its bounding-box
                // centre, so a mathematically centred play glyph reads as
                // left-leaning inside a circle.
                className="translate-x-px"
                aria-hidden="true"
              >
                <path
                  d="M1.1 1 10.6 6.2a.95.95 0 0 1 0 1.6L1.1 13A.95.95 0 0 1 0 12.2V1.8A.95.95 0 0 1 1.1 1Z"
                  fill="currentColor"
                />
              </svg>
            )}
          </button>

          <SpeedIcon />
          {/* Fixed width so the bar beside it does not jump a pixel each time
              the number changes. */}
          <span className="w-11 shrink-0 text-[12px] tabular-nums text-white/55">
            {rpm} rpm
          </span>
          <Slider
            min={33}
            max={45}
            step={1}
            value={rpm}
            onChange={onRpm}
            label="platter speed"
            className="min-w-0 flex-1 basis-0"
          />

          {/* A wider gap here than the row's own, so the two sliders read as
              two controls rather than one interrupted strip. */}
          <VolumeIcon level={volume} />
          <Slider
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={onVolume}
            label="volume"
            className="min-w-0 flex-1 basis-0"
          />
        </div>
      </div>
    </LiquidGlass>
  );
}

/** A speedometer: the dial, its ticks, and a needle sitting off to one side. */
function SpeedIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      aria-hidden="true"
      className="shrink-0 text-white/55"
    >
      <path d="M2.2 12.2a7 7 0 1 1 11.6 0" />
      <path d="M8 11.4 11 6.8" />
    </svg>
  );
}

/**
 * A speaker, with as many waves as there is volume to justify them — none when
 * muted, which is the only state the bar alone cannot make obvious at a glance.
 */
function VolumeIcon({ level }: { level: number }) {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="ml-2 shrink-0 text-white/55"
    >
      <path d="M4.4 6.1H2.2a.8.8 0 0 0-.8.8v2.2a.8.8 0 0 0 .8.8h2.2L7.6 12.4a.5.5 0 0 0 .8-.4V4a.5.5 0 0 0-.8-.4Z" />
      {level > 0 && <path d="M10.7 6.2a2.6 2.6 0 0 1 0 3.6" />}
      {level > 0.5 && <path d="M12.6 4.4a5.2 5.2 0 0 1 0 7.2" />}
    </svg>
  );
}

/**
 * A range input with its native chrome replaced, the way apple draws one: a
 * plain capsule that is bright up to the value and dim after it, with no knob
 * at all. The bar itself is the affordance, and it thickens while the pointer
 * is on it.
 *
 * The thumb is not removed, only made invisible — it still carries the drag
 * and the keyboard focus, so giving it zero size would cost the control its
 * hit area. Native tracks and thumbs are also drawn by the platform and cannot
 * be made to agree across browsers, which on a dock holding three of them
 * showed up as three subtly different controls.
 */
function Slider({
  min,
  max,
  step,
  value,
  disabled = false,
  label,
  className = "",
  onChange,
}: {
  min: number;
  max: number;
  step: number;
  value: number;
  disabled?: boolean;
  label: string;
  className?: string;
  onChange: (value: number) => void;
}) {
  // Guarded: `max` is zero until a duration lands, and 0/0 is NaN.
  const filled = max > min ? ((value - min) / (max - min)) * 100 : 0;

  // Warm rather than pure white: the room is lit by two amber lamps, and a
  // neutral fill reads as a foreign UI element sitting on top of the scene.
  const fill = "rgba(255,241,224,0.92)";
  const rest = "rgba(255,255,255,0.18)";

  // Wider than the bar is tall so the bar stays easy to grab once the knob is
  // no longer there to aim at.
  const thumb =
    "[&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:bg-transparent " +
    "[&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-transparent";

  return (
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      disabled={disabled}
      aria-label={label}
      onChange={(event) => onChange(Number(event.target.value))}
      style={{
        background: `linear-gradient(to right, ${fill} 0 ${filled}%, ${rest} ${filled}% 100%)`,
      }}
      className={`h-1 cursor-pointer appearance-none rounded-full outline-none transition-[height,opacity] duration-150 hover:h-1.5 active:h-1.5 disabled:cursor-default disabled:opacity-40 disabled:hover:h-1 focus-visible:ring-2 focus-visible:ring-white/60 ${thumb} ${className}`}
    />
  );
}
