import { resolve } from "node:path";
import { defineConfig } from "vite";
import { createBeatVitePlugin } from "../../src/vite-plugin.js";

const appRoot = __dirname;
const packageRoot = resolve(appRoot, "../..");

export default defineConfig({
  resolve: {
    alias: {
      "@ochairo/pulse": resolve(packageRoot, "../pulse/src/index.ts"),
    },
  },
  plugins: [
    createBeatVitePlugin({
      packageRoot,
    }),
  ],
  base: "./",
  root: appRoot,
  build: {
    outDir: resolve(appRoot, "dist"),
    emptyOutDir: true,
  },
  server: {
    host: "127.0.0.1",
    port: 4173,
    proxy: {
      "/api": "http://127.0.0.1:4169",
    },
  },
});
