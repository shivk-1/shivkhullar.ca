export type GalleryPhoto = {
  src: string;
  caption: string;
};

/** Shown three at a time in the gallery carousel, in this order. */
export const gallery: GalleryPhoto[] = [
  {
    src: "/gallery/waterloo.svg",
    caption: "first week on campus at waterloo.",
  },
  {
    src: "/gallery/pitch.svg",
    caption: "semi-pro season, somewhere around the 70th minute.",
  },
  {
    src: "/gallery/studio.svg",
    caption: "the corner of my room that became a studio.",
  },
  {
    src: "/gallery/toronto.svg",
    caption: "toronto in the summer, walking home the long way.",
  },
  {
    src: "/gallery/hackathon.svg",
    caption: "hour 26 of a 36 hour hackathon.",
  },
  {
    src: "/gallery/desk.svg",
    caption: "the desk where most of this site got built.",
  },
  {
    src: "/gallery/trail.svg",
    caption: "trail run that turned into a two hour detour.",
  },
  {
    src: "/gallery/rooftop.svg",
    caption: "rooftop, last night of the term.",
  },
  {
    src: "/gallery/vinyl.svg",
    caption: "digging for records i will absolutely sample later.",
  },
];
