import { resolve } from "node:path";
import { defineConfig } from "vite";

const appRoot = __dirname;

export default defineConfig({
  base: "./",
  root: appRoot,
  build: {
    outDir: resolve(appRoot, "dist"),
    emptyOutDir: true,
  },
  server: {
    host: "127.0.0.1",
    port: 4174,
    proxy: {
      "/api": "http://127.0.0.1:4169",
    },
  },
});
