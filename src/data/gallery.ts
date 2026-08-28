export type GalleryPhoto = {
  src: string;
  caption: string;
  /** ISO day, e.g. "2024-09-03". Rendered under the caption as "sept 2024". */
  date: string;
};

/**
 * Shown three at a time in the gallery carousel, in this order.
 *
 * TODO: every src is placeholder art and every date is made up. Both get
 * replaced together when the real photos land.
 */
export const gallery: GalleryPhoto[] = [
  {
    src: "/gallery/family.jpg",
    caption: "with my family in chinatown, chicago.",
    date: "2026-08-24",
  },
  {
    src: "/gallery/chicago.jpg",
    caption: "skyline pic part of the chicago architecture tour.",
    date: "2026-08-23",
  },
  {
    src: "/gallery/apple.jpg",
    caption: "best apple store i've ever seen.",
    date: "2026-08-23",
  },
  {
    src: "/gallery/soccer.jpg",
    caption: "flick while playing for a mens league team.",
    date: "2026-08-09",
  },
  {
    src: "/gallery/eng.jpg",
    caption: "lifting the engsoc vs mathsoc matchup cup, with a 14-2 win. i scored btw.",
    date: "2026-07-25",
  },
  {
    src: "/gallery/synth.jpg",
    caption: "admiring the expensive equipment. hope to get one of these one day.",
    date: "2026-07-14",
  },
  {
    src: "/gallery/badiali.jpg",
    caption: "top 3 pizzas i've ever had. one word: badiali's.",
    date: "2026-07-12",
  },
  {
    src: "/gallery/fanfest.jpg",
    caption: "saw my team germany win. great match, not a great wc run.",
    date: "2026-06-20",
  },
  {
    src: "/gallery/golf.jpg",
    caption: "definitely did not double/triple bogey every hole here.",
    date: "2026-06-05",
  },
  {
    src: "/gallery/toronto.jpg",
    caption: "i love this city.",
    date: "2026-05-26",
  },
];
