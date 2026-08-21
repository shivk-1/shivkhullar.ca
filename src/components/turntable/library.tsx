"use client";

import Image from "next/image";
import type { Track } from "@/data/music";

/**
 * The record crate. Two groups, mine first: a visitor should hear my own music
 * before anyone else's.
 */
export function Library({
  mine,
  onRepeat,
  onRepeatState,
  current,
  onSelect,
}: {
  mine: Track[];
  onRepeat: Track[];
  onRepeatState: "loading" | "ready" | "unavailable";
  current: Track | null;
  onSelect: (track: Track) => void;
}) {
  return (
    <aside className="flex h-full w-full flex-col border-l border-black/10 bg-white/70 backdrop-blur">
      <div className="border-b border-black/10 px-5 py-4">
        <h2 className="text-[15px] font-bold text-black">library</h2>
        <p className="mt-1 text-[13px] text-black/45">
          pick a record to put it on the deck
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 py-3">
        <Group title="mine">
          {mine.map((track) => (
            <Row
              key={track.id}
              track={track}
              active={current?.id === track.id}
              onSelect={onSelect}
            />
          ))}
        </Group>

        <Group title="on repeat">
          {onRepeatState === "loading" && <Note>loading the playlist…</Note>}
          {onRepeatState === "unavailable" && (
            <Note>playlist unavailable right now.</Note>
          )}
          {onRepeat.map((track) => (
            <Row
              key={track.id}
              track={track}
              active={current?.id === track.id}
              onSelect={onSelect}
            />
          ))}
        </Group>
      </div>
    </aside>
  );
}

function Group({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-4">
      <h3 className="px-3 pb-1.5 text-[11px] font-bold uppercase tracking-wider text-black/35">
        {title}
      </h3>
      {children}
    </section>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return <p className="px-3 py-2 text-[13px] text-black/40">{children}</p>;
}

function Row({
  track,
  active,
  onSelect,
}: {
  track: Track;
  active: boolean;
  onSelect: (track: Track) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(track)}
      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors ${
        active ? "bg-black/[0.06]" : "hover:bg-black/[0.03]"
      }`}
    >
      <span className="relative size-10 shrink-0 overflow-hidden rounded bg-black/5">
        <Image
          src={track.artwork}
          alt=""
          fill
          sizes="40px"
          // Remote covers come straight from spotify's cdn, which next/image
          // is not configured for; unoptimized keeps them working without
          // opening the optimizer to an arbitrary host.
          unoptimized
          className="object-cover"
        />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[13.5px] font-medium text-black">
          {track.title}
        </span>
        <span className="block truncate text-[12.5px] text-black/45">
          {track.artist}
        </span>
      </span>
    </button>
  );
}
