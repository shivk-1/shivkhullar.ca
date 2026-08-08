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
    name: "WatEats",
    repoUrl: "https://github.com/shivk-1",
    mediaType: "image",
    mediaSrc: "/projects/wateats.svg",
    tag: "In Development",
    period: "Nov 2025 — Present",
    blurb:
      "An intelligent dining recommender that matches Waterloo students' cravings to residence menus through AI-powered semantic search.",
  },
  {
    name: "SentinelAI",
    repoUrl: "https://github.com/shivk-1",
    mediaType: "image",
    mediaSrc: "/projects/sentinelai.svg",
    tag: "AI Platform",
    period: "Oct 2025",
    blurb:
      "An AI platform detecting anomalous network activity and exposing potential cybersecurity threats.",
  },
  {
    name: "PredictPL",
    repoUrl: "https://github.com/shivk-1",
    mediaType: "image",
    mediaSrc: "/projects/predictpl.svg",
    tag: "Machine Learning",
    period: "Sept 2025",
    blurb:
      "Engineered an ML system that predicts Premier League match results through feature-rich statistical modeling.",
  },
  {
    name: "Campr",
    repoUrl: "https://github.com/shivk-1",
    mediaType: "image",
    mediaSrc: "/projects/campr.svg",
    tag: "Web App",
    period: "Jul 2024",
    blurb:
      "Peer-to-peer camping platform connecting outdoor enthusiasts through shared gear and local events.",
  },
];
