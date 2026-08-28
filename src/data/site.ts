export const site = {
  name: "shivansh khullar",
  shortName: "shivansh",
  role: "computer engineering",
  school: "university of waterloo",
  schoolUrl: "https://uwaterloo.ca/",
  url: "https://shivkhullar.com",
  description:
    "computer engineering @ university of waterloo. working on paper-to-implementation r&d and building projects i actually want to build.",
  photo: "/mypic.jpg",
  email: "shivansh.khullar@gmail.com",
  resume: "/Shivansh_Khullar_Resume.pdf",
  socials: {
    github: "https://github.com/shivk-1",
    linkedin: "https://www.linkedin.com/in/shivanshkhullar/",
    x: "https://x.com/shivanshk_",
  },
} as const;

/**
 * Sections that are built but not shown yet. Flip a flag to true and the
 * section renders again with no other changes.
 */
export const features = {
  projects: false,
} as const;

/**
 * Prose blocks under the title line, each rendered as its own paragraph.
 * `[label](/href)` spans render as links.
 */
export const intro: string[] = [
  "prev. swe intern at baseleaf. aspiring researcher. working on paper-to-implementation r&d, replicating results, reading research papers, and building projects i actually want to build.",
  "not just a nerd. played semi-pro soccer. music producer with over 100k+ streams. check out my [vinyl room](/music) and my writing.",
  "seeking winter 2027 internships.",
];
