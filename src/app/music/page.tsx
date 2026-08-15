import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import wallShelf from "../../../public/music/wall-shelf.png";
import { site } from "@/data/site";

export const metadata: Metadata = {
  title: "music wall",
  description: `music ${site.shortName} listens to.`,
};

/**
 * Tile is 480px of art rendered a little under native so the speckle reads as
 * texture on a white wall rather than as visible blocks. Left to the browser's
 * default smoothing on purpose: nearest-neighbour on a downscale would alias
 * the speckle back into hard dots, which is the thing being avoided.
 */
const WALL_TILE = "384px";

/** Extra width only, so a shelf spans wider without getting thicker. */
const SHELF_STRETCH = 1.3;

/** Art is 320x56 cropped to its own bounds; the stretch widens that ratio. */
const SHELF_ASPECT = (320 / 56) * SHELF_STRETCH;

/**
 * Where each shelf sits, as a share of the wall. Percentages rather than pixels
 * so the whole arrangement scales with the viewport and the stagger holds at
 * any width.
 *
 * The pattern is deliberate: shelves pair up in bands, and each band's pair is
 * offset from the one above so no two shelves ever stack in a column. Widths
 * vary a little within a band to keep it from reading as a grid.
 */
const SHELVES = [
  { top: 6, left: 9, width: 22 },
  { top: 8, left: 58, width: 18 },
  { top: 20, left: 33, width: 21 },
  { top: 30, left: 7, width: 19 },
  { top: 32, left: 62, width: 22 },
  { top: 44, left: 36, width: 18 },
  { top: 55, left: 11, width: 22 },
  { top: 57, left: 64, width: 17 },
  { top: 69, left: 31, width: 20 },
  { top: 80, left: 8, width: 21 },
  { top: 82, left: 59, width: 20 },
] as const;

/** Tall enough that the arrangement above has room to breathe and scrolls. */
const WALL_HEIGHT = "240vh";

export default function MusicWall() {
  return (
    // Fixed palette: this page ignores the light/dark tokens the rest of the
    // site uses, so the art reads the same either way.
    <div
      className="min-h-screen w-full bg-[#f7f7f7] bg-repeat"
      style={{
        backgroundImage: "url(/music/wall.png)",
        backgroundSize: WALL_TILE,
      }}
    >
      <Link
        href="/"
        aria-label={`back to ${site.name}`}
        className="fixed left-4 top-4 z-10 grid size-10 place-items-center rounded-full bg-black/30 text-white transition-colors hover:bg-black/50 sm:left-6 sm:top-6"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </Link>

      <div className="relative w-full" style={{ height: WALL_HEIGHT }}>
        {SHELVES.map((shelf, index) => (
          <div
            key={index}
            className="absolute"
            style={{
              top: `${shelf.top}%`,
              left: `${shelf.left}%`,
              width: `${shelf.width}%`,
              aspectRatio: SHELF_ASPECT,
            }}
          >
            <Image
              src={wallShelf}
              alt=""
              fill
              sizes={`${shelf.width}vw`}
              priority={index < 2}
              className="[image-rendering:pixelated]"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
