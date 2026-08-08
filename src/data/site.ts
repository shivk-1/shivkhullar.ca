export const site = {
  name: "Shivansh Khullar",
  shortName: "Shivansh",
  role: "Computer Engineering",
  school: "University of Waterloo",
  schoolUrl: "https://uwaterloo.ca/",
  url: "https://shivkhullar.com",
  description:
    "Computer Engineering @ University of Waterloo. AI Software Engineering Intern at BaseLeaf Technologies, working across the machine learning stack.",
  photo: "/me.svg",
  email: "shivansh.khullar@gmail.com",
  resume: "/resume.pdf",
  socials: {
    github: "https://github.com/shivk-1",
    linkedin: "https://www.linkedin.com/in/shivanshkhullar/",
    x: "https://x.com/shivanshk_",
  },
} as const;

/** Prose intro blocks, each rendered as its own paragraph under the title line. */
export const intro: string[] = [
  "Currently an AI Software Engineering Intern at BaseLeaf Technologies, where I build event-driven automation pipelines over REST services and fine-tune transformer-based LLMs for document generation, along with the evaluation harnesses and human-in-the-loop QA workflows that keep their outputs factually grounded.",
  "Outside of that, my time goes to research and implementation across the machine learning stack: architecting and training neural models, interrogating how they fail, and carrying the ideas that survive contact with real data from paper to production.",
  "Seeking Winter 2027 internships.",
];
