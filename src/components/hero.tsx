import Image from "next/image";
import { intro, site } from "@/data/site";
import { Socials } from "@/components/socials";

export function Hero() {
  return (
    <header className="pt-4 sm:pt-8">
      <div className="flex flex-col gap-6 sm:flex-row-reverse sm:items-stretch sm:justify-end sm:gap-10">
        {/*
          Width is fixed and height stretches to the text column, so the photo
          runs from the top of the heading down to the last intro line. The
          social row sits outside this flex, below both.
        */}
        <div className="relative aspect-square w-40 shrink-0 overflow-hidden rounded-2xl border border-border sm:aspect-auto sm:h-auto sm:w-64 sm:self-stretch">
          <Image
            src={site.photo}
            alt={site.name}
            fill
            priority
            sizes="(max-width: 640px) 160px, 256px"
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
              {para}
            </p>
          ))}
        </div>
      </div>

      <Socials className="mt-8" />
    </header>
  );
}
