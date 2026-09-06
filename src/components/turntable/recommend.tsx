"use client";

import { useId, useState } from "react";

/**
 * The recommend tab's panel: a name, a song, and room to say why.
 *
 * A real <form> with a submit button, unlike the search field a tab over —
 * that one filters as it is typed and has nothing to submit, this one is the
 * one place on the page where pressing enter is supposed to do something.
 *
 * Sends to /api/recommend, which mails it to me. Nothing is stored and
 * nothing is listed back: the tab is a slot, and what comes out the other end
 * is a row on the rotation tab with the sender's name on it, put there by
 * hand.
 */
export function Recommend() {
  // Ids for the labels. Generated rather than written because the panel is
  // mounted once but the component is not the only form on the page's tree.
  const base = useId();
  const [name, setName] = useState("");
  const [song, setSong] = useState("");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState("");

  /**
   * Idle until it is sent, and "sent" is terminal — the form is replaced by a
   * thank-you rather than cleared and handed back, so a second submission is
   * a deliberate act rather than a stray second click on a button that looks
   * exactly as it did the first time.
   */
  const [state, setState] = useState<"idle" | "sending" | "sent" | "failed">(
    "idle",
  );
  const [error, setError] = useState("");

  const filled = name.trim().length > 0 && song.trim().length > 0;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!filled || state === "sending") return;

    setState("sending");
    setError("");

    try {
      const response = await fetch("/api/recommend", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, song, message, website }),
      });

      if (!response.ok) {
        const { error: reason } = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        setError(reason ?? "something went wrong. try again in a bit.");
        setState("failed");
        return;
      }

      setState("sent");
    } catch {
      // A dead network, an offline tab, a blocked request. None of it is
      // worth naming precisely; what matters is that nothing was sent.
      setError("couldn't reach the server. check your connection?");
      setState("failed");
    }
  }

  if (state === "sent") {
    return (
      <div className="px-3 py-10 text-center">
        <p className="text-[15px] font-semibold text-white">got it, {name}.</p>
        <p className="mx-auto mt-2 max-w-xs text-[12.5px] leading-relaxed text-white/45">
          if it sticks it lands on the rotation tab with your name on it.
        </p>
        <button
          type="button"
          onClick={() => {
            setSong("");
            setMessage("");
            setState("idle");
          }}
          // The name stays. Someone sending a second song is the same person,
          // and asking them to type it again is asking them not to bother.
          className="mt-5 rounded-lg bg-white/[0.08] px-3.5 py-2 text-[12.5px] font-medium text-white/70 transition-colors hover:bg-white/[0.13] hover:text-white"
        >
          send another
        </button>
      </div>
    );
  }

  return (
    // Positioned so the honeypot below is offset from this form rather than
    // from whatever ancestor happens to be positioned, which is what keeps it
    // from dragging a scrollbar onto the page it escapes into.
    <form
      onSubmit={submit}
      className="relative flex flex-col gap-3.5 px-3 py-3"
    >
      <Field
        id={`${base}-name`}
        label="your name"
        value={name}
        onChange={setName}
        placeholder="who's asking"
        maxLength={60}
        autoComplete="name"
      />
      <Field
        id={`${base}-song`}
        label="the song"
        value={song}
        onChange={setSong}
        placeholder="title — artist"
        maxLength={160}
      />
      <Field
        id={`${base}-message`}
        label="why"
        value={message}
        onChange={setMessage}
        placeholder="optional. what should i be listening for?"
        maxLength={600}
        multiline
      />

      {/* The bot trap. Off screen rather than display:none, because a headless
          browser reads computed styles and a hidden input is the giveaway;
          tabindex and aria-hidden keep it away from keyboards and readers. */}
      <input
        type="text"
        name="website"
        value={website}
        onChange={(event) => setWebsite(event.target.value)}
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="pointer-events-none absolute left-[-9999px] size-px opacity-0"
      />

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={!filled || state === "sending"}
          className="rounded-lg bg-white/[0.12] px-3.5 py-2 text-[13px] font-medium text-white transition-colors hover:bg-white/[0.18] disabled:cursor-not-allowed disabled:bg-white/[0.05] disabled:text-white/30"
        >
          {state === "sending" ? "sending…" : "send it over"}
        </button>

        {/* Polite, not assertive: nothing here is urgent enough to cut into
            whatever a screen reader is already saying. */}
        <p role="status" className="text-[12.5px] text-white/45">
          {state === "failed" ? error : ""}
        </p>
      </div>
    </form>
  );
}

/**
 * One labelled field. The label is visible rather than a placeholder doing
 * double duty — a placeholder disappears the moment it is needed most, which
 * is while the field is being filled in.
 */
function Field({
  id,
  label,
  value,
  onChange,
  placeholder,
  maxLength,
  autoComplete,
  multiline,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  maxLength: number;
  autoComplete?: string;
  multiline?: boolean;
}) {
  const shared = {
    id,
    value,
    placeholder,
    maxLength,
    onChange: (
      event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    ) => onChange(event.target.value),
    className:
      "w-full rounded-lg bg-white/[0.06] px-2.5 py-2 text-[13px] text-white placeholder:text-white/30 focus:bg-white/[0.09] focus:outline-none",
  };

  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40"
      >
        {label}
      </label>
      {multiline ? (
        <textarea
          {...shared}
          rows={3}
          className={`${shared.className} resize-none`}
        />
      ) : (
        <input {...shared} type="text" autoComplete={autoComplete} />
      )}
    </div>
  );
}
