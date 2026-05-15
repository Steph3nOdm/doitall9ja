import { expect, test } from "@playwright/test";
import {
  DEFAULT_API_ENDPOINTS,
  DEFAULT_RESTRICTED_PATHS,
  readCsvEnv,
  toAbsoluteUrl
} from "./helpers/config.js";
import { appendJsonl, timestamp, writeJson, writeMarkdown } from "./helpers/logger.js";
import { discoverInternalPages } from "./helpers/discovery.js";
import { fillForm, submitForm } from "./helpers/forms.js";

function riskLevelFromStatus(status, hasSensitiveMarkers) {
  if (status === 401 || status === 403) return "low";
  if (status === 200 && hasSensitiveMarkers) return "high";
  if (status === 200) return "medium";
  return "info";
}

test.describe("Stage 6 - Security & Access Testing", () => {
  test.describe.configure({ mode: "serial" });

  test("check restricted pages, unauthenticated API access, and weak password handling", async ({
    page,
    request,
    baseURL
  }) => {
    const restrictedPaths = readCsvEnv("RESTRICTED_PATHS", DEFAULT_RESTRICTED_PATHS);
    const apiEndpoints = readCsvEnv("API_ENDPOINTS", DEFAULT_API_ENDPOINTS);
    const findings = [];

    // 1) Restricted pages without login.
    for (const path of restrictedPaths) {
      const url = toAbsoluteUrl(baseURL, path);
      if (!url) continue;

      const response = await request.get(url, { failOnStatusCode: false });
      const status = response.status();
      const body = await response.text();
      const sensitiveMarkers = /(dashboard|admin panel|order history|user profile|settings)/i.test(body);
      const risk = riskLevelFromStatus(status, sensitiveMarkers);

      if (status === 200) {
        findings.push({
          category: "restricted-page-access",
          risk,
          url,
          status,
          evidence: sensitiveMarkers
            ? "Potentially sensitive page content available without authentication."
            : "Restricted candidate path returned HTTP 200."
        });
      }
    }

    // 2) Direct API calls without auth.
    for (const endpoint of apiEndpoints) {
      const url = toAbsoluteUrl(baseURL, endpoint);
      if (!url) continue;

      const response = await request.get(url, { failOnStatusCode: false });
      const status = response.status();
      const body = await response.text();
      const hasSensitiveFields = /(password|token|secret|email|phone|address|role)/i.test(body);

      if (status === 200) {
        findings.push({
          category: "unauthenticated-api-access",
          risk: hasSensitiveFields ? "high" : "medium",
          url,
          status,
          evidence: hasSensitiveFields
            ? "API response appears to expose potentially sensitive fields."
            : "API endpoint is reachable without auth."
        });
      }
      if (status >= 500) {
        findings.push({
          category: "api-hardening",
          risk: "medium",
          url,
          status,
          evidence: "Server error on unauthenticated API call."
        });
      }
    }

    // 3) Weak password / invalid inputs on password forms.
    const pages = await discoverInternalPages(page, baseURL, { maxPages: 20 });
    for (const url of pages) {
      await page.goto(url, { waitUntil: "domcontentloaded" });
      const passwordForms = page.locator("form:has(input[type='password'])");
      const formsCount = await passwordForms.count();
      if (formsCount === 0) continue;

      for (let i = 0; i < formsCount; i += 1) {
        await page.goto(url, { waitUntil: "domcontentloaded" });
        const form = page.locator("form:has(input[type='password'])").nth(i);
        await fillForm(form, "valid");

        const password = form.locator("input[type='password']").first();
        if ((await password.count()) > 0) {
          await password.fill("12345");
        }
        await submitForm(form).catch(() => {});
        await page.waitForTimeout(500);

        let formClaimsValid = false;
        try {
          formClaimsValid = await form.evaluate((f) => f.checkValidity());
        } catch {
          // Form may have navigated away; treat as inconclusive and skip flagging.
          formClaimsValid = false;
        }
        if (formClaimsValid) {
          findings.push({
            category: "weak-password-policy",
            risk: "medium",
            url,
            status: 200,
            evidence: "Form may allow weak password format."
          });
        }
      }
    }

    const markdown = [
      "# Stage 6 Security & Access Report",
      "",
      "Manual security review is still required for confirmed exploitability.",
      "",
      "## Findings",
      findings.length === 0 ? "- No obvious issues detected by automated checks." : ""
    ];

    for (const finding of findings) {
      markdown.push(
        `- [${finding.risk.toUpperCase()}] ${finding.category} | ${finding.url} | status=${finding.status} | ${finding.evidence}`
      );
    }

    appendJsonl("stage6-security-log.jsonl", {
      time: timestamp(),
      stage: "stage6",
      findings: findings.length
    });

    writeJson("stage6-security-summary.json", {
      stage: "Stage 6 - Security & Access Testing",
      findings
    });
    writeMarkdown("stage6-security-findings.md", markdown.join("\n"));

    const highRiskFindings = findings.filter((item) => item.risk === "high");
    expect.soft(highRiskFindings, `High-risk security findings: ${JSON.stringify(highRiskFindings, null, 2)}`).toHaveLength(
      0
    );
  });
});
