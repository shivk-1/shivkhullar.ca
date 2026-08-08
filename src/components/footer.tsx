import { site } from "@/data/site";
import { Socials } from "@/components/socials";

export function Footer() {
  return (
    <footer className="mt-16 flex flex-col gap-4 border-t border-border py-8 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-muted">
        © {new Date().getFullYear()} {site.name}. Built with Next.js.
      </p>
      <Socials className="-ml-2 sm:ml-0" />
    </footer>
  );
}
