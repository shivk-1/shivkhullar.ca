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
    caption: "flick .",
    date: "2026-08-09",
  },
  {
    src: "/gallery/eng.jpg",
    caption: "hour 26 of a 36 hour hackathon.",
    date: "2026-07-25",
  },
  {
    src: "/gallery/synth.jpg",
    caption: "the desk where most of this site got built.",
    date: "2026-07-14",
  },
  {
    src: "/gallery/badiali.jpg",
    caption: "the desk where most of this site got built.",
    date: "2026-07-12",
  },
  {
    src: "/gallery/fanfest.jpg",
    caption: "trail run that turned into a two hour detour.",
    date: "2026-06-20",
  },
  {
    src: "/gallery/golf.jpg",
    caption: "rooftop, last night of the term.",
    date: "2026-06-05",
  },
  {
    src: "/gallery/toronto.jpg",
    caption: "digging for records i will absolutely sample later.",
    date: "2026-05-26",
  },
];
