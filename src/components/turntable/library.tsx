"use client";

import { useDeferredValue, useMemo, useState } from "react";
import Image from "next/image";
import {
  clock,
  libraryNotes,
  trackYear,
  type ProducedTrack,
  type Track,
} from "@/data/music";
import { searchTracks } from "./search";

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
  const [query, setQuery] = useState("");

  // Typing stays ahead of the list: the input renders on every keystroke,
  // the filtered rows catch up a frame later.
  const deferredQuery = useDeferredValue(query);
  const foundOnRepeat = useMemo(
    () => searchTracks(onRepeat, deferredQuery),
    [onRepeat, deferredQuery],
  );
  const foundProduced = useMemo(
    () => searchTracks(produced, deferredQuery),
    [produced, deferredQuery],
  );
  const searching = deferredQuery.trim().length > 0;

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
          count={onRepeatState === "ready" ? foundOnRepeat.length : null}
        >
          on repeat
        </TabButton>
        <TabButton
          id="produced"
          active={tab === "produced"}
          onSelect={setTab}
          count={foundProduced.length}
        >
          produced
        </TabButton>
      </div>

      <TabNote id="library-note" tab={tab} />

      <Search value={query} onChange={setQuery} />

      <div
        role="tabpanel"
        id="panel-on-repeat"
        aria-labelledby="tab-on-repeat"
        aria-describedby="library-note"
        hidden={tab !== "on-repeat"}
        className="min-h-0 flex-1 overflow-y-auto px-2 py-2"
      >
        {onRepeatState === "loading" && <Note>loading the rotation…</Note>}
        {onRepeatState === "unavailable" && (
          <Note>rotation unavailable right now.</Note>
        )}
        {onRepeatState === "ready" &&
          searching &&
          foundOnRepeat.length === 0 && (
            <Note>nothing here matches “{deferredQuery.trim()}”.</Note>
          )}
        {onRepeatState === "ready" && foundOnRepeat.length > 0 && (
          <>
            <Header trailing="album" />
            {foundOnRepeat.map((track) => (
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
        aria-describedby="library-note"
        hidden={tab !== "produced"}
        className="min-h-0 flex-1 overflow-y-auto px-2 py-2"
      >
        {searching && foundProduced.length === 0 ? (
          <Note>nothing here matches “{deferredQuery.trim()}”.</Note>
        ) : (
          <>
            <Header trailing="year" />
            {foundProduced.map((track) => (
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
            {/* Only when the whole crate is on screen: while a search is
                narrowing it, a promise of more is answering a question
                nobody asked. */}
            {!searching && (
              <p className="px-3 py-6 text-center text-[12.5px] text-white/35">
                more tracks to be added soon…
              </p>
            )}
          </>
        )}
      </div>
    </aside>
  );
}

/**
 * What each tab is, in a line, with the longer thought under it.
 *
 * It sits outside the panels so it can hold still while they swap, which is
 * why both panels point their `aria-describedby` at it: read on its own it is
 * a floating sentence, but as the description of whichever list is showing it
 * says the same thing to a screen reader that it says on screen.
 */
function TabNote({ id, tab }: { id: string; tab: Tab }) {
  const note = libraryNotes[tab];

  return (
    <div id={id} className="shrink-0 px-3 pb-3">
      <p className="text-[13px] leading-relaxed text-white/65">{note.lead}</p>
      <p className="mt-1 text-[12px] leading-relaxed text-white/35">
        {note.body}
      </p>
    </div>
  );
}

/**
 * Filters as it is typed — there is no submit, so the input is deliberately
 * not in a form and enter does nothing. Escape clears it, which is the one
 * keystroke people expect a search field to answer for.
 */
function Search({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="shrink-0 border-b border-white/10 px-3 py-2.5">
      <div className="flex items-center gap-2 rounded-lg bg-white/[0.06] px-2.5 py-2 focus-within:bg-white/[0.09]">
        <SearchGlyph />
        <input
          type="search"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape") onChange("");
          }}
          placeholder="search the crate"
          aria-label="search the library"
          // The webkit clear affordance sits in the middle of the dark field
          // as a light blob; escape and backspace already cover clearing.
          className="min-w-0 flex-1 bg-transparent text-[13px] text-white placeholder:text-white/35 focus:outline-none [&::-webkit-search-cancel-button]:hidden"
        />
      </div>
    </div>
  );
}

function SearchGlyph() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      aria-hidden="true"
      className="shrink-0 text-white/35"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" />
    </svg>
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
      className="mb-1 flex items-center gap-3.5 border-b border-white/[0.07] px-3 pb-1.5 text-[10.5px] uppercase tracking-[0.14em] text-white/30"
    >
      <span className="w-14 shrink-0" />
      <span className="min-w-0 flex-1">title</span>
      <span className="hidden min-w-0 flex-1 md:block">{trailing}</span>
      <span className="w-11 shrink-0 text-right">time</span>
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
      className={`group flex w-full items-center gap-3.5 rounded-lg px-3 py-2.5 text-left transition-colors ${
        active ? "bg-white/[0.10]" : "hover:bg-white/[0.06]"
      }`}
    >
      <span className="relative size-14 shrink-0 overflow-hidden rounded-md bg-white/10">
        <Image
          src={track.artwork}
          alt=""
          fill
          sizes="56px"
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
          className={`block truncate text-[14.5px] font-medium ${
            active ? "text-white" : "text-white/90"
          }`}
        >
          {track.title}
        </span>
        <span className="mt-0.5 block truncate text-[13px] text-white/50">
          {note ?? track.artist}
        </span>
      </span>

      {/* Dropped below md: the panel is too narrow there for a third column,
          and the album is the least load-bearing thing in the row. */}
      <span className="hidden min-w-0 flex-1 truncate text-[13px] text-white/40 md:block">
        {trailing ?? ""}
      </span>

      <span className="w-11 shrink-0 text-right tabular-nums text-[12.5px] text-white/35">
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
