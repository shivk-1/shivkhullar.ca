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
  const [libraryOpen, setLibraryOpen] = useState(true);
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
    // The element picks up the new src on the next render, so play once the
    // browser says it can actually start.
    setPlaying(true);
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
    <div className="flex h-full w-full flex-col sm:flex-row">
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
      <div className="relative min-h-0 min-w-0 flex-1">
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

        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col items-center gap-3 p-4 sm:p-6">
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
          <p className="text-[11px] text-white/35">
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
        className={`relative shrink-0 transition-[height,width] duration-300 ease-out sm:h-full ${
          libraryOpen
            ? "h-72 sm:w-[24rem] md:w-[30rem]"
            : "h-0 sm:w-0"
        }`}
      >
        <button
          type="button"
          onClick={() => setLibraryOpen((open) => !open)}
          aria-expanded={libraryOpen}
          aria-controls="library"
          aria-label={libraryOpen ? "collapse the library" : "open the library"}
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
          className={`group absolute z-20 grid select-none place-items-center pt-2 [touch-action:manipulation] sm:pb-0 sm:pl-2 sm:pt-0 ${
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
        <div className="h-full w-full overflow-hidden" inert={!libraryOpen}>
          <div className="h-full w-full sm:w-[24rem] md:w-[30rem]">
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
        src={track?.audioSrc}
        preload="metadata"
        onCanPlay={(event) => {
          if (playing) void event.currentTarget.play();
        }}
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
