import type { NextConfig } from "next";

/*
  A single static page. `output: "export"` writes plain files to `out/`, so the
  site needs no server, no adapter and no runtime on any host.
*/
const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  // The app repo has its own lockfile above this folder; pin the site as root.
  turbopack: { root: import.meta.dirname },
  // The repo root already has AGENTS.md; do not generate a second one here.
  agentRules: false,
};

export default nextConfig;
