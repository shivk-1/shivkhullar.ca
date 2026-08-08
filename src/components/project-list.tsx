"use client";

import Image from "next/image";
import { useRef } from "react";
import { projects, type Project } from "@/data/projects";

export function ProjectList() {
  return (
    <ul className="space-y-6">
      {projects.map((project) => (
        <li key={project.name} className="flex items-start justify-between gap-5">
          <div className="min-w-0 max-w-3xl">
            <p className="text-[15px] font-medium sm:text-base">
              <a
                href={project.repoUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="link"
              >
                {project.name}
              </a>
            </p>
            <p className="mt-1.5 text-[15px] leading-relaxed text-muted">
              {project.blurb}
            </p>
          </div>

          <Thumb project={project} />
        </li>
      ))}
    </ul>
  );
}

/** Screenshot sitting where the experience rows put their date. */
function Thumb({ project }: { project: Project }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  const play = () => void videoRef.current?.play().catch(() => {});
  const pause = () => {
    const v = videoRef.current;
    if (!v) return;
    v.pause();
    v.currentTime = 0;
  };

  return (
    <a
      href={project.repoUrl}
      target="_blank"
      rel="noreferrer noopener"
      aria-hidden="true"
      tabIndex={-1}
      onMouseEnter={project.mediaType === "video" ? play : undefined}
      onMouseLeave={project.mediaType === "video" ? pause : undefined}
      className="relative aspect-16/10 w-28 shrink-0 overflow-hidden rounded-md border border-border bg-background sm:w-36"
    >
      {project.mediaType === "video" ? (
        <video
          ref={videoRef}
          src={project.mediaSrc}
          poster={project.posterSrc}
          muted
          loop
          playsInline
          preload="none"
          className="size-full object-cover"
        />
      ) : (
        <Image
          src={project.mediaSrc}
          alt=""
          fill
          sizes="144px"
          className="object-cover"
        />
      )}
    </a>
  );
}
