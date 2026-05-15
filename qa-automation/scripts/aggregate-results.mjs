import fs from "node:fs";
import path from "node:path";

const artifactsDir = path.join(process.cwd(), "artifacts");

function readJsonIfExists(fileName) {
  const fullPath = path.join(artifactsDir, fileName);
  if (!fs.existsSync(fullPath)) return null;
  return JSON.parse(fs.readFileSync(fullPath, "utf8"));
}

function stageStatusFromFailures(summary, fallbackKey = "failures") {
  if (!summary) return "NOT_RUN";
  if (Array.isArray(summary[fallbackKey])) return summary[fallbackKey].length === 0 ? "PASS" : "FAIL";
  if (typeof summary[fallbackKey] === "number") return summary[fallbackKey] === 0 ? "PASS" : "FAIL";
  return "UNKNOWN";
}

function listStage3Files() {
  if (!fs.existsSync(artifactsDir)) return [];
  return fs
    .readdirSync(artifactsDir)
    .filter((name) => name.startsWith("stage3-responsive-summary-") && name.endsWith(".json"));
}

const stage1 = readJsonIfExists("stage1-smoke-summary.json");
const stage2click = readJsonIfExists("stage2-functional-clicks-summary.json");
const stage2forms = readJsonIfExists("stage2-functional-forms-summary.json");
const stage2api = readJsonIfExists("stage2-functional-api-summary.json");
const stage4 = readJsonIfExists("stage4-performance-summary.json");
const stage5forms = readJsonIfExists("stage5-edge-forms-summary.json");
const stage5rapid = readJsonIfExists("stage5-edge-rapid-click-summary.json");
const stage5refresh = readJsonIfExists("stage5-edge-refresh-back-summary.json");
const stage6 = readJsonIfExists("stage6-security-summary.json");

const stage3Summaries = listStage3Files().map((file) => ({
  file,
  body: readJsonIfExists(file)
}));

const stage3Issues = stage3Summaries.flatMap((item) => item.body?.issues || []);
const stage2Failures = [
  ...(stage2click?.failures || []),
  ...(stage2forms?.failures || []),
  ...(stage2api?.failures || [])
];
const stage5Issues = [
  ...(stage5forms?.issues || []),
  ...(stage5rapid?.issues || []),
  ...(stage5refresh?.issues || [])
];
const stage6Findings = stage6?.findings || [];

const finalSummary = {
  generatedAt: new Date().toISOString(),
  stages: [
    {
      stage: "Stage 1 - Smoke Test",
      status: stageStatusFromFailures(stage1, "failures"),
      issuesFound: stage1?.failures?.length || 0,
      recommendations: ["Fix non-200 routes, redirects, or deployment path issues."]
    },
    {
      stage: "Stage 2 - Functional Testing",
      status: stage2Failures.length === 0 ? "PASS" : "FAIL",
      issuesFound: stage2Failures.length,
      recommendations: ["Fix broken interactions, validation paths, and unstable API responses."]
    },
    {
      stage: "Stage 3 - Responsiveness & Cross-Browser",
      status: stage3Issues.length === 0 ? "PASS" : stage3Summaries.length === 0 ? "NOT_RUN" : "FAIL",
      issuesFound: stage3Issues.length,
      recommendations: ["Resolve overlap, overflow, and missing-content issues by viewport/browser."]
    },
    {
      stage: "Stage 4 - Performance Testing",
      status: stageStatusFromFailures(stage4, "failures"),
      issuesFound: stage4?.failures?.length || 0,
      recommendations: ["Optimize slow assets, remove render-blocking resources, and improve caching."]
    },
    {
      stage: "Stage 5 - Edge Case Testing",
      status: stage5Issues.length === 0 ? "PASS" : "FAIL",
      issuesFound: stage5Issues.length,
      recommendations: ["Add defensive client/server validation and idempotent action handling."]
    },
    {
      stage: "Stage 6 - Security & Access Testing",
      status: stage6Findings.some((f) => f.risk === "high") ? "FAIL" : stage6 ? "PASS" : "NOT_RUN",
      issuesFound: stage6Findings.length,
      recommendations: ["Require authentication/authorization checks and enforce stronger input policies."]
    }
  ]
};

fs.mkdirSync(artifactsDir, { recursive: true });
fs.writeFileSync(path.join(artifactsDir, "stage8-summary.json"), JSON.stringify(finalSummary, null, 2), "utf8");

const mdLines = [
  "# Stage 8 Summary Report",
  "",
  `Generated: ${finalSummary.generatedAt}`,
  "",
  "| Stage | Status | Issues Found | Recommendations |",
  "|---|---|---:|---|"
];

for (const stage of finalSummary.stages) {
  mdLines.push(`| ${stage.stage} | ${stage.status} | ${stage.issuesFound} | ${stage.recommendations.join(" ")} |`);
}

fs.writeFileSync(path.join(artifactsDir, "stage8-summary.md"), mdLines.join("\n"), "utf8");
console.log("Generated artifacts/stage8-summary.json and artifacts/stage8-summary.md");
