import type { NextConfig } from "next";
import path from "path";

const yjsPath = path.resolve(process.cwd(), "node_modules/yjs");

const nextConfig: NextConfig = {
  output: "export",
  // Umbrel serves this app under /notes; Vercel serves it at the subdomain root.
  basePath: process.env.UMBREL_BUILD ? "/notes" : "",
  images: { unoptimized: true },
  turbopack: {
    resolveAlias: {
      yjs: "./node_modules/yjs",
    },
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      yjs: yjsPath,
    };
    return config;
  },
};

export default nextConfig;
