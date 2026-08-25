"use client";

import { useState } from "react";
import Image from "next/image";
import { clock, trackYear, type ProducedTrack, type Track } from "@/data/music";

type Tab = "on-repeat" | "produced";

/**
 * The record crate, laid out like an apple music song list: cover, title over
 * artist, album, duration. Two tabs rather than two stacked groups — the
 * produced rows carry a year and a note in place of the album, so stacking the
 * two lists pushed one of them off the top of the scroll as soon as the
 * playlist loaded.
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
  playing,
  onSelect,
}: {
  produced: ProducedTrack[];
  onRepeat: Track[];
  onRepeatState: "loading" | "ready" | "unavailable";
  current: Track | null;
  playing: boolean;
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
        className="min-h-0 flex-1 overflow-y-auto px-2 py-2"
      >
        {onRepeatState === "loading" && <Note>loading the rotation…</Note>}
        {onRepeatState === "unavailable" && (
          <Note>rotation unavailable right now.</Note>
        )}
        {onRepeatState === "ready" && (
          <>
            <Header trailing="album" />
            {onRepeat.map((track) => (
              <Row
                key={track.id}
                track={track}
                active={current?.id === track.id}
                playing={playing}
                onSelect={onSelect}
                trailing={track.album}
              />
            ))}
          </>
        )}
      </div>

      <div
        role="tabpanel"
        id="panel-produced"
        aria-labelledby="tab-produced"
        hidden={tab !== "produced"}
        className="min-h-0 flex-1 overflow-y-auto px-2 py-2"
      >
        <Header trailing="year" />
        {produced.map((track) => (
          <Row
            key={track.id}
            track={track}
            active={current?.id === track.id}
            playing={playing}
            onSelect={onSelect}
            trailing={trackYear(track.date)}
            note={track.note}
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

/**
 * The column strip apple music puts above its song lists. Purely decorative —
 * nothing here sorts — so it is hidden from the a11y tree and lines up with
 * the row grid below by repeating the same spacing.
 */
function Header({ trailing }: { trailing: string }) {
  return (
    <div
      aria-hidden="true"
      className="mb-1 flex items-center gap-3 border-b border-white/[0.07] px-3 pb-1.5 text-[10.5px] uppercase tracking-[0.14em] text-white/30"
    >
      <span className="w-10 shrink-0" />
      <span className="min-w-0 flex-1">title</span>
      <span className="hidden min-w-0 flex-1 md:block">{trailing}</span>
      <span className="w-10 shrink-0 text-right">time</span>
    </div>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return <p className="px-3 py-2 text-[13px] text-white/45">{children}</p>;
}

/**
 * One song. Everything is on the same grid on both tabs — only the third
 * column differs, album for a pulled track and the year for one of mine.
 */
function Row({
  track,
  active,
  playing,
  trailing,
  note,
  onSelect,
}: {
  track: Track;
  active: boolean;
  playing: boolean;
  trailing?: string;
  /** Produced only: the one-liner, tucked under the title. */
  note?: string;
  onSelect: (track: Track) => void;
}) {
  const sounding = active && playing;

  return (
    <button
      type="button"
      onClick={() => onSelect(track)}
      aria-label={`${sounding ? "pause" : "play"} ${track.title} by ${track.artist}`}
      className={`group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors ${
        active ? "bg-white/[0.10]" : "hover:bg-white/[0.06]"
      }`}
    >
      <span className="relative size-10 shrink-0 overflow-hidden rounded bg-white/10">
        <Image
          src={track.artwork}
          alt=""
          fill
          sizes="40px"
          // Covers come straight from apple's cdn, which next/image is not
          // configured for; unoptimized keeps them working without opening the
          // optimizer to an arbitrary host.
          unoptimized
          className="object-cover"
        />
        {/* The transport control lives on the cover, the way it does in apple
            music: always up on the active row, on hover for the rest. */}
        <span
          className={`absolute inset-0 grid place-items-center bg-black/55 text-white transition-opacity ${
            active ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          }`}
        >
          {sounding ? <PauseGlyph /> : <PlayGlyph />}
        </span>
      </span>

      <span className="min-w-0 flex-1">
        <span
          className={`block truncate text-[13.5px] font-medium ${
            active ? "text-white" : "text-white/90"
          }`}
        >
          {track.title}
        </span>
        <span className="block truncate text-[12.5px] text-white/50">
          {note ?? track.artist}
        </span>
      </span>

      {/* Dropped below md: the panel is too narrow there for a third column,
          and the album is the least load-bearing thing in the row. */}
      <span className="hidden min-w-0 flex-1 truncate text-[12.5px] text-white/40 md:block">
        {trailing ?? ""}
      </span>

      <span className="w-10 shrink-0 text-right tabular-nums text-[12px] text-white/35">
        {clock(track.seconds)}
      </span>
    </button>
  );
}

function PlayGlyph() {
  return (
    <svg width="10" height="12" viewBox="0 0 10 12" aria-hidden="true">
      <path d="M0 0l10 6-10 6z" fill="currentColor" />
    </svg>
  );
}

function PauseGlyph() {
  return (
    <svg width="10" height="12" viewBox="0 0 10 12" aria-hidden="true">
      <rect x="0" y="0" width="3.5" height="12" fill="currentColor" />
      <rect x="6.5" y="0" width="3.5" height="12" fill="currentColor" />
    </svg>
  );
}
