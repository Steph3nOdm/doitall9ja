import fs from "node:fs";
import path from "node:path";

const ARTIFACT_DIR = path.join(process.cwd(), "artifacts");

export function ensureArtifactsDir() {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
}

export function timestamp() {
  return new Date().toISOString();
}

export function appendJsonl(fileName, entry) {
  ensureArtifactsDir();
  const filePath = path.join(ARTIFACT_DIR, fileName);
  fs.appendFileSync(filePath, `${JSON.stringify(entry)}\n`, "utf8");
}

export function writeJson(fileName, payload) {
  ensureArtifactsDir();
  const filePath = path.join(ARTIFACT_DIR, fileName);
  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), "utf8");
}

export function writeMarkdown(fileName, body) {
  ensureArtifactsDir();
  const filePath = path.join(ARTIFACT_DIR, fileName);
  fs.writeFileSync(filePath, body, "utf8");
}
