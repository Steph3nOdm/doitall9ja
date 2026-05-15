import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.BASE_URL || "https://doitall9ja.com";
const enableFirefox = process.env.ENABLE_FIREFOX === "1";
const enableWebkit = process.env.ENABLE_WEBKIT === "1";

const projects = [
  {
    name: "chrome",
    use: {
      ...devices["Desktop Chrome"],
      channel: "chrome"
    }
  },
  {
    name: "edge",
    use: {
      ...devices["Desktop Chrome"],
      channel: "msedge"
    }
  }
];

if (enableFirefox) {
  projects.push({
    name: "firefox",
    use: {
      ...devices["Desktop Firefox"]
    }
  });
}

if (enableWebkit) {
  projects.push({
    name: "safari",
    use: {
      ...devices["Desktop Safari"]
    }
  });
}

export default defineConfig({
  testDir: "./tests",
  outputDir: ".pw-output",
  timeout: 120_000,
  expect: {
    timeout: 12_000
  },
  fullyParallel: false,
  workers: 1,
  retries: 1,
  reporter: [
    ["list"],
    ["html", { outputFolder: ".pw-reports/html-report", open: "never" }],
    ["json", { outputFile: ".pw-reports/playwright-results.json" }]
  ],
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    ignoreHTTPSErrors: true
  },
  projects
});
