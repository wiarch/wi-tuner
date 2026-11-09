import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  reporter: "list",
  use: {
    trace: "retain-on-failure",
    ...devices["Desktop Chrome"],
  },
  webServer: [
    {
      command: "pnpm --filter @wi-tuner/app dev -- --host 127.0.0.1",
      url: "http://127.0.0.1:5173",
      reuseExistingServer: !process.env.CI,
    },
    {
      command: "pnpm --filter @wi-tuner/landing dev -- --host 127.0.0.1",
      url: "http://127.0.0.1:4321",
      reuseExistingServer: !process.env.CI,
    },
  ],
});

