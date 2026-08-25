import type { Metadata } from "next";
import Link from "next/link";
import { MusicRoom } from "@/components/turntable/music-room";
import { RoomFade } from "@/components/turntable/room-fade";
import { site } from "@/data/site";

export const metadata: Metadata = {
  title: "music wall",
  description: `music ${site.shortName} listens to.`,
};

export default function MusicPage() {
  return (
    // Fixed black, and not from the light/dark tokens the rest of the site
    // uses: the room is lit only by the two lamps standing in it, so the page
    // behind the canvas has to be the dark the floor fades out into. It is
    // also what the fade below comes up out of.
    <div className="relative h-dvh w-full overflow-hidden bg-black">
      <RoomFade>
        <Link
          href="/"
          aria-label={`back to ${site.name}`}
          className="absolute left-4 top-4 z-10 grid size-10 place-items-center rounded-full text-white/50 transition-colors hover:bg-white/10 hover:text-white sm:left-6 sm:top-6"
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

        <MusicRoom />
      </RoomFade>
    </div>
  );
}
