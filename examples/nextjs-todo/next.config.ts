import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  // Umbrel serves this app under /todo; Vercel serves it at the subdomain root.
  basePath: process.env.UMBREL_BUILD ? "/todo" : "",
  images: { unoptimized: true },
};

export default nextConfig;
