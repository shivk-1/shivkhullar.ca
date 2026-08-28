"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { gallery, type GalleryPhoto } from "@/data/gallery";

const PER_PAGE = 3;

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
    el.scrollTo({ left: STOPS[next] * photoStep(el), behavior: "smooth" });
    setStep(next);
  };

  /**
   * Free scrolling can leave the strip anywhere, and the stops are not evenly
   * spaced any more, so this picks the nearest one rather than rounding.
   */
  const syncStep = () => {
    const el = track.current;
    if (!el) return;
    const at = el.scrollLeft / photoStep(el);
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
        They are centred on the whole track, captions included.
      */}
      <div className="flex items-center gap-2 sm:gap-4">
        {STOPS.length > 1 && (
          <NavButton
            label="previous photos"
            onClick={() => go(-1)}
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
      className="m-auto max-h-none max-w-none bg-transparent p-4 backdrop:bg-black/70 sm:p-8"
    >
      {photo && (
        <figure className="flex cursor-zoom-out flex-col items-center gap-4">
          <div className="relative h-[70vh] w-[88vw] max-w-5xl">
            <Image
              src={photo.src}
              alt={photo.caption}
              fill
              sizes="88vw"
              priority
              className="object-contain"
            />
          </div>
          <figcaption className="max-w-2xl text-center text-sm leading-relaxed text-white/80">
            {photo.caption}
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
  hidden = false,
  children,
}: {
  label: string;
  onClick: () => void;
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
      className={`flex size-8 shrink-0 items-center justify-center rounded-md border border-border text-muted transition-colors hover:text-foreground ${
        hidden ? "invisible" : ""
      }`}
    >
      {children}
    </button>
  );
}
