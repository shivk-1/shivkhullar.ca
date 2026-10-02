import createMDX from "@next/mdx";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  // Emits /music/index.html rather than /music.html. The host is a plain
  // file server: /music is also a directory (the art and tracks live under
  // it), so it redirects to /music/ and, finding no index.html there, answers
  // 403. Client-side navigation never asked for the html, which is why it
  // only broke on a fresh load or a shared link.
  trailingSlash: true,
  pageExtensions: ["ts", "tsx", "mdx"],
  images: {
    unoptimized: true,
  },
};

const withMDX = createMDX({
  options: {
    rehypePlugins: [["rehype-slug", {}]],
  },
});

export default withMDX(nextConfig);