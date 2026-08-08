import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Placeholder art in /public is SVG. next/image refuses to optimize SVG
    // unless this is enabled. Safe here because every image is first-party;
    // drop these three lines once real raster assets replace the placeholders.
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
};

export default nextConfig;
