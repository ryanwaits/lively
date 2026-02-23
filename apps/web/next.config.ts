import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@waits/lively-client",
    "@waits/lively-react",
    "@waits/lively-ui",
  ],
};

export default nextConfig;
