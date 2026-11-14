import { defineConfig } from "vite";

// In local development, /api calls are proxied to the Azure Functions host (func start, port 7071).
export default defineConfig({
  // Relative paths: the same build works on GitHub Pages both at the root (xxx.github.io)
  // and in a subfolder (xxx.github.io/kantama/), on Static Web Apps and locally.
  base: "./",
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:7071",
    },
  },
  build: {
    target: "es2022",
    outDir: "dist",
  },
});
