import { defineConfig, devices } from "@playwright/test";
const external = process.env.BASE_URL;
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: external || "http://127.0.0.1:5173",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "mobile-chromium",
      use: { ...devices["iPhone 13"], defaultBrowserType: "chromium" },
    },
  ],
  webServer: external
    ? undefined
    : {
        command: "npm run dev -- --port 5173",
        url: "http://127.0.0.1:5173",
        // Lets the study test exercise the upload; the request is intercepted.
        env: { VITE_SHEETS_URL: "https://script.google.com/macros/s/test/exec" },
        reuseExistingServer: !process.env.CI,
      },
});
