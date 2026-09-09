import createMDX from "@next/mdx";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
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