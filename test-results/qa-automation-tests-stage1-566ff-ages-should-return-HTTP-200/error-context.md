# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: qa-automation\tests\stage1.smoke.spec.js >> Stage 1 - Smoke Test >> main pages should return HTTP 200
- Location: qa-automation\tests\stage1.smoke.spec.js:7:3

# Error details

```
Error: page.goto: url: expected string, got undefined
```

# Test source

```ts
  1  | import { expect, test } from "@playwright/test";
  2  | import { DEFAULT_MAIN_PATHS, readCsvEnv, toAbsoluteUrl } from "./helpers/config.js";
  3  | import { appendJsonl, timestamp, writeJson } from "./helpers/logger.js";
  4  | import { getLinksFromCurrentPage } from "./helpers/discovery.js";
  5  | 
  6  | test.describe("Stage 1 - Smoke Test", () => {
  7  |   test("main pages should return HTTP 200", async ({ page, request, baseURL }) => {
  8  |     const configuredPaths = readCsvEnv("MAIN_PATHS", DEFAULT_MAIN_PATHS);
  9  |     const staticUrls = configuredPaths.map((p) => toAbsoluteUrl(baseURL, p)).filter(Boolean);
  10 | 
> 11 |     await page.goto(baseURL, { waitUntil: "domcontentloaded" });
     |                ^ Error: page.goto: url: expected string, got undefined
  12 |     const discoveredUrls = await getLinksFromCurrentPage(page, baseURL);
  13 | 
  14 |     const targetUrls = [...new Set([...staticUrls, ...discoveredUrls])];
  15 |     const failures = [];
  16 |     const successes = [];
  17 | 
  18 |     for (const url of targetUrls) {
  19 |       const response = await request.get(url, { failOnStatusCode: false });
  20 |       const status = response.status();
  21 | 
  22 |       appendJsonl("stage1-smoke-log.jsonl", {
  23 |         time: timestamp(),
  24 |         stage: "stage1",
  25 |         url,
  26 |         status
  27 |       });
  28 | 
  29 |       if (status !== 200) {
  30 |         failures.push({ url, status });
  31 |       } else {
  32 |         successes.push({ url, status });
  33 |       }
  34 |     }
  35 | 
  36 |     writeJson("stage1-smoke-summary.json", {
  37 |       stage: "Stage 1 - Smoke Test",
  38 |       baseURL,
  39 |       checked: targetUrls.length,
  40 |       passed: successes.length,
  41 |       failed: failures.length,
  42 |       failures
  43 |     });
  44 | 
  45 |     expect.soft(failures, `Non-200 pages: ${JSON.stringify(failures, null, 2)}`).toHaveLength(0);
  46 |   });
  47 | });
  48 | 
```