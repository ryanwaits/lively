import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  // Umbrel serves this app under /board; Vercel serves it at the subdomain root.
  basePath: process.env.UMBREL_BUILD ? "/board" : "",
  images: { unoptimized: true },
};

export default nextConfig;
