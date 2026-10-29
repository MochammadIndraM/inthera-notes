import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // UI tests use their own dev cache/lock so localhost:3000 can keep running.
  distDir: process.env.INTHERA_UI_TEST === "1" ? ".next-e2e" : ".next",
  experimental: {
    agentFeedback: true,
  },
  // Private, session-bound pages are rendered per request; no shared data cache.
  cacheComponents: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
