"use client";

import { useEffect, useState } from "react";

/**
 * Tempo detection, so the platter turns at the speed of whatever is playing.
 *
 * Spotify used to hand this over from `/audio-features`, but that endpoint was
 * closed to apps created after november 2024 in the same sweep that killed
 * `preview_url`. So the number is measured here instead: decode the audio,
 * strip everything above the kick, find the peaks, and take the interval that
 * turns up most often.
 */

/** Only the low end carries the pulse; everything above this is noise for us. */
const LOW_PASS_HZ = 160;
const HIGH_PASS_HZ = 30;

/** Analysis window. Long enough to be stable, short enough to stay cheap. */
const WINDOW_SECONDS = 45;

/**
 * Tempo is only known up to an octave, so intervals are folded into one range.
 * 75-150 sits where most music is actually felt, and keeps a ballad and a rap
 * track meaningfully far apart rather than collapsing them onto each other.
 */
const BPM_MIN = 75;
const BPM_MAX = 150;

/** Below this many agreeing intervals the answer is a guess, not a reading. */
const MIN_CONFIDENCE = 12;

/** Two decodes of the same url is pure waste, and tracks get replayed a lot. */
const cache = new Map<string, number | null>();
const inFlight = new Map<string, Promise<number | null>>();

/**
 * Rebuilds the signal through a band pass and hands back the rendered samples.
 * Offline rather than live: an OfflineAudioContext needs no user gesture and
 * runs faster than realtime, so this never fights the autoplay policy.
 */
async function isolateBeat(buffer: AudioBuffer) {
  const start = Math.min(buffer.duration * 0.2, 30);
  const seconds = Math.min(WINDOW_SECONDS, buffer.duration - start);
  const length = Math.max(1, Math.floor(seconds * buffer.sampleRate));

  const offline = new OfflineAudioContext(1, length, buffer.sampleRate);

  const source = offline.createBufferSource();
  source.buffer = buffer;

  const low = offline.createBiquadFilter();
  low.type = "lowpass";
  low.frequency.value = LOW_PASS_HZ;
  low.Q.value = 1;

  // Cuts subsonic rumble that would otherwise drift the envelope around.
  const high = offline.createBiquadFilter();
  high.type = "highpass";
  high.frequency.value = HIGH_PASS_HZ;
  high.Q.value = 1;

  source.connect(low);
  low.connect(high);
  high.connect(offline.destination);
  source.start(0, start, seconds);

  const rendered = await offline.startRendering();
  return rendered.getChannelData(0);
}

/**
 * Peaks above a threshold that walks down until enough of them show up, which
 * is what lets one pass handle both a compressed master and a quiet mix.
 */
function findPeaks(data: Float32Array, sampleRate: number) {
  let loudest = 0;
  for (let i = 0; i < data.length; i++) {
    const value = data[i];
    if (value > loudest) loudest = value;
  }
  if (loudest <= 0) return [];

  // Nothing musical beats faster than this, so a hit inside the gap is the
  // tail of the one before it rather than a new one.
  const gap = Math.floor(sampleRate * 0.22);

  let peaks: number[] = [];
  for (let cut = 0.9; cut >= 0.25 && peaks.length < 30; cut -= 0.05) {
    const threshold = loudest * cut;
    peaks = [];
    for (let i = 0; i < data.length; i++) {
      if (data[i] > threshold) {
        peaks.push(i);
        i += gap;
      }
    }
  }

  return peaks;
}

/**
 * Every peak is compared against the next few rather than only its neighbour:
 * a missed beat then costs one vote instead of poisoning the whole histogram.
 */
function tempoFrom(peaks: number[], sampleRate: number) {
  const votes = new Map<number, number>();

  for (let i = 0; i < peaks.length; i++) {
    for (let step = 1; step <= 10 && i + step < peaks.length; step++) {
      const seconds = (peaks[i + step] - peaks[i]) / sampleRate;
      if (seconds <= 0) continue;

      let bpm = 60 / seconds;
      while (bpm < BPM_MIN) bpm *= 2;
      while (bpm > BPM_MAX) bpm /= 2;
      if (bpm < BPM_MIN) continue;

      const bin = Math.round(bpm);
      votes.set(bin, (votes.get(bin) ?? 0) + 1);
    }
  }

  let best = 0;
  let bestScore = 0;
  for (const [bin] of votes) {
    // Pool the neighbours: a real tempo lands slightly either side of its bin,
    // and a lone spike is usually an artefact.
    const score =
      (votes.get(bin - 1) ?? 0) +
      (votes.get(bin) ?? 0) +
      (votes.get(bin + 1) ?? 0);
    if (score > bestScore) {
      bestScore = score;
      best = bin;
    }
  }

  return bestScore >= MIN_CONFIDENCE ? best : null;
}

async function detect(url: string): Promise<number | null> {
  const response = await fetch(url);
  if (!response.ok) return null;
  const encoded = await response.arrayBuffer();

  // A throwaway context purely to decode; the render context is sized after.
  const decoder = new OfflineAudioContext(1, 1, 44100);
  const buffer = await decoder.decodeAudioData(encoded);

  const samples = await isolateBeat(buffer);
  return tempoFrom(findPeaks(samples, buffer.sampleRate), buffer.sampleRate);
}

/**
 * Tempo of the track at `url`, or null while it is unknown — which covers both
 * "still working" and "could not tell". The deck treats both the same way, so
 * they do not need telling apart.
 */
export function useBpm(url?: string) {
  const [found, setFound] = useState<{
    url: string;
    bpm: number | null;
  } | null>(null);

  useEffect(() => {
    if (!url || cache.has(url)) return;

    let stale = false;

    const pending =
      inFlight.get(url) ??
      detect(url)
        // A deck that will not spin because a tempo could not be measured is
        // worse than a deck that spins at its nominal speed.
        .catch(() => null)
        .then((result) => {
          cache.set(url, result);
          inFlight.delete(url);
          return result;
        });

    inFlight.set(url, pending);
    void pending.then((bpm) => {
      if (!stale) setFound({ url, bpm });
    });

    return () => {
      stale = true;
    };
  }, [url]);

  if (!url) return null;
  // The cache is read during render rather than pushed into state by the
  // effect, so a track that has already been measured is at its own tempo on
  // the first frame instead of stepping up from the nominal one.
  const cached = cache.get(url);
  if (cached !== undefined) return cached;
  return found?.url === url ? found.bpm : null;
}
