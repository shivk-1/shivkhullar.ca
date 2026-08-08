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

/** Short prose intro, rendered as separate paragraphs. */
export const intro: string[] = [
  "I currently work on helping car dealerships make the most of their data at Rayat and Company Inc. I'm also developing an app that helps Waterloo students find the best residence cafeteria food based on their cravings.",
];
