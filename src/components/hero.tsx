import Image from "next/image";
import { intro, site } from "@/data/site";
import { Socials } from "@/components/socials";

export function Hero() {
  return (
    <header className="pt-4 sm:pt-8">
      <div className="flex flex-col gap-6 sm:flex-row-reverse sm:items-start sm:justify-end sm:gap-10">
        <Image
          src={site.photo}
          alt={site.name}
          width={224}
          height={224}
          priority
          className="size-36 shrink-0 rounded-2xl border border-border object-cover sm:size-48"
        />

        {/* Prose capped well under the container width — long measures hurt reading */}
        <div className="min-w-0 max-w-3xl">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Hi, I&apos;m {site.shortName}.
          </h1>

          <p className="mt-4 text-base leading-relaxed text-muted sm:text-[17px]">
            I&apos;m a {site.role} student at the{" "}
            <a
              href={site.schoolUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="link text-foreground"
            >
              {site.school}
            </a>
            . I experiment with AI/ML and different technologies to build cool
            things I like.
          </p>

          {intro.map((para) => (
            <p
              key={para}
              className="mt-3 text-base leading-relaxed text-muted sm:text-[17px]"
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
