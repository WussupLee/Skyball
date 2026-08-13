import { defineConfig } from "vite";

export default defineConfig({
  // GitHub Pages serves this repository from /Skyball/. Keep relative paths
  // for local development and ZIP usage, while emitting the repository
  // subpath in GitHub Actions production builds.
  base: process.env.GITHUB_ACTIONS ? "/Skyball/" : "./",
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
