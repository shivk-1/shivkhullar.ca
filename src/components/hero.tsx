import Image from "next/image";
import type { ReactNode } from "react";
import { FadeLink } from "@/components/fade-link";
import { intro, site } from "@/data/site";
import { Socials } from "@/components/socials";

const LINK_SPAN = /\[([^\]]+)\]\(([^)]+)\)/g;

/**
 * Renders the `[label](/href)` spans in an intro paragraph as links so the copy
 * in site.ts stays plain data instead of turning into markup.
 *
 * FadeLink rather than Link because one of these spans points at the vinyl
 * room, which fades rather than cuts. It behaves as a plain link everywhere
 * else, so the rest of the copy is unaffected.
 */
function prose(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  let cursor = 0;

  for (const match of text.matchAll(LINK_SPAN)) {
    const [span, label, href] = match;
    if (match.index > cursor) out.push(text.slice(cursor, match.index));
    out.push(
      <FadeLink
        key={href}
        href={href}
        // The room gets an orange underline. It is the one link here that goes
        // somewhere rather than to more prose, and it is worth pointing at.
        // `marker` carries its own underline, so it replaces `link` rather
        // than sitting on top of it and fighting over the same properties.
        className={
          href === "/music" ? "text-foreground marker" : "link text-foreground"
        }
      >
        {label}
      </FadeLink>,
    );
    cursor = match.index + span.length;
  }

  out.push(text.slice(cursor));
  return out;
}

export function Hero() {
  return (
    <header className="pt-4 sm:pt-8">
      <div className="flex flex-col gap-6 sm:flex-row-reverse sm:items-stretch sm:justify-end sm:gap-10">
        {/*
          A fixed square, centred against the text column rather than stretched
          to it. Stretching made the height whatever the prose happened to wrap
          to, which is what forced the near-square compromise; at a set size it
          is exactly square, and centring leaves the same gap above it as below
          without either being written down.

          The socials stay inside the column. Nothing needs them there now, but
          they belong with the prose they follow, and moving them back out
          would put a second thing in the row for no reason.
        */}
        <div className="relative aspect-square w-40 shrink-0 overflow-hidden rounded-2xl border border-border sm:w-72 sm:self-center">
          <Image
            src={site.photo}
            alt={site.name}
            fill
            priority
            sizes="(max-width: 640px) 160px, 288px"
            className="object-cover"
          />
        </div>

        {/* Prose capped well under the container width — long measures hurt reading */}
        <div className="min-w-0 max-w-3xl">
          <h1 className="text-base font-bold sm:text-[17px]">
            hi, i&apos;m {site.shortName}.
          </h1>

          <p className="mt-4 text-base leading-relaxed text-muted sm:text-[17px]">
            {site.role} @{" "}
            <a
              href={site.schoolUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="link text-foreground"
            >
              {site.school}
            </a>
          </p>

          {intro.map((para) => (
            <p
              key={para}
              className="mt-4 text-base leading-relaxed text-muted sm:text-[17px]"
            >
              {prose(para)}
            </p>
          ))}

          {/* Inside the column, so the photo beside it has something to
              stretch down to. */}
          <Socials className="mt-8" />
        </div>
      </div>
    </header>
  );
}
