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
          Width is fixed and height stretches to the text column, so the photo
          runs from the top of the heading all the way down to the socials,
          which is why those live inside the column rather than under the row.

          The width is picked to land close to square against that height. It
          cannot be exactly square: the column's height is whatever the prose
          wraps to, which depends on the width left over once this photo has
          taken its share, so the two chase each other. `object-cover` absorbs
          the remaining few percent either way.
        */}
        <div className="relative aspect-square w-40 shrink-0 overflow-hidden rounded-2xl border border-border sm:aspect-auto sm:h-auto sm:w-80 sm:self-stretch">
          <Image
            src={site.photo}
            alt={site.name}
            fill
            priority
            sizes="(max-width: 640px) 160px, 320px"
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
