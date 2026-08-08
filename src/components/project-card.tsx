"use client";

import Image from "next/image";
import { useRef } from "react";
import type { Project } from "@/data/projects";

export function ProjectCard({ project }: { project: Project }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  const play = () => void videoRef.current?.play().catch(() => {});
  const pause = () => {
    const v = videoRef.current;
    if (!v) return;
    v.pause();
    v.currentTime = 0;
  };

  return (
    <article
      className="group overflow-hidden rounded-xl border border-border bg-card transition-colors hover:border-muted/50"
      onMouseEnter={project.mediaType === "video" ? play : undefined}
      onMouseLeave={project.mediaType === "video" ? pause : undefined}
    >
      <div className="relative aspect-16/10 overflow-hidden border-b border-border bg-background">
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
            alt={`${project.name} preview`}
            fill
            sizes="(max-width: 640px) 100vw, 50vw"
            className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
          />
        )}
      </div>

      <div className="p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <h3 className="text-base font-medium">
            <a
              href={project.repoUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="link"
            >
              {project.name}
            </a>
          </h3>
          <span className="rounded-full border border-border px-2 py-0.5 text-[11px] uppercase tracking-wider text-muted">
            {project.tag}
          </span>
        </div>
        <p className="mt-2 text-[15px] leading-relaxed text-muted">
          {project.blurb}
        </p>
      </div>
    </article>
  );
}
