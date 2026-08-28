import { HalftoneTrail } from "@/components/halftone-trail";
import { ThemeToggle } from "@/components/theme-toggle";

/**
 * The text-driven pages: centred measure and a theme toggle. /music sits
 * outside this group because it is full-bleed art with a fixed palette.
 *
 * The halftone trail is mounted here rather than in the root layout for the
 * same reason: this group is every page that is not the room, so the room
 * keeps its plain pointer without needing to opt out.
 */
export default function SiteLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="mx-auto w-full max-w-5xl px-5 sm:px-8 lg:px-10">
      <HalftoneTrail />
      <div className="flex justify-end pt-5">
        <ThemeToggle />
      </div>
      {children}
    </div>
  );
}
