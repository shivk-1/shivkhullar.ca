import { ThemeToggle } from "@/components/theme-toggle";

/**
 * The text-driven pages: centred measure and a theme toggle. /music sits
 * outside this group because it is full-bleed art with a fixed palette.
 */
export default function SiteLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="mx-auto w-full max-w-5xl px-5 sm:px-8 lg:px-10">
      <div className="flex justify-end pt-5">
        <ThemeToggle />
      </div>
      {children}
    </div>
  );
}
