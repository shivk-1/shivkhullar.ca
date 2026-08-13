"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type PointerEvent } from "react";
import { gallery, type GalleryPhoto } from "@/data/gallery";

const PER_PAGE = 3;

/** Splits the photos into the slides the carousel steps through. */
function paginate(photos: GalleryPhoto[]) {
  const pages: GalleryPhoto[][] = [];
  for (let i = 0; i < photos.length; i += PER_PAGE) {
    pages.push(photos.slice(i, i + PER_PAGE));
  }
  return pages;
}

export function GalleryCarousel() {
  const pages = paginate(gallery);
  const track = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [active, setActive] = useState<GalleryPhoto | null>(null);
  const drag = useRef({ startX: 0, startScroll: 0, moved: false });

  if (pages.length === 0) return null;

  /** Wraps at both ends so the arrows never dead-end. */
  const go = (delta: number) => {
    const el = track.current;
    if (!el) return;
    const next = (page + delta + pages.length) % pages.length;
    el.scrollTo({ left: next * el.clientWidth, behavior: "smooth" });
    setPage(next);
  };

  const syncPage = () => {
    const el = track.current;
    if (!el) return;
    setPage(Math.round(el.scrollLeft / el.clientWidth));
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    const el = track.current;
    // Touch and pen already scroll this natively; only mice need the drag.
    if (!el || event.pointerType !== "mouse") return;
    drag.current = {
      startX: event.clientX,
      startScroll: el.scrollLeft,
      moved: false,
    };
    setDragging(true);
    el.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const el = track.current;
    if (!dragging || !el) return;
    const dx = event.clientX - drag.current.startX;
    if (Math.abs(dx) > 3) drag.current.moved = true;
    el.scrollLeft = drag.current.startScroll - dx;
  };

  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const el = track.current;
    if (!dragging || !el) return;
    setDragging(false);
    el.releasePointerCapture(event.pointerId);
    // Snapping is off mid-drag, so settle on the nearest slide by hand.
    const nearest = Math.round(el.scrollLeft / el.clientWidth);
    el.scrollTo({ left: nearest * el.clientWidth, behavior: "smooth" });
    setPage(nearest);
  };

  return (
    <div>
      <div
        ref={track}
        onScroll={syncPage}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        // A click that ends a drag would otherwise open that photo's lightbox.
        onClickCapture={(event) => {
          if (drag.current.moved) {
            event.preventDefault();
            event.stopPropagation();
          }
        }}
        className={`no-scrollbar flex cursor-grab overflow-x-auto overscroll-x-contain scroll-smooth ${
          dragging ? "cursor-grabbing select-none" : "snap-x snap-mandatory"
        }`}
      >
        {pages.map((photos, index) => (
          <div
            key={index}
            className="grid w-full shrink-0 snap-start grid-cols-3 gap-3 sm:gap-5"
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
                  {photo.caption}
                </figcaption>
              </figure>
            ))}
          </div>
        ))}
      </div>

      {pages.length > 1 && (
        <div className="mt-5 flex items-center justify-between gap-4">
          <p className="text-sm text-muted tabular-nums">
            {page + 1} / {pages.length}
          </p>
          <div className="flex items-center gap-2">
            <NavButton label="previous photos" onClick={() => go(-1)}>
              ←
            </NavButton>
            <NavButton label="next photos" onClick={() => go(1)}>
              →
            </NavButton>
          </div>
        </div>
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

function NavButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="flex size-8 items-center justify-center rounded-md border border-border text-muted transition-colors hover:text-foreground"
    >
      {children}
    </button>
  );
}
