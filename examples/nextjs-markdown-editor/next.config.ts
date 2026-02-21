import type { NextConfig } from "next";
import path from "path";

// Force all yjs imports to resolve to a single instance.
// Bun workspace symlinks can cause the bundler to load yjs via different
// resolved paths, triggering the yjs double-init warning.
// See: https://github.com/yjs/yjs/issues/438
const yjsPath = path.resolve(process.cwd(), "node_modules/yjs");

const nextConfig: NextConfig = {
  turbopack: {
    resolveAlias: {
      // Turbopack needs a relative path (no absolute paths)
      yjs: "./node_modules/yjs",
      // Also alias the subpath imports that y-codemirror.next uses
      "yjs/src/internals": "./node_modules/yjs/src/internals",
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
