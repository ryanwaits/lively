import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  basePath: "/board",
  images: { unoptimized: true },
};

export default nextConfig;
