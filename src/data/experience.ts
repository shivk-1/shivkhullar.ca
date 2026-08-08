export type Experience = {
  name: string;
  url: string;
  logoSrc: string;
  blurb: string;
  period?: string;
};

export const experience: Experience[] = [
  {
    name: "Placeholder Labs",
    url: "https://example.com",
    logoSrc: "/logos/placeholder-labs.svg",
    blurb: "built internal tooling for the data platform team",
    period: "S25",
  },
  {
    name: "Another Company",
    url: "https://example.com",
    logoSrc: "/logos/another-company.svg",
    blurb: "shipped a payments dashboard used by ~40 merchants",
    period: "W25",
  },
  {
    name: "Some Startup",
    url: "https://example.com",
    logoSrc: "/logos/some-startup.svg",
    blurb: "first eng hire, wrote most of the backend",
    period: "S24",
  },
];
