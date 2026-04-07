import { resolve } from "node:path";
import { defineConfig } from "vite";
import solid from "vite-plugin-solid";

const appRoot = __dirname;

export default defineConfig({
  base: "./",
  root: appRoot,
  plugins: [solid()],
  build: {
    outDir: resolve(appRoot, "dist"),
    emptyOutDir: true,
  },
  server: {
    host: "127.0.0.1",
    port: 4175,
    proxy: {
      "/api": "http://127.0.0.1:4169",
    },
  },
});
