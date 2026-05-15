import { expect, test } from "@playwright/test";
import { DEFAULT_MAIN_PATHS, readCsvEnv, toAbsoluteUrl } from "./helpers/config.js";
import { appendJsonl, timestamp, writeJson } from "./helpers/logger.js";
import { getLinksFromCurrentPage } from "./helpers/discovery.js";

test.describe("Stage 1 - Smoke Test", () => {
  test("main pages should return HTTP 200", async ({ page, request, baseURL }) => {
    const configuredPaths = readCsvEnv("MAIN_PATHS", DEFAULT_MAIN_PATHS);
    const staticUrls = configuredPaths.map((p) => toAbsoluteUrl(baseURL, p)).filter(Boolean);

    await page.goto(baseURL, { waitUntil: "domcontentloaded" });
    const discoveredUrls = await getLinksFromCurrentPage(page, baseURL);

    const targetUrls = [...new Set([...staticUrls, ...discoveredUrls])];
    const failures = [];
    const successes = [];

    for (const url of targetUrls) {
      const response = await request.get(url, { failOnStatusCode: false });
      const status = response.status();

      appendJsonl("stage1-smoke-log.jsonl", {
        time: timestamp(),
        stage: "stage1",
        url,
        status
      });

      if (status !== 200) {
        failures.push({ url, status });
      } else {
        successes.push({ url, status });
      }
    }

    writeJson("stage1-smoke-summary.json", {
      stage: "Stage 1 - Smoke Test",
      baseURL,
      checked: targetUrls.length,
      passed: successes.length,
      failed: failures.length,
      failures
    });

    expect.soft(failures, `Non-200 pages: ${JSON.stringify(failures, null, 2)}`).toHaveLength(0);
  });
});
