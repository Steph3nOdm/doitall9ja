import { expect, test } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { DEFAULT_MAIN_PATHS, readCsvEnv, toAbsoluteUrl } from "./helpers/config.js";
import { appendJsonl, timestamp, writeJson } from "./helpers/logger.js";
import { inspectLayout } from "./helpers/layout.js";

const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "tablet", width: 1024, height: 1366 },
  { name: "mobile", width: 390, height: 844 }
];

function slugify(value) {
  return value.replace(/[^a-z0-9]+/gi, "-").replace(/(^-|-$)/g, "").toLowerCase();
}

test.describe("Stage 3 - Responsiveness & Cross-Browser", () => {
  test("validate layout on desktop/tablet/mobile across configured browsers", async ({ page, baseURL }, testInfo) => {
    // Safari/WebKit can be slower for repeated full-page screenshots across many routes.
    test.setTimeout(360_000);
    const paths = readCsvEnv("MAIN_PATHS", DEFAULT_MAIN_PATHS);
    const targetUrls = paths.map((p) => toAbsoluteUrl(baseURL, p)).filter(Boolean);
    const issues = [];
    const checks = [];

    for (const viewport of VIEWPORTS) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });

      for (const url of targetUrls) {
        try {
          await page.goto(url, { waitUntil: "networkidle", timeout: 45_000 });
          const layoutIssues = await inspectLayout(page);
          const shotName = `${testInfo.project.name}-${viewport.name}-${slugify(new URL(url).pathname || "home")}.png`;
          const shotPath = path.join("artifacts", "screenshots", shotName);

          fs.mkdirSync(path.dirname(shotPath), { recursive: true });
          await page.screenshot({ path: shotPath, fullPage: true });
          checks.push({
            browser: testInfo.project.name,
            viewport: viewport.name,
            url,
            issueCount: layoutIssues.length,
            screenshot: shotPath
          });

          for (const item of layoutIssues) {
            issues.push({
              browser: testInfo.project.name,
              viewport: viewport.name,
              url,
              ...item
            });
          }
        } catch (error) {
          issues.push({
            browser: testInfo.project.name,
            viewport: viewport.name,
            url,
            type: "navigation-failure",
            detail: String(error)
          });
        }
      }
    }

    appendJsonl("stage3-responsive-log.jsonl", {
      time: timestamp(),
      stage: "stage3",
      project: testInfo.project.name,
      checks: checks.length,
      issues: issues.length
    });

    writeJson(`stage3-responsive-summary-${testInfo.project.name}.json`, {
      stage: "Stage 3 - Responsiveness & Cross-Browser",
      project: testInfo.project.name,
      checks,
      issues
    });

    expect.soft(issues, `Responsive/Cross-browser issues: ${JSON.stringify(issues, null, 2)}`).toHaveLength(0);
  });
});
