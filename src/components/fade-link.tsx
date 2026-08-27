"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ComponentProps } from "react";
import { closeCurtain, exitMs, motionWanted } from "@/components/curtain-state";

/**
 * A link that covers the screen before it navigates.
 *
 * Only trips to and from the room actually do anything: `exitMs` returns zero
 * for everything else, and a zero here means the click is left alone entirely
 * rather than run through the curtain with a duration of nothing, which would
 * paint one black frame on its way past.
 *
 * Safe to use for ordinary links for that reason, which is what lets the intro
 * copy keep rendering every `[label](/href)` span the same way.
 */
export function FadeLink({
  href,
  onClick,
  children,
  ...rest
}: ComponentProps<typeof Link>) {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <Link
      href={href}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented) return;

        // Anything but a plain left click is the browser's business: a new tab
        // or a new window is not this page fading anywhere.
        if (event.button !== 0) return;
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
          return;
        }

        const to = typeof href === "string" ? href : (href.pathname ?? "");
        const ms = exitMs(pathname, to);
        if (ms === 0 || !motionWanted()) return;

        event.preventDefault();
        void closeCurtain(ms).then(() => router.push(to));
      }}
      {...rest}
    >
      {children}
    </Link>
  );
}
