import Image from "next/image";
import { intro, site } from "@/data/site";
import { Socials } from "@/components/socials";

export function Hero() {
  return (
    <header className="flex flex-col gap-6 pt-4 sm:flex-row-reverse sm:items-stretch sm:justify-end sm:gap-10 sm:pt-8">
      {/*
        Sized to the height of the text column (heading + two paragraphs + the
        social links row) so the photo's bottom edge lines up with the links.
        Nudge sm:size-72 if the intro copy changes length.
      */}
      <div className="relative aspect-square w-40 shrink-0 overflow-hidden rounded-2xl border border-border sm:size-72">
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
      <div className="flex min-w-0 max-w-3xl flex-col">
        <h1 className="font-display text-3xl font-bold tracking-tight sm:text-[42px] sm:leading-[1.1]">
          Hi, I&apos;m {site.shortName}.
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
            {para}
          </p>
        ))}

        <Socials className="mt-8" />
      </div>
    </header>
  );
}
