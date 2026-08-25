/**
 * A one-bit signal from inside the canvas to the fade wrapping it.
 *
 * It is a module-level store rather than a context because react-three-fiber
 * runs its own reconciler: the scene graph is a separate react root, and a
 * provider outside the canvas is not visible to components inside it. A
 * singleton is also honest about what this is — there is one room on the page.
 */

let ready = false;
const listeners = new Set<() => void>();

export function isRoomReady() {
  return ready;
}

/** Called from inside the canvas, once the room has actually been drawn. */
export function markRoomReady() {
  if (ready) return;
  ready = true;
  for (const listener of listeners) listener();
}

/** Lets the room fade in again on a fresh visit to the page. */
export function resetRoomReady() {
  ready = false;
}

export function subscribeRoomReady(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
