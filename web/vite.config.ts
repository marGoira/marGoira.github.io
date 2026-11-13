import { defineConfig } from "vite";

// Paikallisessa kehityksessä /api-kutsut ohjataan Azure Functions -hostille (func start, portti 7071).
export default defineConfig({
  // Suhteelliset polut: sama build toimii GitHub Pagesissa sekä juuressa (xxx.github.io)
  // että alikansiossa (xxx.github.io/kantama/), Static Web Appsissa ja paikallisesti.
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
