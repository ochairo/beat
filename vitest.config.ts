import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

const pulseSource = resolve(__dirname, "../pulse/src/index.ts");

export default defineConfig({
  resolve: {
    alias: existsSync(pulseSource) ? { "@ochairo/pulse": pulseSource } : {},
  },
  test: {
    environment: "happy-dom",
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
    exclude: ["dist/**", "playwright/**", "tests/create-beat.test.ts"],
  },
});
