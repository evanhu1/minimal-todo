import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  use: { baseURL: "http://127.0.0.1:4173" },
  projects: [
    { name: "desktop", use: devices["Desktop Chrome"] },
    { name: "touch", use: devices["iPhone 13"] },
  ],
  webServer: {
    command: "python3 tests/serve_workspace.py",
    url: "http://127.0.0.1:4173",
    timeout: 240_000,
  },
});
