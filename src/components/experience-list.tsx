import Image from "next/image";
import { experience } from "@/data/experience";
import { Reveal } from "@/components/reveal";

export function ExperienceList() {
  return (
    <ul className="space-y-3.5">
      {experience.map((job, i) => (
        <Reveal key={job.name} delay={i * 0.04}>
          <li>
            <p className="text-[15px] leading-relaxed text-muted sm:text-base">
              <a
                href={job.url}
                target="_blank"
                rel="noreferrer noopener"
                className="group inline-flex items-center gap-2 align-baseline"
              >
                <Image
                  src={job.logoSrc}
                  alt=""
                  width={20}
                  height={20}
                  className="size-5 shrink-0 rounded-[5px] border border-border object-cover"
                />
                <span className="link font-medium text-foreground">
                  {job.name}
                </span>
              </a>
              <span aria-hidden="true" className="mx-2 text-border">
                —
              </span>
              {job.blurb}
              {job.period ? (
                <span className="ml-2 whitespace-nowrap text-sm text-border">
                  {job.period}
                </span>
              ) : null}
            </p>
          </li>
        </Reveal>
      ))}
    </ul>
  );
}
