import { NextResponse } from "next/server";
import { site } from "@/data/site";

/**
 * The recommend tab's inbox.
 *
 * There is no database behind this on purpose. A recommendation is only ever
 * read once — by me, deciding whether it earns a row on the rotation tab —
 * and a store would mean building a second, private page to read it from.
 * Email is the store: it lands where I already look, and the seed I write
 * into src/data/music.ts afterwards is the permanent record.
 *
 * Resend does the sending, provisioned through the vercel marketplace. Its
 * rest api is called directly rather than through the sdk — one fetch against
 * one endpoint is not worth a dependency in a repo that otherwise has none.
 */

/** Nothing here is cached or prerendered; every request sends a mail. */
export const dynamic = "force-dynamic";

/**
 * Field ceilings, enforced server side because the client's `maxLength` is a
 * suggestion to a browser and nothing more. Long enough for anything written
 * in earnest, short enough that the mail cannot be used as a megaphone.
 */
const LIMITS = { name: 60, song: 160, message: 600 } as const;

type Submission = {
  name: string;
  song: string;
  message: string;
};

/**
 * Collapses whitespace and cuts to length. Newlines go too: every field here
 * is one line, and stripping them means the mail body below cannot be forged
 * into looking like it has extra sections.
 */
function clean(value: unknown, limit: number) {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim().slice(0, limit);
}

/** The mail I actually receive. Plain text — it is three fields. */
function body({ name, song, message }: Submission) {
  const lines = [`from: ${name}`, `song: ${song}`];
  if (message) lines.push("", message);
  return lines.join("\n");
}

export async function POST(request: Request) {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    return NextResponse.json(
      { error: "the recommendation box isn't wired up yet." },
      { status: 503 },
    );
  }

  let payload: Record<string, unknown>;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "malformed request." }, { status: 400 });
  }

  // A field no human can see and no human fills in. Anything in it is a bot
  // that walked the form, and it gets a 200 with nothing sent — a rejection
  // tells the next attempt what to leave blank.
  if (clean(payload.website, 200)) return NextResponse.json({ ok: true });

  const submission: Submission = {
    name: clean(payload.name, LIMITS.name),
    song: clean(payload.song, LIMITS.song),
    message: clean(payload.message, LIMITS.message),
  };

  if (!submission.name || !submission.song) {
    return NextResponse.json(
      { error: "a name and a song, at least." },
      { status: 400 },
    );
  }

  // Verified sending domains cost a dns record; until one is set up, resend's
  // shared address delivers to the account's own owner, which is exactly and
  // only where this mail is going.
  const from = process.env.RECOMMEND_FROM ?? "onboarding@resend.dev";

  const sent = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${key}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      from: `music wall <${from}>`,
      to: [site.email],
      subject: `${submission.name} recommends ${submission.song}`,
      text: body(submission),
    }),
  });

  if (!sent.ok) {
    // The reason stays in the log. Whatever resend says about a rejected
    // key or an unverified domain is my problem, not the sender's, and
    // repeating it into the page would leak how the box is put together.
    console.error("recommend: resend refused", sent.status, await sent.text());
    return NextResponse.json(
      { error: "couldn't send that. try again in a bit." },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true });
}
