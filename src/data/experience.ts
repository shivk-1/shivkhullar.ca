export type Experience = {
  /** Company / org name — the hyperlinked part */
  name: string;
  role: string;
  url: string;
  logoSrc: string;
  period: string;
  blurb: string;
};

export const experience: Experience[] = [
  {
    name: "BaseLeaf",
    role: "Software Engineering Intern",
    url: "https://example.com",
    logoSrc: "/logos/baseleaf.svg",
    period: "May 2026 — Present",
    blurb:
      "Automation pipelines and fine-tuned LLMs for document generation, backed by eval harnesses and automated QA",
  },
  {
    name: "Waterloo Aerial Robotics Group",
    role: "Autonomy Software Developer",
    url: "https://www.uwarg.com/",
    logoSrc: "/logos/warg.svg",
    period: "Sept 2025 — Present",
    blurb:
      "Optimizing autonomous navigation with enhanced computer vision and simulation-based validation",
  },
  {
    name: "Rayat and Company Inc.",
    role: "Founding Engineer",
    url: "https://example.com",
    logoSrc: "/logos/rayat.svg",
    period: "Aug 2025 — Present",
    blurb:
      "Transforming dealership data into actionable real-time analytics at scale",
  },
  {
    name: "Headstarter AI",
    role: "Software Engineer Fellow",
    url: "https://headstarter.co/",
    logoSrc: "/logos/headstarter.svg",
    period: "Jul 2024 — Sept 2024",
    blurb:
      "Built intelligent task automation systems and optimized backend performance for real-time AI applications",
  },
];
