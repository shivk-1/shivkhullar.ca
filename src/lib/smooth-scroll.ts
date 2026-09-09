/**
 * Animated scroll to an element, used by the contents links on a post.
 *
 * Not `scroll-behavior: smooth`. The css property works, but the curve and
 * the duration are the browser's: chrome eases out of a long jump over most
 * of a second, which on a short hop between two adjacent sections feels like
 * waiting. Driving it here means the same gesture can be quick over a short
 * distance and still not slam to a stop over a long one.
 */

/**
 * Slow, fast, slow. The middle of the curve is roughly four times the speed
 * of the ends, so a long jump reads as travel rather than as a cut, and the
 * arrival settles instead of stopping dead.
 */
function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

/**
 * How long the trip takes, as a function of how far it is.
 *
 * A fixed duration is wrong in both directions: it crawls across a short hop
 * and blurs a long one. Scaling by distance keeps the apparent speed roughly
 * constant, and the clamps stop either extreme — a heading just below the
 * fold still gets enough time to read as a movement, and a jump to the end of
 * a long post does not become a journey.
 */
function durationFor(distance: number) {
  return Math.min(900, Math.max(380, distance * 0.4));
}

/** Where the page would have to be scrolled to for `target` to sit at the top,
    honouring the scroll-margin the headings already carry so the animation
    lands exactly where a native jump would have. */
function destinationOf(target: HTMLElement) {
  const margin = parseFloat(getComputedStyle(target).scrollMarginTop) || 0;
  const top = window.scrollY + target.getBoundingClientRect().top - margin;
  const furthest = document.documentElement.scrollHeight - window.innerHeight;
  return Math.max(0, Math.min(top, furthest));
}

/** The animation in flight, so a second click retargets rather than fighting
    the first one frame for frame. */
let running: number | null = null;

function cancel() {
  if (running !== null) cancelAnimationFrame(running);
  running = null;
}

/**
 * Scrolls to `id` and leaves the keyboard there.
 *
 * The focus move is the part that is easy to skip and shouldn't be: a native
 * `#hash` link moves focus to the target, so tabbing afterwards continues
 * from the new section. Cancelling the default and animating instead throws
 * that away unless it is put back by hand.
 */
export function scrollToHeading(id: string) {
  const target = document.getElementById(id);
  if (!target) return;

  cancel();

  const land = () => {
    // Made focusable only now, and left that way: a heading with a permanent
    // tabindex would otherwise be a stop on every pass through the document.
    target.setAttribute("tabindex", "-1");
    target.focus({ preventScroll: true });
    // pushState rather than assigning location.hash, which would jump the
    // page a second time and undo the animation that just finished. Pushed
    // rather than replaced so back returns to where the reader was.
    history.pushState(null, "", `#${id}`);
  };

  const to = destinationOf(target);
  const from = window.scrollY;
  const distance = to - from;

  // Someone who has asked for less motion has asked for exactly this: the
  // destination, without the trip.
  const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (still || Math.abs(distance) < 2) {
    window.scrollTo(0, to);
    land();
    return;
  }

  const duration = durationFor(Math.abs(distance));
  const start = performance.now();

  /**
   * Any scroll of their own abandons the animation where it stands. Fighting
   * a reader for the scroll position is the one way an effect like this
   * becomes genuinely unpleasant, and someone who reaches for the wheel
   * mid-flight has already changed their mind.
   */
  const abandon = () => {
    cancel();
    detach();
  };
  const detach = () => {
    window.removeEventListener("wheel", abandon);
    window.removeEventListener("touchstart", abandon);
  };
  window.addEventListener("wheel", abandon, { passive: true, once: true });
  window.addEventListener("touchstart", abandon, { passive: true, once: true });

  const step = (now: number) => {
    const progress = Math.min(1, (now - start) / duration);
    window.scrollTo(0, from + distance * easeInOutCubic(progress));

    if (progress < 1) {
      running = requestAnimationFrame(step);
      return;
    }

    running = null;
    detach();
    land();
  };

  running = requestAnimationFrame(step);
}
