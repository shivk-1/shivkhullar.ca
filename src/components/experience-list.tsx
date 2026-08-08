import Image from "next/image";
import { experience, type Experience } from "@/data/experience";

function logo(job: Experience) {
  if (!job.logoSrc) return null;
  return (
    <Image
      src={job.logoSrc}
      alt=""
      width={18}
      height={18}
      className="size-[18px] shrink-0 translate-y-[3px] rounded-[5px] border border-border object-cover"
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
