import { DifferenceCursor } from "@/components/difference-cursor";
import { ThemeToggle } from "@/components/theme-toggle";

/**
 * The text-driven pages: centred measure and a theme toggle. /music sits
 * outside this group because it is full-bleed art with a fixed palette.
 *
 * The cursor is mounted here rather than in the root layout for exactly that
 * reason: this group is every page that is not the room, so the room
 * keeps its own plain pointer without needing to opt out.
 */
export default function SiteLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="mx-auto w-full max-w-5xl px-5 sm:px-8 lg:px-10">
      <DifferenceCursor />
      <div className="flex justify-end pt-5">
        <ThemeToggle />
      </div>
      {children}
    </div>
  );
}
