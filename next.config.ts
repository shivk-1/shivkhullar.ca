import createMDX from "@next/mdx";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  pageExtensions: ["ts", "tsx", "mdx"],
  images: {
    // Placeholder art in /public is SVG. next/image refuses to optimize SVG
    // unless this is enabled. Safe here because every image is first-party;
    // drop these three lines once real raster assets replace the placeholders.
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
};

const withMDX = createMDX({
  options: {
    // Gives every heading an id so the table of contents can link to it.
    // Named rather than imported: turbopack requires serializable loader options.
    rehypePlugins: [["rehype-slug", {}]],
  },
});

export default withMDX(nextConfig);
