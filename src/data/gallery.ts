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
    caption: "first week on campus at waterloo.",
    date: "2026-08-24",
  },
  {
    src: "/gallery/pitch.svg",
    caption: "semi-pro season, somewhere around the 70th minute.",
    date: "2023-07-16",
  },
  {
    src: "/gallery/studio.svg",
    caption: "the corner of my room that became a studio.",
    date: "2024-02-11",
  },
  {
    src: "/gallery/toronto.svg",
    caption: "toronto in the summer, walking home the long way.",
    date: "2024-07-21",
  },
  {
    src: "/gallery/hackathon.svg",
    caption: "hour 26 of a 36 hour hackathon.",
    date: "2024-11-09",
  },
  {
    src: "/gallery/desk.svg",
    caption: "the desk where most of this site got built.",
    date: "2026-08-02",
  },
  {
    src: "/gallery/trail.svg",
    caption: "trail run that turned into a two hour detour.",
    date: "2025-05-18",
  },
  {
    src: "/gallery/rooftop.svg",
    caption: "rooftop, last night of the term.",
    date: "2025-12-06",
  },
  {
    src: "/gallery/vinyl.svg",
    caption: "digging for records i will absolutely sample later.",
    date: "2026-03-14",
  },
];
