import Link from "next/link";
import type { Metadata } from "next";
import { WritingList } from "@/components/writing-list";
import { getPosts } from "@/lib/writing";
import { site } from "@/data/site";

export const metadata: Metadata = {
  title: "writing",
  description: `things ${site.shortName} has written.`,
};

export default function WritingIndex() {
  const posts = getPosts();

  return (
    <main className="pt-4 pb-20 sm:pt-8">
      <Link href="/" className="link text-[15px] text-muted">
        ← {site.name}
      </Link>

      <h1 className="mt-8 text-base font-bold sm:text-[17px]">writing</h1>

      <div className="mt-6">
        <WritingList posts={posts} />
      </div>
    </main>
  );
}
