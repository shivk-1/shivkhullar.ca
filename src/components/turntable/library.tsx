"use client";

import { useDeferredValue, useMemo, useState } from "react";
import Image from "next/image";
import {
  clock,
  libraryNotes,
  runtime,
  type ProducedTrack,
  type Track,
} from "@/data/music";
import { site } from "@/data/site";
import { Recommend } from "./recommend";
import { searchTracks } from "./search";
import { SORT_KEYS, SORT_LABELS, sortTracks, type SortKey } from "./sort";

type Tab = "on-repeat" | "produced" | "recommend";

/** The two tabs that are lists. "recommend" is a form, and everything that
    narrows or counts a list has nothing to say about it. */
type ListTab = Exclude<Tab, "recommend">;

/**
 * The record crate, laid out like an apple music song list: cover, title over
 * artist, album, duration. Tabs rather than stacked groups — the produced
 * rows carry a note in place of the album, so stacking the two lists pushed
 * one of them off the top of the scroll as soon as the playlist loaded.
 *
 * The third tab is not a list at all: it is the box people put song
 * recommendations into. It lives here because this is where someone is
 * already looking at what I listen to, which is the moment they have an
 * opinion about it.
 *
 * Opens on "on repeat", which is the first tab. The open tab and the leading
 * tab are deliberately the same thing: a tablist that opens on its second
 * entry reads as though something has already been clicked.
 */
export function Library({
  id,
  produced,
  onRepeat,
  onRepeatState,
  current,
  playing,
  onSelect,
}: {
  /** So the collapse tab outside can point `aria-controls` at this. */
  id: string;
  produced: ProducedTrack[];
  onRepeat: Track[];
  onRepeatState: "loading" | "ready" | "unavailable";
  current: Track | null;
  playing: boolean;
  onSelect: (track: Track) => void;
}) {
  const [tab, setTab] = useState<Tab>("on-repeat");
  const [query, setQuery] = useState("");

  // One per tab. A sort is a statement about the list you are looking at, so
  // ordering the rotation by length should not silently reorder my own crate
  // behind the other tab.
  const [sort, setSort] = useState<Record<ListTab, SortKey>>({
    "on-repeat": "shuffle",
    produced: "shuffle",
  });

  // Typing stays ahead of the list: the input renders on every keystroke,
  // the filtered rows catch up a frame later.
  const deferredQuery = useDeferredValue(query);

  // Search first, then order. Both lists arrive shuffled, and "shuffle" hands
  // its input straight back — so while a search is running and no order has
  // been picked, what survives is the search's own relevance ranking.
  const foundOnRepeat = useMemo(
    () => sortTracks(searchTracks(onRepeat, deferredQuery), sort["on-repeat"]),
    [onRepeat, deferredQuery, sort],
  );
  const foundProduced = useMemo(
    () => sortTracks(searchTracks(produced, deferredQuery), sort.produced),
    [produced, deferredQuery, sort],
  );
  const searching = deferredQuery.trim().length > 0;

  return (
    <aside
      id={id}
      className="flex h-full w-full flex-col border-l border-white/10 bg-white/[0.05] backdrop-blur"
    >
      <div
        role="tablist"
        aria-label="library"
        className="flex shrink-0 gap-1 border-b border-white/10 px-3 py-3"
      >
        <TabButton
          id="on-repeat"
          active={tab === "on-repeat"}
          onSelect={setTab}
        >
          on repeat
        </TabButton>
        <TabButton id="produced" active={tab === "produced"} onSelect={setTab}>
          produced
        </TabButton>
        <TabButton
          id="recommend"
          active={tab === "recommend"}
          onSelect={setTab}
        >
          recommend
        </TabButton>
      </div>

      <TabNote
        id="library-note"
        tab={tab}
        // The whole list, not the filtered one. A header describes the
        // playlist; narrowing it with a search does not make it a shorter
        // playlist.
        tracks={tab === "produced" ? produced : onRepeat}
        // Never on the recommend tab: there is no list under it, so a song
        // count there would be describing the wrong thing entirely.
        counted={
          tab === "produced" ||
          (tab === "on-repeat" && onRepeatState === "ready")
        }
      />

      {/* Hidden on the recommend tab rather than disabled. Nothing there is
          searchable or sortable, and a dead search field above a form invites
          someone to type into the wrong box. */}
      {tab !== "recommend" && (
        <Filters
          query={query}
          onQuery={setQuery}
          sort={sort[tab]}
          onSort={(key) => setSort((current) => ({ ...current, [tab]: key }))}
        />
      )}

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
            <Header trailing="" />
            {foundProduced.map((track) => (
              <Row
                key={track.id}
                track={track}
                active={current?.id === track.id}
                playing={playing}
                onSelect={onSelect}
                subtitle={`${track.artist} · ${track.bpm} BPM`}
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

      <div
        role="tabpanel"
        id="panel-recommend"
        aria-labelledby="tab-recommend"
        aria-describedby="library-note"
        hidden={tab !== "recommend"}
        className="min-h-0 flex-1 overflow-y-auto"
      >
        <Recommend />
      </div>
    </aside>
  );
}

/**
 * What each tab is, in a line, with the longer thought under it.
 *
 * It sits outside the panels so it can hold still while they swap, which is
 * why every panel points its `aria-describedby` at it: read on its own it is
 * a floating sentence, but as the description of whichever panel is showing
 * it says the same thing to a screen reader that it says on screen.
 */
function TabNote({
  id,
  tab,
  tracks,
  counted,
}: {
  id: string;
  tab: Tab;
  tracks: Track[];
  /** False while the rotation is still loading, when a count would be a lie. */
  counted: boolean;
}) {
  const note = libraryNotes[tab];
  const seconds = tracks.reduce(
    (total, track) => total + (track.seconds ?? 0),
    0,
  );

  return (
    // Padded top and bottom, not just bottom: without it the kind line sits
    // flush against the rule under the tabs.
    <div id={id} className="shrink-0 px-3 pb-3.5 pt-3.5">
      {/* The category, set small and wide and quiet. It carries almost no
          information; what it does is establish that everything under it is
          one thing with a name, which is the job the word "playlist" does at
          the top of a playlist. */}
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">
        {note.kind}
      </p>

      {/* The one line that is allowed to be loud. */}
      <p className="mt-1.5 text-[15px] font-semibold leading-snug tracking-[-0.01em] text-white">
        {note.lead}
      </p>

      <p className="mt-1.5 text-[12.5px] leading-relaxed text-white/45">
        {note.body}
      </p>

      {counted && (
        /* Owner, then the numbers. The name is the only part in a brighter
           weight, so the line reads as "mine, and this much of it" rather than
           as three equal facts. */
        <p className="mt-2.5 text-[11.5px] text-white/35">
          <span className="font-medium text-white/70">{site.name}</span>
          <span aria-hidden="true"> · </span>
          <span className="tabular-nums">
            {tracks.length} {tracks.length === 1 ? "song" : "songs"}
          </span>
          {seconds > 0 && (
            <>
              <span aria-hidden="true"> · </span>
              <span className="tabular-nums">{runtime(seconds)}</span>
            </>
          )}
        </p>
      )}
    </div>
  );
}

/**
 * The two ways to narrow a tab, on one line: what it is, and what order it is
 * in. They share a row because they are the same gesture — neither changes
 * what the playlist *is*, which is why the header above counts the whole list
 * regardless of both.
 *
 * The search filters as it is typed. There is no submit, so the input is
 * deliberately not in a form and enter does nothing; escape clears it, which
 * is the one keystroke people expect a search field to answer for.
 */
function Filters({
  query,
  onQuery,
  sort,
  onSort,
}: {
  query: string;
  onQuery: (value: string) => void;
  sort: SortKey;
  onSort: (key: SortKey) => void;
}) {
  return (
    <div className="flex shrink-0 items-center gap-2 border-b border-white/10 px-3 py-2.5">
      <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg bg-white/[0.06] px-2.5 py-2 focus-within:bg-white/[0.09]">
        <SearchGlyph />
        <input
          type="search"
          value={query}
          onChange={(event) => onQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape") onQuery("");
          }}
          placeholder="search the crate"
          aria-label="search the library"
          // The webkit clear affordance sits in the middle of the dark field
          // as a light blob; escape and backspace already cover clearing.
          className="min-w-0 flex-1 bg-transparent text-[13px] text-white placeholder:text-white/35 focus:outline-none [&::-webkit-search-cancel-button]:hidden"
        />
      </div>
      <SortPicker value={sort} onChange={onSort} />
    </div>
  );
}

/**
 * A real <select>, not a custom menu: it is a single choice out of a short
 * fixed list, which is the one control the platform already does well — and
 * doing it natively is what makes it work with a keyboard, a screen reader
 * and a phone's wheel picker without any of that being written here.
 *
 * The options are painted dark explicitly. A styled <select> does not pass
 * its colours down to its own popup, so without it the list opens as black
 * text on white against everything around it.
 */
function SortPicker({
  value,
  onChange,
}: {
  value: SortKey;
  onChange: (key: SortKey) => void;
}) {
  return (
    <div className="relative shrink-0">
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as SortKey)}
        aria-label="order the library"
        className="cursor-pointer appearance-none rounded-lg bg-white/[0.06] py-2 pl-2.5 pr-7 text-[12.5px] text-white/70 hover:bg-white/[0.09] focus:outline-none focus-visible:bg-white/[0.09]"
      >
        {SORT_KEYS.map((key) => (
          <option key={key} value={key} className="bg-neutral-900 text-white">
            {SORT_LABELS[key]}
          </option>
        ))}
      </select>
      <ChevronGlyph />
    </div>
  );
}

function ChevronGlyph() {
  return (
    <svg
      width="9"
      height="9"
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-white/35"
    >
      <path d="M2.5 4.5L6 8l3.5-3.5" />
    </svg>
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
  onSelect,
  children,
}: {
  id: Tab;
  active: boolean;
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
      className={`rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors ${
        active
          ? "bg-white/[0.12] text-white"
          : "text-white/45 hover:bg-white/[0.06] hover:text-white/70"
      }`}
    >
      {children}
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
 * column differs: the album for a pulled track, and nothing at all for one of
 * mine, which has no album to name.
 */
function Row({
  track,
  active,
  playing,
  trailing,
  subtitle,
  onSelect,
}: {
  track: Track;
  active: boolean;
  playing: boolean;
  trailing?: string;
  /**
   * The line under the title, when the artist alone is not what belongs
   * there. Produced rows pass the tempo along with it: every one of them is
   * by me, so the name on its own says nothing the tab has not already said.
   */
  subtitle?: string;
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
          {subtitle ?? track.artist}
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
