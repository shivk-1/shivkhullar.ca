import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { PostContents } from "@/components/post-contents";
import { formatDate, getPost, getSlugs } from "@/lib/writing";
import { site } from "@/data/site";

type Params = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return getSlugs().map((slug) => ({ slug }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  if (!getSlugs().includes(slug)) return {};

  const post = getPost(slug);
  return {
    title: post.title,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: "article",
      publishedTime: post.date,
      images: post.cover ? [post.cover] : undefined,
    },
  };
}

export default async function PostPage({ params }: Params) {
  const { slug } = await params;
  if (!getSlugs().includes(slug)) notFound();

  const post = getPost(slug);
  const { default: Body } = await import(
    `../../../../content/writing/${slug}.mdx`
  );

  return (
    // Narrower than the rest of the site and centred: long-form wants a
    // shorter measure than the index and section pages
    <main className="mx-auto max-w-2xl pt-4 pb-24 sm:pt-8">
      <Link href="/writing" className="link text-[15px] text-muted">
        ← writing
      </Link>

      <article className="post mt-8">
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
          {post.title}
        </h1>

        {post.subtitle ? (
          <p className="mt-2 text-[17px] leading-relaxed text-muted sm:text-lg">
            {post.subtitle}
          </p>
        ) : null}

        <p className="mt-3 text-sm text-muted">
          {site.name} · {formatDate(post.date)} · {post.readTime}
        </p>

        {post.headings.length > 1 ? (
          <PostContents headings={post.headings} />
        ) : null}

        <Body />
      </article>
    </main>
  );
}
