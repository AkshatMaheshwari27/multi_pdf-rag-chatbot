import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdf-parse (via pdfjs-dist) loads a worker file from a path relative to
  // its own package on disk; bundling it breaks that lookup, so keep it
  // external and let Node `require` it directly instead.
  serverExternalPackages: ["pdf-parse", "pdfjs-dist"],
};

export default nextConfig;
