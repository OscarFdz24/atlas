import { defineConfig } from "astro/config";

// Placeholder until phase 5 assigns the real Cloudflare Pages URL. It only
// affects absolute URLs in the sitemap and canonical tags.
const SITE = process.env.SITE_URL ?? "https://atlas.pages.dev";

export default defineConfig({
  site: SITE,
  output: "static",
  build: {
    format: "directory",
  },
});
