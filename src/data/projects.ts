export type Project = {
  name: string;
  repoUrl: string;
  mediaType: "image" | "video";
  mediaSrc: string;
  /** Poster frame for video previews */
  posterSrc?: string;
  tag: string;
  period: string;
  blurb: string;
};

export const projects: Project[] = [
  {
    name: "wateats",
    repoUrl: "https://github.com/shivk-1",
    mediaType: "image",
    mediaSrc: "/projects/wateats.svg",
    tag: "in development",
    period: "nov 2025 — present",
    blurb:
      "an intelligent dining recommender that matches waterloo students' cravings to residence menus through ai-powered semantic search.",
  },
  {
    name: "sentinelai",
    repoUrl: "https://github.com/shivk-1",
    mediaType: "image",
    mediaSrc: "/projects/sentinelai.svg",
    tag: "ai platform",
    period: "oct 2025",
    blurb:
      "an ai platform detecting anomalous network activity and exposing potential cybersecurity threats.",
  },
  {
    name: "predictpl",
    repoUrl: "https://github.com/shivk-1",
    mediaType: "image",
    mediaSrc: "/projects/predictpl.svg",
    tag: "machine learning",
    period: "sept 2025",
    blurb:
      "engineered an ml system that predicts premier league match results through feature-rich statistical modeling.",
  },
  {
    name: "campr",
    repoUrl: "https://github.com/shivk-1",
    mediaType: "image",
    mediaSrc: "/projects/campr.svg",
    tag: "web app",
    period: "jul 2024",
    blurb:
      "peer-to-peer camping platform connecting outdoor enthusiasts through shared gear and local events.",
  },
];
