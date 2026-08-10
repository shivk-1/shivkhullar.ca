"use client";

import { useEffect, useRef, useState } from "react";
import type { Post } from "@/lib/writing";

/**
 * Contents list that sits inline at the top of a post, plus a rail that fades
 * in on the left once that inline copy scrolls out of view, and back out when
 * it returns. The rail only appears on screens wide enough to have gutter
 * space beside the centred article.
 */
export function PostContents({ headings }: { headings: Post["headings"] }) {
  const inlineRef = useRef<HTMLElement>(null);
  const [railVisible, setRailVisible] = useState(false);

  useEffect(() => {
    const el = inlineRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => setRailVisible(!entry.isIntersecting),
      { threshold: 0 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <nav ref={inlineRef} aria-label="contents" className="mt-8">
        <p className="text-sm text-muted">contents</p>
        <ul className="mt-2 space-y-1">
          {headings.map((h) => (
            <li key={h.id}>
              <a href={`#${h.id}`} className="link text-[15px] text-muted">
                {h.text}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <aside
        aria-hidden={!railVisible}
        className={`fixed top-1/2 left-6 hidden max-h-[70vh] w-52 -translate-y-1/2 overflow-y-auto transition-opacity duration-300 xl:block 2xl:left-12 ${
          railVisible ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <p className="text-xs text-muted">contents</p>
        <ul className="mt-2 space-y-1.5">
          {headings.map((h) => (
            <li key={h.id}>
              <a
                href={`#${h.id}`}
                tabIndex={railVisible ? undefined : -1}
                className="block text-[13px] leading-snug text-muted transition-colors hover:text-foreground"
              >
                {h.text}
              </a>
            </li>
          ))}
        </ul>
      </aside>
    </>
  );
}
