"use client";

import Image from "next/image";
import type { Track } from "@/data/music";

/** mm:ss, or 0:00 before any metadata has loaded. */
function clock(seconds: number) {
  if (!Number.isFinite(seconds)) return "0:00";
  const whole = Math.floor(seconds);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}

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
    <div className="pointer-events-auto w-full max-w-md rounded-2xl border border-black/[0.08] bg-white/85 p-4 shadow-[0_8px_30px_rgba(0,0,0,0.06)] backdrop-blur">
      <div className="flex items-center gap-3">
        <span className="relative size-12 shrink-0 overflow-hidden rounded-lg bg-black/5">
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
          <span className="block truncate text-[15px] font-bold text-black">
            {track?.title ?? "no track selected"}
          </span>
          <span className="block truncate text-[13px] text-black/45">
            {track?.artist ?? "pick one from the library"}
          </span>
        </span>
      </div>

      <div className="mt-4 flex items-center gap-3 text-[12px] text-black/45">
        <span className="tabular-nums">{clock(time)}</span>
        <input
          type="range"
          min={0}
          max={duration || 0}
          step={0.1}
          value={time}
          disabled={!track}
          onChange={(event) => onSeek(Number(event.target.value))}
          aria-label="seek"
          className="h-1 flex-1 accent-black"
        />
        <span className="tabular-nums">{clock(duration)}</span>
      </div>

      <div className="mt-4 flex items-center gap-4">
        <button
          type="button"
          onClick={onToggle}
          disabled={!track}
          aria-label={playing ? "pause" : "play"}
          className="grid size-12 shrink-0 place-items-center rounded-full bg-black text-white transition-opacity hover:opacity-85 disabled:opacity-25"
        >
          {playing ? (
            <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
              <rect x="1" y="0" width="4" height="14" fill="currentColor" />
              <rect x="9" y="0" width="4" height="14" fill="currentColor" />
            </svg>
          ) : (
            <svg width="14" height="16" viewBox="0 0 14 16" aria-hidden="true">
              <path d="M0 0l14 8-14 8z" fill="currentColor" />
            </svg>
          )}
        </button>

        <label className="flex items-center gap-2 text-[12px] text-black/45">
          <input
            type="range"
            min={33}
            max={45}
            step={1}
            value={rpm}
            onChange={(event) => onRpm(Number(event.target.value))}
            aria-label="platter speed"
            className="h-1 w-20 accent-black"
          />
          <span className="tabular-nums">{rpm} rpm</span>
        </label>

        <label className="ml-auto flex items-center gap-2">
          <span className="sr-only">volume</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={(event) => onVolume(Number(event.target.value))}
            aria-label="volume"
            className="h-1 w-20 accent-black"
          />
        </label>
      </div>
    </div>
  );
}
