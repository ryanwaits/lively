import type { NextConfig } from "next";
import path from "path";

const yjsPath = path.resolve(process.cwd(), "node_modules/yjs");

const nextConfig: NextConfig = {
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
