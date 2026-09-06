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
  /**
   * ISO release date, when it is known. Nothing renders it — it exists so the
   * list can be ordered by age. Pulled rows get itunes' `releaseDate`; mine
   * carry the day I finished them.
   */
  released?: string;
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
 * One of mine. Carries the one thing a pulled row cannot: a line about what
 * it is, which is only ever shown on the produced tab — which is why it lives
 * here rather than on `Track`.
 */
export type ProducedTrack = Track & {
  source: "produced";
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
    released: "2023-08-14",
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
    released: "2023-06-02",
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
    released: "2023-03-27",
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
    released: "2023-01-19",
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
    released: "2022-10-08",
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
    released: "2022-07-21",
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
    released: "2022-05-05",
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
    released: "2022-02-11",
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
    released: "2021-11-30",
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
    released: "2021-09-16",
    note: "80 bpm.",
  },
];

/**
 * Newest first. The tab shuffles this on load, so what this ordering really
 * buys is a stable, sensible server render before the client reorders.
 */
export const producedTracks: ProducedTrack[] = [...produced].sort((a, b) =>
  (a.released ?? "") < (b.released ?? "") ? 1 : -1,
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
    kind: "playlist",
    lead: "my top 40 songs in rotation.",
    body: "updated every month.",
  },
  produced: {
    kind: "productions",
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
    message: "the melody gives very early 2020's punjabi vibes. one of my new fav's by GG.",
  },
  {
    title: "BLEED",
    artist: "Ryael",
    message: "was first introduced to him at avenoir's concert. one of the most beautiful voices i have ever heard. i recommend checking out his music.",
  },
  {
    title: "Morni",
    artist: "Raf Saperra",
    message: "been doing bhangra for a little over a month and this is by far my fav song to dance on. can mix up a variety of moves, and ofc, the morni (peacoock).",
  },
  {
    title: "Rush",
    artist: "Odeal",
    message: "one of odeals new drops, it is soo good. i always love his use of percussion, mixed with the unique chord progressions. 9.1/10",
  },
  {
    title: "D1",
    artist: "Lil Tecca",
    message: "this hits everytime im in the car, probably one of my hype songs right now. first discovered this while i was still playing soccer, but still never misses.",
  },
  {
    title: "London Summers",
    artist: "Odeal",
    message: "im a big fan of afrobeats, and odeal only perfects it. this song was playing everyday in summer, and still portrays my love for his percussion.",
  },
  {
    title: "Waiting For You",
    artist: "Majid Jordan",
    message: "there's acc a vlog that exists abt the production of this song. this is arguably one of my favourite 'chill' songs. the tempo, drums, and lead melody all met with naomi sharons vocals make it one of a kind. give it a listen.",
  },
  {
    title: "Paradise",
    artist: "Avenoir",
    message: "top 3 intros ever. this album gives me so much nostaliga to september of first year uni. going to DC library, fall time, this is the perfect song.",
  },

  {
    title: "Songhai",
    artist: "Avenoir",
    message: "a continuation of an album i believe is perfect. there are no words to describe the beauty of this album. one of my personal favourites.",
  },
  {
    title: "Lady",
    artist: "Avenoir",
    message: "a really cool, higher-energy song from avenoir that hits every time. loved when he performed this live 2 metres infront of me lol.",
  },
  {
    title: "D4U",
    artist: "Avenoir",
    message: "the dark vibes of avenoir. love this song for a late night drive, and was one of the first songs i've heard by him. one of the best decisions ever.",
  },
  {
    title: "Nights in The Sun",
    artist: "Odeal",
    message: "a new collab with odela and wizkid, this is one of the top songs im bumping this summer.",
  },
    {
    title: "you need an angel",
    artist: "Chase Shakur",
    message: "this song means a lot to me. its my confort song, helps me with my stress, and i play this when i need to wind down. i go for long walks and talk to myself while this song plays. have a listen :P",
  },
  {
    title: "Burning Bridges",
    artist: "Drake",
    message: "crazy disses and even crazier catch.",
  },
  {
    title: "Firm Friends",
    artist: "Drake",
    message: "all collabs with drake and conductor are FIRE idc what anyone says. drake drops absolute bars here and conductor signs it off.",
  },
  {
    title: "WNBA",
    artist: "Drake",
    message: "probably one of my fav off of habibti, i just like the bass here lol. low frequency's are hittinggg on my bose quietcomforts.",
  },
  {
    title: "I'm Spent",
    artist: "Drake, Loe Shimmy",
    message: "what if i go broke and i got no more racks to spend on youuuuu",
  },
  {
    title: "ICEMAN FREESTYLE",
    artist: "Central Cee",
    message: "when this played during one of drake's livestreams for iceman rollout, i knew this was a banger. missed that style of cench until we got this.",
  },
  {
    title: "Virginia Beach",
    artist: "Drake",
    message: "fall is cominggg, so you know what time it isss. i love this album with my heart, such nostalgia to october 2023.",
  },
  {
    title: "Champagne Poetry",
    artist: "Drake",
    message: "one of my all time favs from the boy. spits so beautifully on this, and the sample breakdown to this song makes me reevaluate the capabilities of his producers.",
  },
  {
    title: "Baldwin Park",
    artist: "Sonder",
    message: "one of my late night grind songs. brilliant slow beat, and gets me in the mood to lock in everytime.",
  },
  {
    title: "plan b",
    artist: "Nettspend",
    message: "a previosuly leaked nettspend song, im glad it finally dropped. i like ug music so hearing this was insane.",
  },
  {
    title: "Coast to Coast",
    artist: "Maz B",
    message: "new drop by maz, this has the bossanova flow to it. happy to hear a different vibe by maz here.",
  },
  {
    title: "Forgive Me",
    artist: "Maz B",
    message: "the song speaks for itself. his songs always get me feeling a type of way. ",
  },
  {
    title: "Found",
    artist: "Maz B",
    message: "sounds like rc20 slapped on the song. i love the vintage sound to this. this song genuinely brings tears to my eyes.",
  },
  {
    title: "My Witness",
    artist: "Maz B",
    message: "again, one of the best intro's i've heard on an album. this one got a mysterious vibe to it and sets up the album perfectly. check it out.",
  },
  {
    title: "White Collar Dreams",
    artist: "Maz B",
    message: "the guitar flow switch midway is what keeps me waiting in this song. not to mention the outro, BEAUTIFUL. plz listen to this thanks.",
  },
  {
    title: "Star Girl",
    artist: "Navaan Sandhu, Mickey Singh, JayB Singh",
    message: "punjabi songs are never pop/melodically oriented, but this one felt different, especially with the chorus. love blasting this in the car.",
  },
  {
    title: "For A Reason",
    artist: "Karan Aujla, Ikky",
    message: "spoke to ikky (producer) 2 years back. he said the shift to live instruments makes the song real, which i am currently doing, and which is evident here. one of my favs by karan.",
  },
  {
    title: "I'ma Do My Thiiing",
    artist: "Karan Aujla, Ikky",
    message: "another song to blast in the car. makes me feel like a guyyyy.",
  },
  {
    title: "Bachke Bachke - Unplugged",
    artist: "Karan Aujla",
    message: "one of the 3 unplugged songs that are performed with such eloquence. i think karan is definitely top 5 punjabi lyricists, and you can see it here. one of my favs.",
  },
  {
    title: "Punjaban",
    artist: "Sukha, Manni Sandhu, Kahlon",
    message: "bhangra goes crazyyy on this song. word for word bar for bar, gets me hype everytime.",
  },
  {
    title: "On The Loose",
    artist: "Sukha, Money Musik",
    message: "never expected money to pop out with this type of beat honestly. tuff song though.",
  },
  {
    title: "Vanjhali Vaja",
    artist: "Amrinder Gill",
    message: "one of the bestttt songs to do jhummar (type of bhangra) on. slow, melodic, and amrinder gill has such gracious lyrics. ",
  },
  {
    title: "Grateful",
    artist: "Bhalwaan, Manna Music",
    message: "just got on this song. manna did his thing with the melody.",
  },
  {
    title: "Arz Kiya Hai | Coke Studio Bharat",
    artist: "Anuv Jain",
    message: "anuv jain is my go to for winters and rainy day cozy study sessions. i miss the old him before he got married though, thats when the real emotional songs were coming along.",
  },
  {
    title: "Gehra Hua",
    artist: "Shashwat Sachdev, Arijit Singh, Irshad Kamil, Armaan Khan",
    message: "this movie is probably my favourite bollywood movie ever, and this song in the movie adds percetly to the scenes it covers. arijit singh once again delivers with the poetry and another banger added to his list.",
  },
  {
    title: "GEEKIN",
    artist: "Nemzzz",
    message: "when im running soccer with my boys, this is the song im blasting lol. when you think of uk soccer and edits, you're hundred percent think of nemzzz.",
  },
  {
    title: "RAANI",
    artist: "Shergill, Virsa",
    message: "fun fact: i played against this guy in school soccer lmao. great player but now he's popping out with greater songs. commends to shergill and hope to see him go big.",
  },
];
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
