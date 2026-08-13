"use client";

import Image from "next/image";
import { useState } from "react";
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
  const [page, setPage] = useState(0);

  if (pages.length === 0) return null;

  const go = (delta: number) =>
    setPage((current) => (current + delta + pages.length) % pages.length);

  return (
    <div>
      <div className="overflow-hidden">
        <div
          className="flex transition-transform duration-500 ease-out motion-reduce:transition-none"
          style={{ transform: `translateX(-${page * 100}%)` }}
        >
          {pages.map((photos, index) => (
            <div
              key={index}
              aria-hidden={index !== page}
              className="w-full shrink-0 grid grid-cols-3 gap-3 sm:gap-5"
            >
              {photos.map((photo) => (
                <figure key={photo.src}>
                  <div className="relative aspect-4/3 overflow-hidden rounded-md border border-border bg-background">
                    <Image
                      src={photo.src}
                      alt={photo.caption}
                      fill
                      sizes="(min-width: 640px) 240px, 30vw"
                      className="object-cover"
                    />
                  </div>
                  <figcaption className="mt-2 text-[13px] leading-relaxed text-muted sm:text-sm">
                    {photo.caption}
                  </figcaption>
                </figure>
              ))}
            </div>
          ))}
        </div>
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
    </div>
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
