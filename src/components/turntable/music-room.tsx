"use client";

import { useEffect, useRef, useState } from "react";
import { producedTracks, type Track } from "@/data/music";
import { Library } from "./library";
import { PlayerDock } from "./player-dock";
import { TurntableScene } from "./scene";
import { useBpm } from "./use-bpm";

type OnRepeatState = "loading" | "ready" | "unavailable";

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
  const [volume, setVolume] = useState(0.8);

  // Measured from the audio itself, and only used to set how fast the platter
  // turns. Null until it lands, or forever if the track cannot be read.
  const bpm = useBpm(track?.audioSrc);

  const [onRepeat, setOnRepeat] = useState<Track[]>([]);
  const [onRepeatState, setOnRepeatState] = useState<OnRepeatState>("loading");

  useEffect(() => {
    let stale = false;

    fetch("/api/on-repeat")
      .then((response) => response.json())
      .then(({ tracks }: { tracks: Track[] }) => {
        if (stale) return;
        setOnRepeat(tracks);
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

      <div className="h-72 shrink-0 sm:h-full sm:w-[24rem] md:w-[30rem]">
        <Library
          produced={producedTracks}
          onRepeat={onRepeat}
          onRepeatState={onRepeatState}
          current={track}
          playing={playing}
          onSelect={select}
        />
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
