/** A track the deck can play, whatever it was sourced from. */
export type Track = {
  id: string;
  title: string;
  artist: string;
  /** Square cover, mapped onto the record label. */
  artwork: string;
  /** Anything an <audio> element can play. */
  audioSrc: string;
  /** Where it came from, so the library can group and label it. */
  source: "produced" | "on-repeat";
  /** Album name, shown in the middle column of a row. Absent for my own. */
  album?: string;
  /** Seconds. Known up front for pulled tracks, so the row can print a
      duration without waiting for the audio element to load metadata. */
  seconds?: number;
  /**
   * The line that lands on the notepad in the room while this is playing.
   *
   * Hand written for every track, mine and pulled alike — nothing derives it,
   * because the whole point is that it is a note from me rather than metadata.
   * Absent leaves the page blank, which is better than printing a stand-in.
   *
   * Keep it to a line or two: the pad is on the floor and foreshortened, and
   * a paragraph there is decoration nobody can read.
   *
   * Letters and `. , ! ? ' " : ;` only. The hand lettering the pad is set in
   * carries 70 glyphs and no others — no digits, no hyphens, no brackets, no
   * ampersand — and troika draws what it cannot find as nothing at all, so a
   * year or a dash here comes out as a hole in the sentence.
   */
  message?: string;
};

/**
 * One of mine. Carries the two things a pulled row cannot: when I made it,
 * and a line about what it is. Both are only ever shown on the produced tab,
 * which is why they live here rather than on `Track`.
 */
export type ProducedTrack = Track & {
  source: "produced";
  /** ISO date, e.g. "2026-04-18". Only the year is rendered. */
  date: string;
  /** One line: the sample, the intent, the gear. Kept short enough to sit
      under the title without wrapping past two lines. This is the library
      row's subtitle, not the notepad — that is `message`, on `Track`, and the
      two are written for different places. */
  note: string;
};

/**
 * My own productions. Full length, served from /public, no third party in the
 * path — these load even when the on-repeat fetch fails.
 *
 * The notes carry what the files actually tell me: the tempo I cut them at and
 * who else was on them. Covers are still the placeholder, and `message` is
 * left off rather than invented — the notepad prints nothing until there is a
 * real line to put on it.
 */
const produced: ProducedTrack[] = [
  {
    id: "attention",
    title: "attention",
    artist: "@prodshivk",
    artwork: "/music/art/placeholder.svg",
    audioSrc: "/music/tracks/attention.mp3",
    source: "produced",
    seconds: 225,
    date: "2023-08-14",
    note: "140 bpm, with lucid, yoshi and pol.",
  },
  {
    id: "zebrafur",
    title: "zebrafur",
    artist: "@prodshivk",
    artwork: "/music/art/placeholder.svg",
    audioSrc: "/music/tracks/zebrafur.mp3",
    source: "produced",
    seconds: 210,
    date: "2023-06-02",
    note: "121 bpm, with kunomane, rick anthony and malb.",
  },
  {
    id: "memoguitar",
    title: "memoguitar",
    artist: "@prodshivk",
    artwork: "/music/art/placeholder.svg",
    audioSrc: "/music/tracks/memoguitar.mp3",
    source: "produced",
    seconds: 208,
    date: "2023-03-27",
    note: "120 bpm, with rio leyva and noah mejia.",
  },
  {
    id: "queen",
    title: "queen",
    artist: "@prodshivk",
    artwork: "/music/art/placeholder.svg",
    audioSrc: "/music/tracks/queen.mp3",
    source: "produced",
    seconds: 210,
    date: "2023-01-19",
    note: "94 bpm, with aatuiljin.",
  },
  {
    id: "uchiha",
    title: "uchiha",
    artist: "@prodshivk",
    artwork: "/music/art/placeholder.svg",
    audioSrc: "/music/tracks/uchiha.mp3",
    source: "produced",
    seconds: 210,
    date: "2022-10-08",
    note: "168 bpm.",
  },
  {
    id: "the6",
    title: "the6",
    artist: "@prodshivk",
    artwork: "/music/art/placeholder.svg",
    audioSrc: "/music/tracks/the6.mp3",
    source: "produced",
    seconds: 185,
    date: "2022-07-21",
    note: "92 bpm, rimshots, with lh.",
  },
  {
    id: "ken",
    title: "ken",
    artist: "@prodshivk",
    artwork: "/music/art/placeholder.svg",
    audioSrc: "/music/tracks/ken.mp3",
    source: "produced",
    seconds: 184,
    date: "2022-05-05",
    note: "136 bpm, with pinkgrillz.",
  },
  {
    id: "ohio",
    title: "ohio",
    artist: "@prodshivk",
    artwork: "/music/art/placeholder.svg",
    audioSrc: "/music/tracks/ohio.mp3",
    source: "produced",
    seconds: 158,
    date: "2022-02-11",
    note: "155 bpm.",
  },
  {
    id: "ag-pov",
    title: "ag pov",
    artist: "@prodshivk",
    artwork: "/music/art/placeholder.svg",
    audioSrc: "/music/tracks/ag-pov.mp3",
    source: "produced",
    seconds: 188,
    date: "2021-11-30",
    note: "drill.",
  },
  {
    id: "picnic-in-paris",
    title: "picnic in paris",
    artist: "@prodshivk",
    artwork: "/music/art/placeholder.svg",
    audioSrc: "/music/tracks/picnic-in-paris.mp3",
    source: "produced",
    seconds: 110,
    date: "2021-09-16",
    note: "80 bpm.",
  },
];

/** Newest first, so the top of the tab is always the most recent thing. */
export const producedTracks: ProducedTrack[] = [...produced].sort((a, b) =>
  a.date < b.date ? 1 : -1,
);

/**
 * The blurb under each library tab, between the tabs and the search field.
 *
 * Here rather than in the component because it is copy, and copy belongs with
 * the rest of the words in this file rather than buried in markup.
 */
export const libraryNotes = {
  "on-repeat": {
    /** The small label above the lead, the way a playlist page names itself. */
    lead: "my top 40 songs in rotation.",
    body: "updated every month.",
  },
  produced: {
    lead: "check out some tracks i produced myself.",
    body:
      "haven't made anything in a while. these are from when i was producing " +
      "for other artists, so they sound mechanical/beat like. currently i'm working with " +
      "real instruments to bring tracks to life. updating soon...",
  },
} as const;

/** One song I want on the "on repeat" tab, named the way I'd say it out loud. */
export type OnRepeatSeed = {
  title: string;
  artist: string;
  /**
   * Optional override, for when the obvious search lands on the wrong thing —
   * a live cut, a remaster, someone else's cover. Paste the numeric id out of
   * any music.apple.com/…/song/…/<id> url and the search is skipped.
   */
  itunesId?: string;
  /** Copied onto the resolved track by /api/on-repeat. See `Track.message`. */
  message?: string;
};

/**
 * The "on repeat" list, written by hand.
 *
 * Spotify is not in this path on purpose: `preview_url` has come back null for
 * every app created after november 2024, so spotify can name a track but can
 * never voice one. The itunes search api needs no key and no auth, and hands
 * back artwork, album, duration and a 30 second preview for a plain
 * "artist title" query — so this list is just the names, and the route at
 * /api/on-repeat resolves them.
 *
 * Order here is the order on the tab. A row itunes cannot match is dropped
 * rather than listed dead.
 *
 * TODO: placeholder picks — replace with the real rotation.
 */
export const onRepeatSeeds: OnRepeatSeed[] = [
  {
    title: "Face Card",
    artist: "Nate Sib",
    message: "",
  },
  {
    title: "No Interviews",
    artist: "Lil Durk",
    message: "heard this when someone was blasting it on their yacht in chicago. such a sick song.",
  },
  {
    title: "Some Of Your Love",
    artist: "PARTYNEXTDOOR",
    message: "waited for this leak to release for SOO long. one of my fav late night tracks currently.",
  },
  {
    title: "Warmth",
    artist: "C418",
    message: "ifykyk, this is probably the best minecraft track out there. the ambience gets me locked in. listened to it while making this site lol.",
  },
  {
    title: "Never Let Go",
    artist: "Gurinder Gill",
    message: "the melody giving very nostaligic puna",
  },
  {
    title: "BLEED",
    artist: "Ryael",
    message: "",
  },
  {
    title: "Morni",
    artist: "Raf Saperra",
    message: "",
  },
  {
    title: "Rush",
    artist: "Odeal",
    message: "",
  },
  {
    title: "D1",
    artist: "Lil Tecca",
    message: "",
  },
  {
    title: "London Summers",
    artist: "Odeal",
    message: "",
  },
  {
    title: "Waiting For You",
    artist: "Majid Jordan",
    message: "",
  },
  {
    title: "Paradise",
    artist: "Avenoir",
    message: "",
  },

  {
    title: "Songhai",
    artist: "Avenoir",
    message: "",
  },
  {
    title: "Lady",
    artist: "Avenoir",
    message: "",
  },
  {
    title: "D4U",
    artist: "Avenoir",
    message: "",
  },
  {
    title: "Nights in The Sun",
    artist: "Odeal",
    message: "",
  },
    {
    title: "you need an angel",
    artist: "Chase Shakur",
    message: "",
  },
  {
    title: "Burning Bridges",
    artist: "Drake",
    message: "",
  },
  {
    title: "Firm Friends",
    artist: "Drake",
    message: "",
  },
  {
    title: "WNBA",
    artist: "Drake",
    message: "",
  },
  {
    title: "I'm Spent",
    artist: "Drake, Loe Shimmy",
    message: "",
  },
  {
    title: "ICEMAN FREESTYLE",
    artist: "Central Cee",
    message: "",
  },
  {
    title: "Virginia Beach",
    artist: "Drake",
    message: "",
  },
  {
    title: "Champagne Poetry",
    artist: "Drake",
    message: "",
  },
  {
    title: "Baldwin Park",
    artist: "Sonder",
    message: "",
  },
  {
    title: "plan b",
    artist: "Nettspend",
    message: "",
  },
  {
    title: "Coast to Coast",
    artist: "Maz B",
    message: "",
  },
  {
    title: "Forgive Me",
    artist: "Maz B",
    message: "",
  },
  {
    title: "Found",
    artist: "Maz B",
    message: "",
  },
  {
    title: "My Witness",
    artist: "Maz B",
    message: "",
  },
  {
    title: "White Collar Dreams",
    artist: "Maz B",
    message: "",
  },
  {
    title: "Star Girl",
    artist: "Navaan Sandhu, Mickey Singh, JayB Singh",
    message: "",
  },
  {
    title: "For A Reason",
    artist: "Karan Aujla, Ikky",
    message: "",
  },
  {
    title: "I'ma Do My Thiiing",
    artist: "Karan Aujla, Ikky",
    message: "",
  },
  {
    title: "Bachke Bachke - Unplugged",
    artist: "Karan Aujla",
    message: "",
  },
  {
    title: "Punjaban",
    artist: "Sukha, Manni Sandhu, Kahlon",
    message: "",
  },
  {
    title: "On The Loose",
    artist: "Sukha, Money Musik",
    message: "",
  },
  {
    title: "Vanjhali Vaja",
    artist: "Amrinder Gill",
    message: "",
  },
  {
    title: "Grateful",
    artist: "Bhalwaan, Manna Music",
    message: "",
  },
  {
    title: "Arz Kiya Hai | Coke Studio Bharat",
    artist: "Anuv Jain",
    message: "",
  },
  {
    title: "Gehra Hua",
    artist: "Shashwat Sachdev, Arijit Singh, Irshad Kamil, Armaan Khan",
    message: "",
  },
  {
    title: "GEEKIN",
    artist: "Nemzzz",
    message: "",
  },
  {
    title: "RAANI",
    artist: "Shergill, Virsa",
    message: "",
  },
];

/** Just the year, for the produced rows. */
export function trackYear(iso: string) {
  return iso.slice(0, 4);
}

/**
 * Total runtime of a list, in the coarse form a playlist header uses: minutes
 * up to an hour, then hours and minutes. Rows print mm:ss; a header printing
 * "1:12:04" would be reading out a stopwatch rather than saying how long the
 * thing is.
 */
export function runtime(seconds: number) {
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest > 0 ? `${hours} hr ${rest} min` : `${hours} hr`;
}

/**
 * mm:ss, shared by the rows and the dock so the two never drift apart.
 * Undefined means the length is genuinely unknown, which prints as dashes;
 * NaN is a duration that has not landed from the audio element yet, which
 * reads better as a zero counting up.
 */
export function clock(seconds: number | undefined) {
  if (seconds === undefined) return "--:--";
  if (!Number.isFinite(seconds)) return "0:00";
  const whole = Math.floor(seconds);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}
