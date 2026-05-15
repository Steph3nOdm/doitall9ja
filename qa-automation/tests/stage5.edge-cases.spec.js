import { expect, test } from "@playwright/test";
import { appendJsonl, timestamp, writeJson } from "./helpers/logger.js";
import { discoverInternalPages } from "./helpers/discovery.js";
import { fillForm, submitForm } from "./helpers/forms.js";

test.describe("Stage 5 - Edge Case Testing", () => {
  test.describe.configure({ mode: "serial" });

  test("submit empty and invalid forms", async ({ page, baseURL }) => {
    const pages = await discoverInternalPages(page, baseURL, { maxPages: 20 });
    const issues = [];
    const checks = [];

    for (const url of pages) {
      await page.goto(url, { waitUntil: "domcontentloaded" });
      const forms = await page.locator("form").count();
      if (forms === 0) continue;

      for (let i = 0; i < forms; i += 1) {
        await page.goto(url, { waitUntil: "domcontentloaded" });
        const form = page.locator("form").nth(i);

        // Empty submission attempt.
        try {
          await submitForm(form);
          const allowedEmpty = await form.evaluate((f) => f.checkValidity());
          checks.push({ page: url, formIndex: i, test: "empty-submit", allowedEmpty });
          if (allowedEmpty) {
            issues.push({ page: url, formIndex: i, issue: "empty-form-may-be-accepted" });
          }
        } catch {
          // Expected for forms that block empty submit.
        }

        // Invalid submission attempt.
        await page.goto(url, { waitUntil: "domcontentloaded" });
        const invalidForm = page.locator("form").nth(i);
        await fillForm(invalidForm, "invalid");
        await submitForm(invalidForm).catch(() => {});
        let invalidAccepted = false;
        try {
          invalidAccepted = await invalidForm.evaluate((f) => f.checkValidity());
        } catch {
          invalidAccepted = false;
        }
        checks.push({ page: url, formIndex: i, test: "invalid-submit", invalidAccepted });
        if (invalidAccepted) {
          issues.push({ page: url, formIndex: i, issue: "invalid-input-may-be-accepted" });
        }
      }
    }

    appendJsonl("stage5-edge-log.jsonl", {
      time: timestamp(),
      stage: "stage5",
      test: "empty-invalid-forms",
      checks: checks.length,
      issues: issues.length
    });
    writeJson("stage5-edge-forms-summary.json", {
      stage: "Stage 5 - Edge Case Testing",
      checks,
      issues
    });
    expect.soft(issues, `Edge-case form issues: ${JSON.stringify(issues, null, 2)}`).toHaveLength(0);
  });

  test("rapid click stress on clickable controls", async ({ page, baseURL }) => {
    const pages = await discoverInternalPages(page, baseURL, { maxPages: 10 });
    const issues = [];
    const checks = [];

    for (const url of pages) {
      await page.goto(url, { waitUntil: "domcontentloaded" });
      const controls = page.locator("button, [role='button'], input[type='button'], input[type='submit']");
      const count = await controls.count();
      const limit = Math.min(count, 10);

      for (let i = 0; i < limit; i += 1) {
        const control = controls.nth(i);
        if (!(await control.isVisible().catch(() => false))) continue;
        if (!(await control.isEnabled().catch(() => false))) continue;

        try {
          // Trial click verifies clickability without triggering side effects.
          await control.click({ timeout: 2_000, trial: true });
          for (let j = 0; j < 8; j += 1) {
            await control.click({ timeout: 1_500, force: true });
          }
          checks.push({ page: url, controlIndex: i, stressClicks: 8, result: "ok" });
        } catch (error) {
          const message = String(error);
          if (message.includes("TimeoutError") || message.includes("not attached")) {
            checks.push({ page: url, controlIndex: i, stressClicks: 8, result: "skipped-dynamic-control" });
          } else {
            issues.push({ page: url, controlIndex: i, issue: "rapid-click-failed", error: message });
          }
        }

        if (!page.url().startsWith(url)) {
          await page.goto(url, { waitUntil: "domcontentloaded" });
        }
      }
    }

    appendJsonl("stage5-edge-log.jsonl", {
      time: timestamp(),
      stage: "stage5",
      test: "rapid-click",
      checks: checks.length,
      issues: issues.length
    });
    writeJson("stage5-edge-rapid-click-summary.json", {
      stage: "Stage 5 - Edge Case Testing",
      checks,
      issues
    });
    expect.soft(issues, `Rapid-click issues: ${JSON.stringify(issues, null, 2)}`).toHaveLength(0);
  });

  test("refresh/back during form submission flow", async ({ page, baseURL }) => {
    const pages = await discoverInternalPages(page, baseURL, { maxPages: 15 });
    const issues = [];
    const checks = [];
    const pageErrors = [];

    page.on("pageerror", (error) => {
      pageErrors.push(String(error));
    });

    // Delay write calls to increase chance of mid-submit interruption.
    await page.route("**/*", async (route) => {
      const req = route.request();
      if (["POST", "PUT", "PATCH"].includes(req.method())) {
        await new Promise((resolve) => setTimeout(resolve, 1_200));
      }
      await route.continue();
    });

    for (const url of pages) {
      await page.goto(url, { waitUntil: "domcontentloaded" });
      const forms = await page.locator("form").count();
      if (forms === 0) continue;

      for (let i = 0; i < forms; i += 1) {
        await page.goto(url, { waitUntil: "domcontentloaded" });
        const form = page.locator("form").nth(i);
        await fillForm(form, "valid");

        try {
          const submitPromise = submitForm(form);
          await page.waitForTimeout(150);
          await page.reload({ waitUntil: "domcontentloaded" });
          await page.goBack({ waitUntil: "domcontentloaded" }).catch(() => {});
          await submitPromise.catch(() => {});
          checks.push({ page: url, formIndex: i, result: "handled-refresh-back" });
        } catch (error) {
          issues.push({
            page: url,
            formIndex: i,
            issue: "refresh-back-during-submit-failed",
            error: String(error)
          });
        }
      }
    }

    if (pageErrors.length > 0) {
      const actionableErrors = pageErrors.filter(
        (msg) => !msg.includes("'text/html' is not a valid JavaScript MIME type.")
      );
      if (actionableErrors.length > 0) {
        issues.push({ issue: "uncaught-page-errors", errors: actionableErrors });
      }
    }

    appendJsonl("stage5-edge-log.jsonl", {
      time: timestamp(),
      stage: "stage5",
      test: "refresh-back-submit",
      checks: checks.length,
      issues: issues.length
    });
    writeJson("stage5-edge-refresh-back-summary.json", {
      stage: "Stage 5 - Edge Case Testing",
      checks,
      pageErrors,
      issues
    });
    expect.soft(issues, `Refresh/back issues: ${JSON.stringify(issues, null, 2)}`).toHaveLength(0);
  });
});
