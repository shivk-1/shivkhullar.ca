import Image from "next/image";
import { experience, type Experience } from "@/data/experience";

/** Rendered size of a company logo. Keep the className below in step with it. */
const LOGO = 24;

function logo(job: Experience) {
  if (!job.logoSrc) return null;
  return (
    <Image
      src={job.logoSrc}
      alt=""
      width={LOGO}
      height={LOGO}
      /*
        items-baseline sits the image's bottom edge on the text baseline, so it
        grows upward and would ride high. The nudge drops it back until its
        centre lands on the cap height's, which is where the eye reads it as
        level with the name.
      */
      className="size-[24px] shrink-0 translate-y-[6px] rounded-[6px] border border-border object-cover"
    />
  );
}

export function ExperienceList() {
  return (
    <ul className="space-y-6">
      {experience.map((job) => (
        <li key={job.name}>
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <p className="text-[15px] font-medium sm:text-base">
              {job.role} @{" "}
              {job.url ? (
                <a
                  href={job.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex items-baseline gap-1.5"
                >
                  <span className="link">{job.name}</span>
                  {logo(job)}
                </a>
              ) : (
                <span className="inline-flex items-baseline gap-1.5">
                  <span>{job.name}</span>
                  {logo(job)}
                </span>
              )}
            </p>
            <p className="text-sm text-muted tabular-nums">{job.period}</p>
          </div>
          <p className="mt-1.5 max-w-3xl text-[15px] leading-relaxed text-muted">
            {job.blurb}
          </p>
        </li>
      ))}
    </ul>
  );
}
