import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "../../playwright",
  workers: 1,
  timeout: 120000,
  expect: {
    timeout: 15000,
  },
  use: {
    baseURL: "http://127.0.0.1:4173",
    headless: true,
  },
  webServer: {
    command: "pnpm --dir ../.. sample:build && pnpm serve",
    port: 4173,
    reuseExistingServer: true,
    timeout: 120000,
  },
});