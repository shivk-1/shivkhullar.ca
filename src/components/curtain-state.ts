/**
 * A black curtain that outlives the page underneath it.
 *
 * Going to the room used to be a hard cut: the main page vanished, /music
 * painted black, and the room faded up out of that. This closes the curtain
 * before navigating and opens it after, so the cut happens while the screen is
 * already black and nobody sees it.
 *
 * The state is a module singleton for the same reason room-ready is one: the
 * thing being coordinated outlives any one page. The curtain is rendered by the
 * root layout, which react keeps mounted across a client side navigation, so it
 * can stay closed *through* the route change and open again on the other side.
 * A context provider would work too, but there is exactly one curtain on the
 * page and a singleton says so.
 */

export type CurtainState = {
  /** True while the screen is covered. */
  closed: boolean;
  /** How long the move to the current state should take. */
  ms: number;
};

/** Leaving for the room, and arriving back at an ordinary page. */
export const FAST = 260;

/**
 * Leaving the room. Matches the fade the room itself comes up on, so the trip
 * out is the same length as the trip in.
 */
export const SLOW = 700;

const OPEN: CurtainState = { closed: false, ms: 0 };

let state: CurtainState = OPEN;
const listeners = new Set<() => void>();

export function curtainState() {
  return state;
}

/**
 * The server renders the curtain open, which is also how a cold load starts:
 * a page arrived at directly has nothing to fade out of, and covering it just
 * to uncover it would put a black frame in front of every first paint.
 */
export function serverCurtainState() {
  return OPEN;
}

export function subscribeCurtain(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function emit() {
  for (const listener of listeners) listener();
}

/** Covers the screen, resolving once it is actually black. */
export function closeCurtain(ms: number) {
  state = { closed: true, ms };
  emit();
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

/** Uncovers it. A no-op when it is already open, which is the common case. */
export function openCurtain(ms: number) {
  if (!state.closed) return;
  state = { closed: false, ms };
  emit();
}

function isRoom(path: string) {
  return path.startsWith("/music");
}

/**
 * How long to spend covering the screen on the way out of `from` toward `to`.
 *
 * Zero means this trip does not use the curtain at all, and the link is left to
 * navigate the way it always has. Only the room is worth covering: it is the
 * one page that arrives as a black screen either way, so it is the one place a
 * curtain can hide the change instead of adding a flash of black to it.
 */
export function exitMs(from: string, to: string) {
  if (isRoom(to) && !isRoom(from)) return FAST;
  if (isRoom(from) && !isRoom(to)) return SLOW;
  return 0;
}

/**
 * How long to spend uncovering it on arrival at `to`.
 *
 * Only ever consulted when the curtain is actually closed, since opening an
 * open one is a no-op — so this says nothing about trips that never covered
 * the screen in the first place, whatever it happens to return for them.
 *
 * The room gets zero: the page behind the curtain is black already, so there is
 * nothing to reveal, and dropping the curtain instantly hands the slow half of
 * the transition to the room's own fade rather than running two at once.
 */
export function entryMs(to: string) {
  return isRoom(to) ? 0 : FAST;
}

/**
 * Whether to animate at all. Someone who has asked their system for less motion
 * gets the old behaviour, which was a plain cut.
 */
export function motionWanted() {
  return (
    typeof window !== "undefined" &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}
