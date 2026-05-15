import { expect, test } from "@playwright/test";
import { DEFAULT_MAIN_PATHS, readCsvEnv, toAbsoluteUrl } from "./helpers/config.js";
import { appendJsonl, timestamp, writeJson } from "./helpers/logger.js";

const LOAD_EVENT_THRESHOLD_MS = Number(process.env.PERF_LOAD_EVENT_THRESHOLD_MS || 13_000);

async function capturePagePerformance(page, url) {
  await page.goto(url, { waitUntil: "networkidle", timeout: 45_000 });

  return page.evaluate(() => {
    const nav = performance.getEntriesByType("navigation")[0];
    const paints = performance.getEntriesByType("paint");
    const resources = performance
      .getEntriesByType("resource")
      .map((entry) => ({
        name: entry.name,
        initiatorType: entry.initiatorType,
        duration: Number(entry.duration.toFixed(2)),
        transferSize: entry.transferSize || 0
      }))
      .sort((a, b) => b.duration - a.duration);

    return {
      navigation: nav
        ? {
            ttfbMs: Number(nav.responseStart.toFixed(2)),
            domContentLoadedMs: Number(nav.domContentLoadedEventEnd.toFixed(2)),
            loadEventMs: Number(nav.loadEventEnd.toFixed(2))
          }
        : null,
      paints: paints.map((paint) => ({
        name: paint.name,
        startTime: Number(paint.startTime.toFixed(2))
      })),
      slowAssets: resources.filter((entry) => entry.duration > 400).slice(0, 15)
    };
  });
}

test.describe("Stage 4 - Performance Testing", () => {
  test("measure load and render metrics for key pages", async ({ page, baseURL }) => {
    const urls = readCsvEnv("MAIN_PATHS", DEFAULT_MAIN_PATHS)
      .map((path) => toAbsoluteUrl(baseURL, path))
      .filter(Boolean)
      .slice(0, 12);

    const results = [];
    const failures = [];

    for (const url of urls) {
      try {
        const metrics = await capturePagePerformance(page, url);
        results.push({ url, metrics });

        if (!metrics.navigation) {
          failures.push({ url, issue: "navigation-timing-missing" });
          continue;
        }

        if (metrics.navigation.loadEventMs > LOAD_EVENT_THRESHOLD_MS) {
          failures.push({ url, issue: "slow-load-event", loadEventMs: metrics.navigation.loadEventMs });
        }
      } catch (error) {
        failures.push({ url, issue: "performance-capture-failed", error: String(error) });
      }
    }

    appendJsonl("stage4-performance-log.jsonl", {
      time: timestamp(),
      stage: "stage4",
      checkedPages: urls.length,
      failures: failures.length
    });

    writeJson("stage4-performance-summary.json", {
      stage: "Stage 4 - Performance Testing",
      thresholdMs: LOAD_EVENT_THRESHOLD_MS,
      checkedPages: urls.length,
      results,
      failures
    });

    expect.soft(failures, `Performance failures: ${JSON.stringify(failures, null, 2)}`).toHaveLength(0);
  });

  test("optional slow-network simulation (chromium only)", async ({ context, page, baseURL, browserName }, testInfo) => {
    test.skip(browserName !== "chromium", "Slow network emulation uses Chromium CDP.");
    test.skip(testInfo.project.name !== "chrome", "Run once in the chrome project.");

    const session = await context.newCDPSession(page);
    await session.send("Network.enable");
    await session.send("Network.emulateNetworkConditions", {
      offline: false,
      latency: 400,
      downloadThroughput: (1.6 * 1024 * 1024) / 8,
      uploadThroughput: (750 * 1024) / 8
    });

    const url = toAbsoluteUrl(baseURL, "/");
    const metrics = await capturePagePerformance(page, url);

    await session.send("Network.disable");

    writeJson("stage4-slow-network-summary.json", {
      stage: "Stage 4 - Performance Testing",
      profile: "simulated-slow-network",
      url,
      metrics
    });

    expect.soft(metrics.navigation?.loadEventMs ?? 0).toBeGreaterThan(0);
  });
});
