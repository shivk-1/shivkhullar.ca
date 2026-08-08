export type Project = {
  name: string;
  repoUrl: string;
  mediaType: "image" | "video";
  mediaSrc: string;
  /** Poster frame for video previews */
  posterSrc?: string;
  tag: string;
  blurb: string;
};

export const projects: Project[] = [
  {
    name: "Orbit",
    repoUrl: "https://github.com/",
    mediaType: "image",
    mediaSrc: "/projects/orbit.svg",
    tag: "Browser Game",
    blurb:
      "A physics sandbox where you slingshot satellites around procedurally generated systems.",
  },
  {
    name: "Setlist",
    repoUrl: "https://github.com/",
    mediaType: "image",
    mediaSrc: "/projects/setlist.svg",
    tag: "iOS App",
    blurb:
      "Tracks every live show you've been to and builds a year-end wrapped from it.",
  },
  {
    name: "Grain",
    repoUrl: "https://github.com/",
    mediaType: "image",
    mediaSrc: "/projects/grain.svg",
    tag: "Audio Tool",
    blurb:
      "Granular sampler in the browser. Drag a WAV in, mangle it, export stems.",
  },
  {
    name: "Ledgerly",
    repoUrl: "https://github.com/",
    mediaType: "image",
    mediaSrc: "/projects/ledgerly.svg",
    tag: "Web App",
    blurb:
      "Double-entry bookkeeping for people who hate bookkeeping. Plaid in, CSV out.",
  },
];
