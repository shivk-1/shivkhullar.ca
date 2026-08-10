export type Experience = {
  /** Company / org name — hyperlinked when a url is present */
  name: string;
  role: string;
  /** Omit for unlinked entries, e.g. a stealth company */
  url?: string;
  logoSrc?: string;
  period: string;
  blurb: string;
};

export const experience: Experience[] = [
  {
    name: "baseleaf",
    role: "software engineering intern",
    url: "https://example.com",
    logoSrc: "/logos/baseleaf.svg",
    period: "may 2026 — present",
    blurb:
      "building llm-powered tooling that helps immigration professionals move through casework faster",
  },
  {
    name: "waterloo aerial robotics group",
    role: "autonomy software developer",
    url: "https://www.uwarg.com/",
    logoSrc: "/logos/warg.svg",
    period: "sept 2025 — present",
    blurb:
      "optimizing autonomous navigation with enhanced computer vision and simulation-based validation",
  },
  {
    name: "stealth startup",
    role: "founding engineer",
    logoSrc: "/logos/stealth.svg",
    period: "aug 2025 — jan 2026",
    blurb:
      "transforming dealership data into actionable real-time analytics at scale",
  },
  {
    name: "headstarter ai",
    role: "software engineer fellow",
    url: "https://headstarter.co/",
    logoSrc: "/logos/headstarter.svg",
    period: "jul 2024 — sept 2024",
    blurb:
      "built intelligent task automation systems and optimized backend performance for real-time ai applications",
  },
];
