import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Pin the workspace root to this app so a stray lockfile in a parent
  // folder doesn't trigger Turbopack's "multiple lockfiles" warning.
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
