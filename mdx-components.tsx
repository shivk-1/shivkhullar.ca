import type { MDXComponents } from "mdx/types";
import Image, { type ImageProps } from "next/image";

/**
 * Type scale for post bodies. Kept here rather than in a `prose` class so the
 * spacing matches the rest of the site instead of a plugin's defaults.
 */
export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    h2: (props) => (
      <h2
        className="mt-12 scroll-mt-8 border-t border-border pt-8 text-base font-bold sm:text-[17px]"
        {...props}
      />
    ),
    h3: (props) => (
      <h3 className="mt-8 text-base font-bold sm:text-[17px]" {...props} />
    ),
    p: (props) => (
      <p className="mt-4 text-base leading-[1.75] text-muted" {...props} />
    ),
    a: (props) => (
      <a
        className="link text-foreground"
        target={props.href?.startsWith("http") ? "_blank" : undefined}
        rel={props.href?.startsWith("http") ? "noreferrer noopener" : undefined}
        {...props}
      />
    ),
    ul: (props) => (
      <ul
        className="mt-4 list-disc space-y-1.5 pl-5 text-base leading-[1.75] text-muted marker:text-border"
        {...props}
      />
    ),
    ol: (props) => (
      <ol
        className="mt-4 list-decimal space-y-1.5 pl-5 text-base leading-[1.75] text-muted marker:text-border"
        {...props}
      />
    ),
    blockquote: (props) => (
      <blockquote
        className="mt-6 border-l-2 border-border pl-4 text-base leading-[1.75] text-muted italic"
        {...props}
      />
    ),
    code: (props) => (
      <code
        className="rounded bg-card px-1.5 py-0.5 font-mono text-[0.85em] text-foreground"
        {...props}
      />
    ),
    pre: (props) => (
      <pre
        className="mt-6 overflow-x-auto rounded-lg border border-border bg-card p-4 font-mono text-[13px] leading-[1.6] [&_code]:bg-transparent [&_code]:p-0"
        {...props}
      />
    ),
    hr: (props) => <hr className="mt-10 border-border" {...props} />,
    img: (props) => (
      <Image
        {...(props as ImageProps)}
        width={1200}
        height={750}
        className="mt-6 w-full rounded-lg border border-border"
        alt={props.alt ?? ""}
      />
    ),
    ...components,
  };
}
