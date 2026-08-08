export const site = {
  name: "Shivansh Khullar",
  shortName: "Shivansh",
  role: "Computer Engineering",
  school: "University of Waterloo",
  schoolUrl: "https://uwaterloo.ca/",
  url: "https://shivkhullar.com",
  description:
    "Computer Engineering student at the University of Waterloo. I experiment with AI/ML and different technologies to build cool things I like.",
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
  "Working on paper-to-implementation R&D, replicating results and pressure-testing where they break, and building projects I actually want to build.",
  "Seeking Winter 2027 internships.",
];
