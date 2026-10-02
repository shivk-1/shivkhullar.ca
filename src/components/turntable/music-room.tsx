"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { producedTracks, type ProducedTrack, type Track } from "@/data/music";
import { Library } from "./library";
import { PlayerDock } from "./player-dock";
import { TurntableScene } from "./scene";
import { shuffle } from "./sort";
import { useBpm } from "./use-bpm";
import { useSheet } from "./use-sheet";

type OnRepeatState = "loading" | "ready" | "unavailable";

/** The crate order never changes after the first paint, so there is nothing
    to subscribe to. */
const never = () => () => {};

/**
 * Owns the one <audio> element on the page and the state the deck animates
 * from. Deliberately not a context: nothing about this player should survive
 * leaving /music.
 */
export function MusicRoom() {
  const audio = useRef<HTMLAudioElement>(null);

  const [track, setTrack] = useState<Track | null>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [rpm, setRpm] = useState(33);
  const {
    sheet,
    drag,
    toggle: toggleLibrary,
    toggleFull,
    handlers: sheetHandlers,
  } = useSheet();
  const libraryOpen = sheet !== "closed";
  const [volume, setVolume] = useState(0.8);

  // Measured from the audio itself, and only used to set how fast the platter
  // turns. Null until it lands, or forever if the track cannot be read.
  const bpm = useBpm(track?.audioSrc);

  const [onRepeat, setOnRepeat] = useState<Track[]>([]);
  const [onRepeatState, setOnRepeatState] = useState<OnRepeatState>("loading");

  /**
   * Both crates land in a fresh order on every visit, so the tab is never the
   * same wall of rows twice and nothing is permanently buried at the bottom.
   *
   * The rotation is shuffled where it arrives rather than in the route: that
   * response is revalidated daily, and shuffling behind the cache would pick
   * one order and hold it for the day.
   *
   * My own list has no fetch to hide behind — it is server rendered, so a
   * shuffle during render would hand the client a different list than the html
   * it is hydrating. The store below is the sanctioned way to say that: the
   * server and the first hydration pass both read the file's order, and the
   * client swaps to the shuffled one on the render straight after.
   */
  const shuffled = useMemo(() => shuffle(producedTracks), []);
  const produced = useSyncExternalStore<ProducedTrack[]>(
    never,
    () => shuffled,
    () => producedTracks,
  );

  useEffect(() => {
    let stale = false;

    fetch("/api/on-repeat")
      .then((response) => response.json())
      .then(({ tracks }: { tracks: Track[] }) => {
        if (stale) return;
        setOnRepeat(shuffle(tracks));
        // The route answers 200 with an empty list when the lookup failed,
        // so an empty list is the signal rather than a status code.
        setOnRepeatState(tracks.length > 0 ? "ready" : "unavailable");
      })
      .catch(() => {
        if (!stale) setOnRepeatState("unavailable");
      });

    return () => {
      stale = true;
    };
  }, []);

  useEffect(() => {
    if (audio.current) audio.current.volume = volume;
  }, [volume]);

  const select = (next: Track) => {
    if (next.id === track?.id) {
      toggle();
      return;
    }

    setTrack(next);
    setTime(0);
    setDuration(0);

    const el = audio.current;
    if (!el) return;
    // Set and started here, inside the tap, not on a later render. iOS only
    // lets audio start from within the gesture that asked for it, and with
    // preload it may never fire canplay until something calls play() — so
    // waiting for canplay to start the track left it silent on a phone. The
    // src is also kept off the element's props for the same reason: React
    // writing it again on the next render would reload the track it just
    // started.
    el.src = next.audioSrc;
    el.play().catch(() => setPlaying(false));
  };

  const toggle = () => {
    const el = audio.current;
    if (!el || !track) return;
    if (el.paused) {
      void el.play();
    } else {
      el.pause();
    }
  };

  const seek = (seconds: number) => {
    if (!audio.current) return;
    audio.current.currentTime = seconds;
    setTime(seconds);
  };

  return (
    <div className="relative flex h-full w-full flex-col sm:flex-row">
      {/* min-w-0 is load bearing, not tidiness. The canvas is sized in pixels
          by r3f from whatever this box measures, so once the crate collapses
          and the canvas grows to fill the row, that pixel width becomes this
          item's intrinsic content width — and a flex item defaults to
          `min-width: auto`, which refuses to shrink below it. Without this the
          room grows when the crate closes and then will not give the width
          back when it reopens, pushing the crate off the side of the page. */}
      {/* min-w-0 is load bearing, not tidiness. r3f sizes the canvas in pixels
          from whatever this box measures, so once the crate closes and the
          canvas grows to fill the row, that pixel width becomes this item's
          intrinsic content width — and a flex item defaults to
          `min-width: auto`, which refuses to shrink below its content. Without
          it the room keeps the full width when the crate reopens, the row adds
          up to more than the window, and the crate comes back off the right
          hand edge of the page where nothing can reach it. */}
      {/* On a phone the crate is a sheet laid over the bottom of this column
          rather than a row below it, so it can be pulled up over the room
          without the canvas being resized under the finger. The padding is
          what keeps the room and dock clear of it at its resting height. */}
      <div
        className={`relative flex min-h-0 min-w-0 flex-1 flex-col transition-[padding] duration-300 ease-out sm:pb-0 ${
          libraryOpen ? "pb-72" : "pb-0"
        }`}
      >
        <div className="relative min-h-0 flex-1">
          <TurntableScene
            playing={playing}
            rpm={rpm}
            bpm={bpm}
            // Guarded: duration is NaN until metadata lands, and NaN would put
            // the stylus nowhere.
            progress={duration > 0 ? time / duration : 0}
            artwork={track?.artwork}
            message={track?.message}
          />

          {/* On a phone the hint sits on the room itself, since the dock has
              moved out from under it. */}
          <p className="pointer-events-none absolute inset-x-0 bottom-2 text-center text-[11px] text-white/35 sm:hidden">
            drag to rotate · pinch to zoom
          </p>
        </div>

        {/* Floated over the room on a desk, where there is room to spare
            around it. On a phone it is its own strip under the room instead:
            overlaid, it covered most of a canvas that is only a few hundred
            pixels tall, and a drag that lands on the dock never reaches the
            orbit controls. */}
        <div className="pointer-events-none flex shrink-0 flex-col items-center gap-3 px-3 pb-3 pt-1 sm:absolute sm:inset-x-0 sm:bottom-0 sm:p-6">
          <PlayerDock
            track={track}
            playing={playing}
            time={time}
            duration={duration}
            rpm={rpm}
            volume={volume}
            onToggle={toggle}
            onSeek={seek}
            onRpm={setRpm}
            onVolume={setVolume}
          />
          <p className="hidden text-[11px] text-white/35 sm:block">
            drag to rotate · scroll to zoom
          </p>
        </div>
      </div>

      {/* The crate, and the tab that pulls it out of the way.

          Collapsing is a width (a height, on a phone) rather than an unmount:
          the list keeps its scroll position, its tab and whatever was typed
          into its search, so putting it away and bringing it back is free
          rather than something you have to redo. Nothing here tells the scene
          it grew — the canvas is measured from its own box, and the camera
          orbits a fixed point, so widening the box re-centres the room on its
          own. */}
      <div
        {...sheetHandlers}
        className={`absolute inset-x-0 bottom-0 z-20 shrink-0 ease-out sm:relative sm:inset-auto sm:z-auto sm:h-full ${
          drag === null ? "transition-[height,width] duration-300" : ""
        } ${
          sheet === "full"
            ? "h-[calc(100dvh-4.5rem)] sm:w-[24rem] md:w-[30rem]"
            : sheet === "open"
              ? "h-72 sm:w-[24rem] md:w-[30rem]"
              : "h-0 sm:w-0"
        }`}
        // Only ever set on a phone, which is the only place a drag starts.
        style={drag === null ? undefined : { height: drag }}
      >
        <button
          type="button"
          onClick={toggleLibrary}
          data-sheet-handle
          aria-expanded={libraryOpen}
          aria-controls="library"
          aria-label={libraryOpen ? "collapse the library" : "open the library"}
          // Desk only. A phone pulls the crate by the grab bar inside it.
          //
          // Hung off the panel's own edge rather than placed on the page, so
          // it travels with the panel and is always the thing nearest to what
          // it controls.
          //
          // The padding is the point: the tab is a five millimetre sliver, and
          // once the crate is closed that sliver is against the edge of the
          // window with the room behind it, where a miss of two pixels is a
          // click on the deck instead. The padded box is the target; the span
          // inside is only what you can see. The margin then holds the whole
          // thing off the window edge while it is closed, so there is somewhere
          // to miss into.
          className={`group absolute z-20 hidden select-none place-items-center sm:grid sm:pl-2 sm:[touch-action:manipulation] ${
            libraryOpen ? "" : "-mt-2 sm:ml-[-0.5rem] sm:mt-0"
          } left-1/2 top-0 -translate-x-1/2 -translate-y-full sm:left-0 sm:top-1/2 sm:-translate-x-full sm:-translate-y-1/2`}
        >
          <span className="grid h-5 w-11 place-items-center rounded-t-lg border border-b-0 border-white/10 bg-white/[0.08] text-white/50 backdrop-blur transition-colors group-hover:bg-white/[0.16] group-hover:text-white/90 sm:h-11 sm:w-5 sm:rounded-l-lg sm:rounded-tr-none sm:border-b sm:border-r-0">
            {/* One glyph, pointed at wherever the panel is about to go: down
                and up on a phone, where the crate is a drawer under the room,
                and right and left on a desk, where it is a column beside it. */}
            <ChevronsGlyph
              className={`transition-transform duration-300 ${
                libraryOpen
                  ? "rotate-90 sm:rotate-0"
                  : "-rotate-90 sm:rotate-180"
              }`}
            />
          </span>
        </button>

        {/* Clipped, and taken out of the tab order while it is closed: a
            column of buttons you cannot see is still a column of buttons a
            keyboard will walk through. */}
        {/* Solid on a phone, where the sheet can sit over the room and a
            see-through list on top of a lit scene is unreadable. */}
        <div
          className="flex h-full w-full flex-col overflow-hidden rounded-t-2xl bg-[#0c0c0d] sm:rounded-none sm:bg-transparent"
          inert={!libraryOpen}
        >
          {/* The phone's handle, in place of the desk's tab: the bar every
              iOS sheet has, which says "pull me" without words. */}
          <button
            type="button"
            data-sheet-handle
            onClick={toggleFull}
            aria-expanded={sheet === "full"}
            aria-controls="library"
            aria-label={
              sheet === "full" ? "shrink the library" : "expand the library"
            }
            className="flex w-full touch-none justify-center pb-1 pt-2.5 sm:hidden"
          >
            <span className="h-1 w-9 rounded-full bg-white/25" />
          </button>
          <div className="min-h-0 w-full flex-1 sm:w-[24rem] md:w-[30rem]">
            <Library
              id="library"
              produced={produced}
              onRepeat={onRepeat}
              onRepeatState={onRepeatState}
              current={track}
              playing={playing}
              onSelect={select}
            />
          </div>
        </div>
      </div>

      <audio
        ref={audio}
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onTimeUpdate={(event) => setTime(event.currentTarget.currentTime)}
        onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)}
        onEnded={() => {
          setPlaying(false);
          setTime(0);
        }}
      />
    </div>
  );
}

/** The `»` on the tab, drawn rather than typed so it takes the panel's stroke
    weight instead of whatever the body font has for the character. */
function ChevronsGlyph({ className }: { className?: string }) {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M2.5 2.5L6 6l-3.5 3.5" />
      <path d="M6.5 2.5L10 6l-3.5 3.5" />
    </svg>
  );
}
