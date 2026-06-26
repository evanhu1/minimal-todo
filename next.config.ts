import type { NextConfig } from "next";

// `output: "export"` compiles the whole app to static HTML/JS/CSS in `out/`.
// There is no server, no serverless function, and no runtime config — which is
// exactly what makes it deployable one-click to Vercel, Netlify, GitHub Pages,
// Cloudflare Pages, or any static file host.
const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  // Lets `out/` be served from a subpath (e.g. GitHub Pages project sites).
  // Leave empty for root-domain hosting like Vercel.
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || "",
};

export default nextConfig;
