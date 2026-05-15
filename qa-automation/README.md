# DoItAll9ja QA Automation Pack

This folder contains modular Playwright scripts for staged QA on:
`https://doitall9ja.com`

The suite is designed for controlled environments (dev/staging) and logs artifacts for team review.

## 1) Setup

```bash
cd qa-automation
npm install
npm run install:browsers
```

Copy environment template:

```bash
cp .env.example .env
```

Update `.env` as needed:
- `BASE_URL`
- `MAIN_PATHS`
- `RESTRICTED_PATHS`
- `API_ENDPOINTS`

Optional cross-browser flags (set in shell before running):
- `ENABLE_FIREFOX=1` to include Firefox project.
- `ENABLE_WEBKIT=1` to include Safari/WebKit project.
- `PERF_LOAD_EVENT_THRESHOLD_MS=13000` to tune Stage 4 pass/fail threshold.

## 2) Stage Execution Commands

- Stage 1 (Smoke): `npm run test:stage1`
- Stage 2 (Functional): `npm run test:stage2`
- Stage 3 (Responsive/Cross-browser): `npm run test:stage3`
- Stage 4 (Performance): `npm run test:stage4`
- Stage 5 (Edge Cases): `npm run test:stage5`
- Stage 6 (Security/Access): `npm run test:stage6`
- All stages: `npm run test:all`

## 3) Stage Details

### Stage 1: Smoke Test
- Script: `tests/stage1.smoke.spec.js`
- What it does:
- Opens configured/discovered main pages.
- Checks HTTP status.
- Logs non-`200` pages.
- Artifacts:
- `artifacts/stage1-smoke-log.jsonl`
- `artifacts/stage1-smoke-summary.json`
- How to interpret:
- `failed > 0` means routing, deployment, or server issues exist.

### Stage 2: Functional Testing
- Script: `tests/stage2.functional.spec.js`
- What it does:
- Clicks links and buttons (with status validation for link targets).
- Submits forms with valid and invalid inputs.
- Captures API/json responses and validates status/data shape.
- Artifacts:
- `artifacts/stage2-functional-log.jsonl`
- `artifacts/stage2-functional-clicks-summary.json`
- `artifacts/stage2-functional-forms-summary.json`
- `artifacts/stage2-functional-api-summary.json`
- How to interpret:
- `failures` array lists broken interactions, validation gaps, and API issues.

### Stage 3: Responsiveness & Cross-Browser
- Script: `tests/stage3.responsive-crossbrowser.spec.js`
- What it does:
- Tests desktop/tablet/mobile viewport sizes.
- Runs across Chrome, Firefox, Edge, Safari (via Playwright WebKit).
- Detects overlap, overflow, and missing-content indicators.
- Captures screenshots per page/viewport/browser.
- Artifacts:
- `artifacts/stage3-responsive-log.jsonl`
- `artifacts/stage3-responsive-summary-<project>.json`
- `artifacts/screenshots/*.png`
- How to interpret:
- `issues` array entries indicate potential layout breakpoints or content regressions.

### Stage 4: Performance Testing
- Script: `tests/stage4.performance.spec.js`
- What it does:
- Measures navigation timing and render timing.
- Finds slow-loading assets (images/scripts/css via resource timing).
- Includes optional simulated slow network test (Chromium CDP).
- Artifacts:
- `artifacts/stage4-performance-log.jsonl`
- `artifacts/stage4-performance-summary.json`
- `artifacts/stage4-slow-network-summary.json`
- How to interpret:
- Look at `loadEventMs` and `slowAssets` for optimization priorities.

### Stage 5: Edge Case Testing
- Script: `tests/stage5.edge-cases.spec.js`
- What it does:
- Tests empty/invalid form submissions.
- Rapid-click stress on controls.
- Refresh/back behavior during form submission.
- Artifacts:
- `artifacts/stage5-edge-log.jsonl`
- `artifacts/stage5-edge-forms-summary.json`
- `artifacts/stage5-edge-rapid-click-summary.json`
- `artifacts/stage5-edge-refresh-back-summary.json`
- How to interpret:
- `issues` entries highlight instability under unexpected user behavior.

### Stage 6: Security & Access Testing
- Script: `tests/stage6.security-access.spec.js`
- What it does:
- Tries restricted pages without login.
- Sends unauthenticated API calls.
- Checks weak password/invalid input handling.
- Artifacts:
- `artifacts/stage6-security-log.jsonl`
- `artifacts/stage6-security-summary.json`
- `artifacts/stage6-security-findings.md`
- How to interpret:
- Treat `high` risk findings as urgent.
- Manual security testing is required for exploit confirmation.

### Stage 7: Logging & Monitoring (Operational Guide)
- Collect application/server logs:
- Nginx/Apache/app container logs for 4xx/5xx spikes.
- Frontend runtime logs from browser console and error tracking.
- Track response times and metrics:
- APM dashboards (Datadog/New Relic/OpenTelemetry).
- Endpoint latency percentiles: p50/p95/p99.
- Error rates by endpoint and release version.
- Recommended workflow:
- After each stage run, correlate failing URLs/endpoints with server logs.
- Create a single defect list grouped by severity: critical/high/medium/low.

### Stage 8: Summary Report
- Templates:
- `report-template.md`
- `report-template.json`
- Auto-generate consolidated summary from artifacts:

```bash
npm run report:merge
```

- Generated:
- `artifacts/stage8-summary.json`
- `artifacts/stage8-summary.md`

## 4) BrowserStack Execution (Optional)

Use BrowserStack for broader OS/browser coverage.

1. Install BrowserStack SDK in this folder.
2. Configure credentials:
- `BROWSERSTACK_USERNAME`
- `BROWSERSTACK_ACCESS_KEY`
3. Map Playwright projects to BrowserStack capabilities.
4. Run Stage 3 suite on BrowserStack grid to validate responsive/cross-browser results.

Official docs:
- [BrowserStack Playwright Guide](https://www.browserstack.com/docs/automate/playwright)

## 5) Lighthouse and PageSpeed CLI (Performance Deep Dive)

Run Lighthouse for critical routes:

```bash
npx lighthouse https://doitall9ja.com --output html --output json --output-path ./artifacts/lighthouse-home
npx lighthouse https://doitall9ja.com/contact --output html --output json --output-path ./artifacts/lighthouse-contact
```

PageSpeed Insights API example:

```bash
curl "https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=https://doitall9ja.com&strategy=mobile" > artifacts/pagespeed-home-mobile.json
```

Interpretation tips:
- Prioritize Core Web Vitals failures.
- Optimize large images, render-blocking scripts, and unused CSS.

## 6) Logs and HTML Report

After test runs:
- JSON/JSONL logs: `artifacts/*.json` and `artifacts/*.jsonl`
- Playwright HTML report: `artifacts/html-report/index.html`

Open report:

```bash
npx playwright show-report artifacts/html-report
```
