import { expect, test } from "@playwright/test";
import { appendJsonl, timestamp, writeJson } from "./helpers/logger.js";
import { discoverInternalPages } from "./helpers/discovery.js";
import { fillForm, submitForm } from "./helpers/forms.js";

function isSkippableHref(href) {
  if (!href) return true;
  const lower = href.toLowerCase();
  return (
    lower.startsWith("javascript:") ||
    lower.startsWith("mailto:") ||
    lower.startsWith("tel:") ||
    lower.startsWith("#")
  );
}

test.describe("Stage 2 - Functional Testing", () => {
  test.describe.configure({ mode: "serial" });

  test("click links and buttons across discovered pages", async ({ page, request, baseURL, browserName }) => {
    if (browserName === "webkit") {
      test.setTimeout(360_000);
    }

    const maxPages = browserName === "webkit" ? 10 : 15;
    const pages = await discoverInternalPages(page, baseURL, { maxPages });
    const failures = [];
    const interactions = [];

    for (const url of pages) {
      await page.goto(url, { waitUntil: "domcontentloaded" });

      // Exercise all internal links by clicking where possible and validating target status.
      const totalLinks = await page.locator("a[href]").count();
      const linkLimit = browserName === "webkit" ? Math.min(totalLinks, 25) : totalLinks;
      for (let i = 0; i < linkLimit; i += 1) {
        await page.goto(url, { waitUntil: "domcontentloaded" });
        const link = page.locator("a[href]").nth(i);
        if (!(await link.isVisible().catch(() => false))) continue;

        const href = await link.getAttribute("href");
        if (isSkippableHref(href)) continue;

        let absoluteUrl;
        try {
          absoluteUrl = new URL(href, baseURL).toString();
        } catch {
          failures.push({ page: url, kind: "link-parse", href });
          continue;
        }
        const targetResponse = await request.get(absoluteUrl, { failOnStatusCode: false });
        const targetStatus = targetResponse.status();

        if (targetStatus >= 400) {
          failures.push({ page: url, kind: "link-status", href: absoluteUrl, status: targetStatus });
        }

        const targetAttr = (await link.getAttribute("target")) || "";
        if (targetAttr === "_blank") {
          interactions.push({ page: url, type: "link-check", href: absoluteUrl, status: targetStatus });
          continue;
        }

        try {
          await Promise.allSettled([
            page.waitForLoadState("domcontentloaded", { timeout: 6_000 }),
            link.click({ timeout: 6_000 })
          ]);
          interactions.push({ page: url, type: "link-click", href: absoluteUrl, status: "clicked" });
        } catch (error) {
          failures.push({
            page: url,
            kind: "link-click",
            href: absoluteUrl,
            error: String(error)
          });
        }
      }

      // Exercise clickable controls that are not anchors.
      const buttonSelector = "button, input[type='button'], input[type='submit'], [role='button']";
      const totalButtons = await page.locator(buttonSelector).count();
      const buttonLimit = browserName === "webkit" ? Math.min(totalButtons, 12) : totalButtons;
      for (let i = 0; i < buttonLimit; i += 1) {
        await page.goto(url, { waitUntil: "domcontentloaded" });
        const button = page.locator(buttonSelector).nth(i);
        if (!(await button.isVisible().catch(() => false))) continue;
        if (!(await button.isEnabled().catch(() => false))) continue;

        try {
          await button.click({ timeout: 6_000 });
          await page.waitForTimeout(300);
          interactions.push({ page: url, type: "button-click", index: i, status: "clicked" });
        } catch (error) {
          failures.push({
            page: url,
            kind: "button-click",
            index: i,
            error: String(error)
          });
        }
      }
    }

    appendJsonl("stage2-functional-log.jsonl", {
      time: timestamp(),
      stage: "stage2",
      test: "click-links-buttons",
      interactions: interactions.length,
      failures: failures.length
    });

    writeJson("stage2-functional-clicks-summary.json", {
      stage: "Stage 2 - Functional Testing",
      test: "click links and buttons",
      pagesScanned: pages.length,
      interactions,
      failures
    });

    expect.soft(failures, `Functional click failures: ${JSON.stringify(failures, null, 2)}`).toHaveLength(0);
  });

  test("submit forms with valid and invalid data", async ({ page, baseURL }) => {
    const pages = await discoverInternalPages(page, baseURL, { maxPages: 20 });
    const failures = [];
    const outcomes = [];

    for (const url of pages) {
      await page.goto(url, { waitUntil: "domcontentloaded" });
      const formsCount = await page.locator("form").count();
      if (formsCount === 0) continue;

      for (let i = 0; i < formsCount; i += 1) {
        // Valid submission pass
        await page.goto(url, { waitUntil: "domcontentloaded" });
        const validForm = page.locator("form").nth(i);
        await fillForm(validForm, "valid");
        const validBeforeSubmit = await validForm.evaluate((form) => form.checkValidity());

        if (!validBeforeSubmit) {
          failures.push({ page: url, formIndex: i, mode: "valid", issue: "form invalid before submit" });
        }

        try {
          await submitForm(validForm);
          await page.waitForTimeout(800);
          outcomes.push({ page: url, formIndex: i, mode: "valid", result: "submitted" });
        } catch (error) {
          failures.push({ page: url, formIndex: i, mode: "valid", error: String(error) });
        }

        // Invalid submission pass
        await page.goto(url, { waitUntil: "domcontentloaded" });
        const invalidForm = page.locator("form").nth(i);
        await fillForm(invalidForm, "invalid");
        const isInvalidBlocked = !(await invalidForm.evaluate((form) => form.checkValidity()));

        try {
          await submitForm(invalidForm);
          await page.waitForTimeout(700);
        } catch {
          // Expected in some flows; continue validation.
        }

        if (!isInvalidBlocked) {
          failures.push({
            page: url,
            formIndex: i,
            mode: "invalid",
            issue: "invalid data may be accepted (check business rules)"
          });
        } else {
          outcomes.push({ page: url, formIndex: i, mode: "invalid", result: "blocked-by-validation" });
        }
      }
    }

    appendJsonl("stage2-functional-log.jsonl", {
      time: timestamp(),
      stage: "stage2",
      test: "form-submission",
      outcomes: outcomes.length,
      failures: failures.length
    });

    writeJson("stage2-functional-forms-summary.json", {
      stage: "Stage 2 - Functional Testing",
      test: "form submission",
      outcomes,
      failures
    });

    expect.soft(failures, `Form failures: ${JSON.stringify(failures, null, 2)}`).toHaveLength(0);
  });

  test("validate API responses status and data format", async ({ page, baseURL }) => {
    const pages = await discoverInternalPages(page, baseURL, { maxPages: 12 });
    const apiResults = [];
    const failures = [];

    page.on("response", async (response) => {
      const responseUrl = response.url();
      const contentType = response.headers()["content-type"] || "";
      const isApiLike = responseUrl.includes("/api") || contentType.includes("application/json");
      if (!isApiLike) return;

      let parsed = null;
      let parseError = null;
      if (contentType.includes("application/json")) {
        try {
          parsed = await response.json();
        } catch (error) {
          parseError = String(error);
        }
      }

      apiResults.push({
        url: responseUrl,
        status: response.status(),
        ok: response.ok(),
        contentType,
        parsedType: parsed === null ? null : Array.isArray(parsed) ? "array" : typeof parsed,
        parseError
      });
    });

    for (const url of pages) {
      await page.goto(url, { waitUntil: "networkidle" });
    }

    for (const item of apiResults) {
      if (item.status >= 500) {
        failures.push({ ...item, issue: "server-error" });
        continue;
      }
      if (item.status >= 400 && ![401, 403].includes(item.status)) {
        failures.push({ ...item, issue: "unexpected-client-error" });
      }
      if (item.contentType.includes("application/json") && item.parseError) {
        failures.push({ ...item, issue: "invalid-json-payload" });
      }
      if (item.contentType.includes("application/json") && !["object", "array"].includes(item.parsedType || "")) {
        failures.push({ ...item, issue: "unexpected-json-shape" });
      }
    }

    appendJsonl("stage2-functional-log.jsonl", {
      time: timestamp(),
      stage: "stage2",
      test: "api-response-check",
      apiResults: apiResults.length,
      failures: failures.length
    });

    writeJson("stage2-functional-api-summary.json", {
      stage: "Stage 2 - Functional Testing",
      test: "api response validation",
      apiResults,
      failures
    });

    expect.soft(failures, `API failures: ${JSON.stringify(failures, null, 2)}`).toHaveLength(0);
  });
});
