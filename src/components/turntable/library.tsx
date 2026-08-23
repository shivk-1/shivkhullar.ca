"use client";

import { useState } from "react";
import Image from "next/image";
import { trackYear, type ProducedTrack, type Track } from "@/data/music";

type Tab = "on-repeat" | "produced";

/**
 * The record crate. Two tabs rather than two stacked groups: the produced
 * rows carry a year and a note, so they are twice the height of a spotify
 * row, and stacking the two lists pushed one of them off the top of the
 * scroll as soon as the playlist loaded.
 *
 * Opens on "on repeat", which is the first tab. The open tab and the leading
 * tab are deliberately the same thing: a tablist that opens on its second
 * entry reads as though something has already been clicked.
 */
export function Library({
  produced,
  onRepeat,
  onRepeatState,
  current,
  onSelect,
}: {
  produced: ProducedTrack[];
  onRepeat: Track[];
  onRepeatState: "loading" | "ready" | "unavailable";
  current: Track | null;
  onSelect: (track: Track) => void;
}) {
  const [tab, setTab] = useState<Tab>("on-repeat");

  return (
    <aside className="flex h-full w-full flex-col border-l border-white/10 bg-white/[0.05] backdrop-blur">
      <div
        role="tablist"
        aria-label="library"
        className="flex shrink-0 gap-1 border-b border-white/10 px-3 py-3"
      >
        <TabButton
          id="on-repeat"
          active={tab === "on-repeat"}
          onSelect={setTab}
          count={onRepeatState === "ready" ? onRepeat.length : null}
        >
          on repeat
        </TabButton>
        <TabButton
          id="produced"
          active={tab === "produced"}
          onSelect={setTab}
          count={produced.length}
        >
          produced
        </TabButton>
      </div>

      <div
        role="tabpanel"
        id="panel-on-repeat"
        aria-labelledby="tab-on-repeat"
        hidden={tab !== "on-repeat"}
        className="min-h-0 flex-1 overflow-y-auto px-2 py-3"
      >
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
      </div>

      <div
        role="tabpanel"
        id="panel-produced"
        aria-labelledby="tab-produced"
        hidden={tab !== "produced"}
        className="min-h-0 flex-1 overflow-y-auto px-2 py-3"
      >
        <p className="px-3 pb-2 text-[12.5px] leading-relaxed text-white/40">
          beats and tracks i made. pick one to put it on the deck.
        </p>
        {produced.map((track) => (
          <ProducedRow
            key={track.id}
            track={track}
            active={current?.id === track.id}
            onSelect={onSelect}
          />
        ))}
      </div>
    </aside>
  );
}

function TabButton({
  id,
  active,
  count,
  onSelect,
  children,
}: {
  id: Tab;
  active: boolean;
  /** Null while the count is not known yet, which hides the pill entirely
      rather than flashing a zero that is about to be wrong. */
  count: number | null;
  onSelect: (tab: Tab) => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      id={`tab-${id}`}
      aria-selected={active}
      aria-controls={`panel-${id}`}
      onClick={() => onSelect(id)}
      className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors ${
        active
          ? "bg-white/[0.12] text-white"
          : "text-white/45 hover:bg-white/[0.06] hover:text-white/70"
      }`}
    >
      {children}
      {count !== null && (
        <span className="tabular-nums text-[11.5px] text-white/35">
          {count}
        </span>
      )}
    </button>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return <p className="px-3 py-2 text-[13px] text-white/45">{children}</p>;
}

/** A track of mine: cover, title, year, and the one-line note. */
function ProducedRow({
  track,
  active,
  onSelect,
}: {
  track: ProducedTrack;
  active: boolean;
  onSelect: (track: Track) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(track)}
      className={`flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${
        active ? "bg-white/[0.10]" : "hover:bg-white/[0.06]"
      }`}
    >
      <Cover src={track.artwork} className="size-11" sizes="44px" />
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline gap-2">
          <span className="min-w-0 truncate text-[13.5px] font-medium text-white">
            {track.title}
          </span>
          <span className="shrink-0 tabular-nums text-[11.5px] text-white/35">
            {trackYear(track.date)}
          </span>
        </span>
        <span className="mt-0.5 block text-[12.5px] leading-snug text-white/45">
          {track.note}
        </span>
      </span>
    </button>
  );
}

/** A track of someone else's: cover, title, artist. */
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
        active ? "bg-white/[0.10]" : "hover:bg-white/[0.06]"
      }`}
    >
      <Cover src={track.artwork} className="size-10" sizes="40px" />
      <span className="min-w-0">
        <span className="block truncate text-[13.5px] font-medium text-white">
          {track.title}
        </span>
        <span className="block truncate text-[12.5px] text-white/50">
          {track.artist}
        </span>
      </span>
    </button>
  );
}

function Cover({
  src,
  className,
  sizes,
}: {
  src: string;
  className: string;
  sizes: string;
}) {
  return (
    <span
      className={`relative shrink-0 overflow-hidden rounded bg-white/10 ${className}`}
    >
      <Image
        src={src}
        alt=""
        fill
        sizes={sizes}
        // Remote covers come straight from spotify's cdn, which next/image
        // is not configured for; unoptimized keeps them working without
        // opening the optimizer to an arbitrary host.
        unoptimized
        className="object-cover"
      />
    </span>
  );
}
