import path from "node:path";
import { defineConfig, devices } from "@playwright/test";

const tone = path.resolve("tests/e2e/fixtures/a440.wav").replaceAll("\\", "/");

export default defineConfig({
    testDir: "./tests/e2e",
    fullyParallel: true,
    reporter: "list",
    timeout: 30_000,
    use: {
        trace: "retain-on-failure",
        locale: "es-ES",
        ...devices["Desktop Chrome"],
        launchOptions: {
            args: [
                "--use-fake-ui-for-media-stream",
                "--use-fake-device-for-media-stream",
                `--use-file-for-fake-audio-capture=${tone}`,
            ],
        },
    },
    webServer: [
        {
            command:
                "corepack pnpm --filter @wi-tuner/app exec vite --host 127.0.0.1 --port 5173",
            url: "http://127.0.0.1:5173",
            reuseExistingServer: !process.env.CI,
            timeout: 120_000,
        },
        {
            command:
                "corepack pnpm --filter @wi-tuner/landing exec astro dev --host 127.0.0.1 --port 4321",
            url: "http://127.0.0.1:4321",
            reuseExistingServer: !process.env.CI,
            timeout: 120_000,
            env: {
                PUBLIC_APP_URL: "http://127.0.0.1:5173/",
                ASTRO_TELEMETRY_DISABLED: "1",
            },
        },
    ],
});
