"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { gallery, type GalleryPhoto } from "@/data/gallery";

const PER_PAGE = 3;

/** `size-8` in pixels. Only the arrow offset needs it as a number. */
const BUTTON_SIZE = 32;

/** "2024-07-21" -> "jul 2024". Matches the date style used in experience. */
function formatDate(iso: string) {
  return new Date(`${iso}T00:00:00`)
    .toLocaleDateString("en-US", { month: "short", year: "numeric" })
    .toLowerCase();
}

/**
 * The photo index each step of the carousel lands on.
 *
 * The strip is one continuous row, not a set of slides, and the arrows scroll
 * it a page at a time. The last step is the exception: rather than advancing
 * another full page and running off the end, it stops three from the end, so
 * it travels only the distance needed to bring the remaining photos into view.
 * Ten photos give 0, 3, 6, 7 - the final step shifts by one, not three.
 *
 * That keeps every photo in the dom exactly once. Paging it into slides and
 * padding the short one meant repeating photos to fill it; here the same
 * elements simply stop at a different offset.
 */
const STOPS: number[] = (() => {
  if (gallery.length <= PER_PAGE) return [0];
  const last = gallery.length - PER_PAGE;
  const out: number[] = [];
  for (let i = 0; i < gallery.length; i += PER_PAGE)
    out.push(Math.min(i, last));
  return [...new Set(out)];
})();

export function GalleryCarousel() {
  const track = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState(0);
  const [active, setActive] = useState<GalleryPhoto | null>(null);

  /**
   * The offset an arrow-driven scroll is heading for, while it is still
   * moving. Null when the strip is wherever the reader left it.
   */
  const heading = useRef<number | null>(null);
  const settle = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (settle.current !== null) clearTimeout(settle.current);
    },
    [],
  );

  /**
   * Height of one photo, which is what the arrows line up against.
   *
   * Measured rather than derived. The number is knowable in css - the photos
   * are a fixed aspect of a third of the track - but writing it out means
   * restating the track's width, both gaps and the arrow column as one
   * expression, and every one of those is set somewhere else in this file.
   * An observer costs a few lines and cannot drift out of step with them.
   *
   * Zero until it has been read, which is the pre-hydration state; the arrows
   * fall back to centring on the whole row there, and the correction on the
   * frame after is roughly half a caption.
   */
  const [photoHeight, setPhotoHeight] = useState(0);

  useEffect(() => {
    const photo = track.current?.querySelector("figure > button");
    if (!photo) return;

    // The border box, not `contentRect`: the photos are bordered, and the
    // content box is the two pixels of that border short of what is actually
    // on screen to line up with.
    const observer = new ResizeObserver(([entry]) =>
      setPhotoHeight(
        entry.borderBoxSize?.[0]?.blockSize ??
          photo.getBoundingClientRect().height,
      ),
    );
    observer.observe(photo);
    return () => observer.disconnect();
  }, []);

  if (gallery.length === 0) return null;

  /**
   * Width of one photo plus the gap after it, which is what a single index of
   * travel costs. Three photos and the two gaps between them fill the strip,
   * so one photo is (width - 2 gaps) / 3 and the pitch is that plus a gap,
   * which reduces to (width + gap) / 3.
   */
  const photoStep = (el: HTMLDivElement) => {
    const gap = parseFloat(getComputedStyle(el).columnGap) || 0;
    return (el.clientWidth + gap) / PER_PAGE;
  };

  /**
   * Clamped rather than wrapping. The arrows disappear at the ends, so there
   * is no way to ask for a step past them, and wrapping from the last stop
   * back to the first would contradict what the controls are showing.
   */
  const go = (delta: number) => {
    const el = track.current;
    if (!el) return;
    const next = Math.min(STOPS.length - 1, Math.max(0, step + delta));
    if (next === step) return;

    heading.current = STOPS[next];
    el.scrollTo({ left: STOPS[next] * photoStep(el), behavior: "smooth" });
    setStep(next);

    // Backstop, in case the strip never quite reaches the target and the
    // arrival below therefore never fires: an interrupted scroll must not
    // leave the reader's own scrolling permanently ignored.
    if (settle.current !== null) clearTimeout(settle.current);
    settle.current = window.setTimeout(() => {
      heading.current = null;
      settle.current = null;
    }, 700);
  };

  /**
   * Free scrolling can leave the strip anywhere, and the stops are not evenly
   * spaced any more, so this picks the nearest one rather than rounding.
   *
   * It stays out of the way while an arrow is driving. A smooth scroll fires
   * this on every frame of its animation, and for the first half of the
   * journey the strip is still nearer the stop it is leaving than the one it
   * is heading for, so re-deriving the step mid-flight drove it backwards and
   * then forwards again. That was one frame of the arrow appearing, a stretch
   * of it gone, then it returning: the flicker.
   */
  const syncStep = () => {
    const el = track.current;
    if (!el) return;
    const at = el.scrollLeft / photoStep(el);

    if (heading.current !== null) {
      if (Math.abs(at - heading.current) < 0.02) {
        heading.current = null;
        if (settle.current !== null) {
          clearTimeout(settle.current);
          settle.current = null;
        }
      }
      return;
    }

    let nearest = 0;
    STOPS.forEach((stop, i) => {
      if (Math.abs(stop - at) < Math.abs(STOPS[nearest] - at)) nearest = i;
    });
    setStep(nearest);
  };

  return (
    <div>
      {/*
        Arrows flank the strip instead of sitting under it, so they read as
        controls for the photos rather than another line of section furniture.

        Aligned to the top of the row rather than its middle, because the row
        is a photo plus its caption and centring on the pair leaves the arrows
        sitting low against the images they point at. Each one is dropped back
        to the middle of the photo alone by the offset below.
      */}
      <div className="flex items-start gap-2 sm:gap-4">
        {STOPS.length > 1 && (
          <NavButton
            label="previous photos"
            onClick={() => go(-1)}
            centreOn={photoHeight}
            hidden={step === 0}
          >
            ←
          </NavButton>
        )}

        <div
          ref={track}
          onScroll={syncStep}
          // min-w-0 or the flex item refuses to shrink below its content and
          // the track pushes the arrows off the edge instead of scrolling.
          className="no-scrollbar flex min-w-0 flex-1 gap-3 overflow-x-auto overscroll-x-contain scroll-smooth sm:gap-5"
        >
          {gallery.map((photo) => (
            /*
              Three across the visible strip: two gaps sit between them, so a
              photo is a third of what is left once those are taken out. The
              track's own gap does the spacing, and shrink-0 stops flex from
              compressing them to fit instead of overflowing into a scroll.
            */
            <figure
              key={photo.src}
              className="w-[calc((100%-1.5rem)/3)] shrink-0 sm:w-[calc((100%-2.5rem)/3)]"
            >
              <button
                type="button"
                onClick={() => setActive(photo)}
                aria-label={`open photo: ${photo.caption}`}
                className="relative block aspect-4/3 w-full cursor-zoom-in overflow-hidden rounded-md border border-border bg-background"
              >
                <Image
                  src={photo.src}
                  alt={photo.caption}
                  fill
                  sizes="(min-width: 640px) 240px, 30vw"
                  draggable={false}
                  className="object-cover"
                />
              </button>
              <figcaption className="mt-2 text-[13px] leading-relaxed text-muted sm:text-sm">
                {photo.caption}{" "}
                {/* Dimmer than the caption so the date reads as a footnote
                    to it rather than as part of the sentence. */}
                <span className="text-muted/70 tabular-nums">
                  {formatDate(photo.date)}
                </span>
              </figcaption>
            </figure>
          ))}
        </div>

        {STOPS.length > 1 && (
          <NavButton
            label="next photos"
            onClick={() => go(1)}
            centreOn={photoHeight}
            hidden={step === STOPS.length - 1}
          >
            →
          </NavButton>
        )}
      </div>

      {STOPS.length > 1 && (
        <p className="mt-5 text-center text-sm text-muted tabular-nums">
          {step + 1} / {STOPS.length}
        </p>
      )}

      <Lightbox photo={active} onClose={() => setActive(null)} />
    </div>
  );
}

/**
 * Native <dialog> so escape, focus trapping and inertness come from the
 * platform. Clicking the backdrop is a click on the dialog element itself.
 */
function Lightbox({
  photo,
  onClose,
}: {
  photo: GalleryPhoto | null;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);

  /**
   * `photo` goes null the instant the dialog is dismissed, which would strip
   * the image out a frame before the fade-out had run and leave an empty box
   * dissolving. This holds the last one so it stays on screen for the way out,
   * and is deliberately never cleared.
   *
   * State rather than a ref: a ref read during render does not re-render when
   * it changes, so the picture could lag a frame behind the one that was
   * clicked. Assigning during render is the documented way to derive state
   * from props, and costs one extra pass before anything is painted.
   */
  const [shown, setShown] = useState(photo);
  if (photo !== null && photo !== shown) setShown(photo);

  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    if (photo && !el.open) el.showModal();
    if (!photo && el.open) el.close();
  }, [photo]);

  // showModal only blocks scroll chaining, not the page scroll behind it.
  useEffect(() => {
    if (!photo) return;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
    };
  }, [photo]);

  return (
    <dialog
      ref={dialog}
      onClose={onClose}
      // Anywhere outside the photo is backdrop as far as the eye is concerned,
      // including the letterboxing around a tall or wide image.
      onClick={onClose}
      className="lightbox m-auto max-h-none max-w-none bg-transparent p-4 backdrop:bg-black/70 sm:p-8"
    >
      {shown && (
        <figure className="flex cursor-zoom-out flex-col items-center gap-4">
          <div className="relative h-[70vh] w-[88vw] max-w-5xl">
            <Image
              src={shown.src}
              alt={shown.caption}
              fill
              sizes="88vw"
              priority
              className="object-contain"
            />
          </div>
          <figcaption className="max-w-2xl text-center text-sm leading-relaxed text-white/80">
            {shown.caption}
          </figcaption>
        </figure>
      )}
    </dialog>
  );
}

/**
 * `hidden` here means invisible but still occupying its slot, not unmounted.
 * Removing the element would hand its width back to the strip and shove every
 * photo sideways on the first and last slide, so the arrow goes transparent
 * instead and the row stays put. It leaves the tab order and the a11y tree
 * with it, so nothing offers a step that cannot be taken.
 */
function NavButton({
  label,
  onClick,
  centreOn,
  hidden = false,
  children,
}: {
  label: string;
  onClick: () => void;
  /**
   * Height of the photos beside it. The button is pushed down by half of
   * what is left after its own height, which puts its middle on theirs.
   * Zero means it has not been measured yet, and the button stays centred on
   * the row the way it was before.
   */
  centreOn: number;
  hidden?: boolean;
  children: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      disabled={hidden}
      aria-hidden={hidden || undefined}
      tabIndex={hidden ? -1 : undefined}
      style={
        centreOn > 0 ? { marginTop: (centreOn - BUTTON_SIZE) / 2 } : undefined
      }
      className={`flex size-8 shrink-0 items-center justify-center rounded-full border border-border text-muted transition-colors hover:text-foreground ${
        centreOn > 0 ? "" : "self-center"
      } ${hidden ? "invisible" : ""}`}
    >
      {children}
    </button>
  );
}
