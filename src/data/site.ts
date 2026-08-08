export const site = {
  name: "shivansh khullar",
  shortName: "shivansh",
  role: "computer engineering",
  school: "university of waterloo",
  schoolUrl: "https://uwaterloo.ca/",
  url: "https://shivkhullar.com",
  description:
    "computer engineering @ university of waterloo. working on paper-to-implementation r&d and building projects i actually want to build.",
  photo: "/me.svg",
  email: "shivansh.khullar@gmail.com",
  resume: "/resume.pdf",
  socials: {
    github: "https://github.com/shivk-1",
    linkedin: "https://www.linkedin.com/in/shivanshkhullar/",
    x: "https://x.com/shivanshk_",
  },
} as const;

/** Prose blocks under the title line, each rendered as its own paragraph. */
export const intro: string[] = [
  "currently software engineering intern at baseleaf. working on paper-to-implementation r&d, replicating results + pressure-testing, and building projects i actually want to build.",
  "seeking winter 2027 internships.",
];
