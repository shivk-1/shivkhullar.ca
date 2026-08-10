import Link from "next/link";
import { formatDate, type Post } from "@/lib/writing";

/** Post rows, same shape as the experience and project rows. */
export function WritingList({ posts }: { posts: Post[] }) {
  if (posts.length === 0) {
    return <p className="text-[15px] text-muted">nothing published yet.</p>;
  }

  return (
    <ul className="space-y-6">
      {posts.map((post) => (
        <li key={post.slug}>
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <p className="text-[15px] font-medium sm:text-base">
              <Link href={`/writing/${post.slug}`} className="link">
                {post.title}
              </Link>
            </p>
            <p className="text-sm text-muted tabular-nums">
              {formatDate(post.date)}
            </p>
          </div>
          <p className="mt-1.5 max-w-3xl text-[15px] leading-relaxed text-muted">
            {post.excerpt}
          </p>
        </li>
      ))}
    </ul>
  );
}
