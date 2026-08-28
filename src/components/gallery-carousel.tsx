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
 * Splits the photos into the slides the carousel steps through.
 *
 * The last slide is pulled back to sit flush against the end rather than
 * starting where the arithmetic says it should. Ten photos three at a time
 * leaves one on its own with two empty columns beside it; instead that slide
 * starts three from the end and overlaps the one before, so every slide is
 * full and the last photo still lands last.
 *
 * The cost is that the trailing photos appear twice across two slides, which
 * is the right trade: a repeat reads as a slide overlapping, a stub reads as
 * the page having run out of content.
 */
function paginate(photos: GalleryPhoto[]) {
  if (photos.length <= PER_PAGE) return photos.length > 0 ? [photos] : [];

  const pages: GalleryPhoto[][] = [];
  const last = photos.length - PER_PAGE;
  for (let start = 0; start < photos.length; start += PER_PAGE) {
    const from = Math.min(start, last);
    pages.push(photos.slice(from, from + PER_PAGE));
  }
  return pages;
}

export function GalleryCarousel() {
  const pages = paginate(gallery);
  const track = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(0);
  const [active, setActive] = useState<GalleryPhoto | null>(null);

  if (pages.length === 0) return null;

  /**
   * A slide is one viewport wide, and the track's own gap keeps the last photo
   * of one slide off the first photo of the next, so a page is that gap wider
   * than the visible strip.
   */
  const stepWidth = (el: HTMLDivElement) =>
    el.clientWidth + (parseFloat(getComputedStyle(el).columnGap) || 0);

  /**
   * Clamped rather than wrapping. The arrows now disappear at the ends, so
   * there is no way to ask for a step past them, and wrapping from the last
   * slide back to the first would contradict what the controls are showing.
   * Free scrolling can leave the strip between two slides, so this steps off
   * the nearest one.
   */
  const go = (delta: number) => {
    const el = track.current;
    if (!el) return;
    const next = Math.min(pages.length - 1, Math.max(0, page + delta));
    if (next === page) return;
    el.scrollTo({ left: next * stepWidth(el), behavior: "smooth" });
    setPage(next);
  };

  const syncPage = () => {
    const el = track.current;
    if (!el) return;
    setPage(Math.round(el.scrollLeft / stepWidth(el)));
  };

  return (
    <div>
      {/*
        Arrows flank the strip instead of sitting under it, so they read as
        controls for the photos rather than another line of section furniture.
        They are centred on the whole track, captions included.
      */}
      <div className="flex items-center gap-2 sm:gap-4">
        {pages.length > 1 && (
          <NavButton
            label="previous photos"
            onClick={() => go(-1)}
            hidden={page === 0}
          >
            ←
          </NavButton>
        )}

        <div
          ref={track}
          onScroll={syncPage}
          // min-w-0 or the flex item refuses to shrink below its content and
          // the track pushes the arrows off the edge instead of scrolling.
          className="no-scrollbar flex min-w-0 flex-1 gap-3 overflow-x-auto overscroll-x-contain scroll-smooth sm:gap-5"
        >
          {pages.map((photos, index) => (
            <div
              key={index}
              className="grid w-full shrink-0 grid-cols-3 gap-3 sm:gap-5"
            >
              {photos.map((photo) => (
                <figure key={photo.src}>
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
          ))}
        </div>

        {pages.length > 1 && (
          <NavButton
            label="next photos"
            onClick={() => go(1)}
            hidden={page === pages.length - 1}
          >
            →
          </NavButton>
        )}
      </div>

      {pages.length > 1 && (
        <p className="mt-5 text-center text-sm text-muted tabular-nums">
          {page + 1} / {pages.length}
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
