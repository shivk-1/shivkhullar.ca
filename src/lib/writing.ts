import fs from "node:fs";
import path from "node:path";
import readingTime from "reading-time";

/** Frontmatter each post exports as `meta` from its .mdx file. */
export type PostMeta = {
  title: string;
  /** Deck line under the title */
  subtitle?: string;
  /** ISO date, e.g. "2026-08-01" */
  date: string;
  excerpt: string;
  cover?: string;
};

export type Post = PostMeta & {
  slug: string;
  /** e.g. "10 min read", computed at build from word count */
  readTime: string;
  /** h2 headings, for the contents rail */
  headings: { id: string; text: string }[];
};

const CONTENT_DIR = path.join(process.cwd(), "content", "writing");

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

/** Pull `export const meta = {...}` out of the raw source without executing it. */
function parseMeta(source: string, slug: string): PostMeta {
  const match = source.match(/export\s+const\s+meta\s*=\s*(\{[\s\S]*?\n\})/);
  if (!match) throw new Error(`${slug}.mdx is missing an exported meta object`);
  // The object is a literal in our own content, so evaluating it is safe here
  // and avoids pulling in a full JS parser at build time.
  return Function(`"use strict"; return (${match[1]})`)() as PostMeta;
}

/** Body text only, with the meta export and code fences stripped. */
function bodyOf(source: string) {
  return source
    .replace(/export\s+const\s+meta\s*=\s*\{[\s\S]*?\n\}/, "")
    .replace(/```[\s\S]*?```/g, "");
}

function headingsOf(source: string) {
  return [...bodyOf(source).matchAll(/^##\s+(.+)$/gm)].map((m) => ({
    id: slugify(m[1]),
    text: m[1],
  }));
}

export function getSlugs(): string[] {
  if (!fs.existsSync(CONTENT_DIR)) return [];
  return fs
    .readdirSync(CONTENT_DIR)
    .filter((f) => f.endsWith(".mdx"))
    .map((f) => f.replace(/\.mdx$/, ""));
}

export function getPost(slug: string): Post {
  const source = fs.readFileSync(path.join(CONTENT_DIR, `${slug}.mdx`), "utf8");
  return {
    ...parseMeta(source, slug),
    slug,
    readTime: readingTime(bodyOf(source)).text,
    headings: headingsOf(source),
  };
}

/** Every post, newest first. */
export function getPosts(): Post[] {
  return getSlugs()
    .map(getPost)
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function formatDate(iso: string) {
  return new Date(`${iso}T00:00:00`)
    .toLocaleDateString("en-US", { month: "short", year: "numeric" })
    .toLowerCase();
}
