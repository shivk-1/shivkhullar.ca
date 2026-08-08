import Image from "next/image";
import { funFacts, site } from "@/data/site";
import { Socials } from "@/components/socials";

export function Hero() {
  return (
    <header className="pt-4 sm:pt-8">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:gap-8">
        <Image
          src={site.photo}
          alt={site.name}
          width={128}
          height={128}
          priority
          className="size-24 shrink-0 rounded-xl border border-border object-cover sm:size-32"
        />

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              {site.name}
            </h1>
            <Socials className="-ml-2 sm:ml-0" />
          </div>

          <p className="mt-2 text-[15px] leading-relaxed text-muted sm:text-base">
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

          <ul className="mt-5 space-y-1.5 text-[15px] leading-relaxed text-muted sm:text-base">
            {funFacts.map((fact) => (
              <li key={fact} className="flex gap-2.5">
                <span aria-hidden="true" className="select-none text-border">
                  —
                </span>
                <span>{fact}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </header>
  );
}
