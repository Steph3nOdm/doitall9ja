export const DEFAULT_MAIN_PATHS = [
  "/",
  "/about",
  "/services",
  "/contact",
  "/blog",
  "/faq",
  "/privacy-policy",
  "/terms"
];

export const DEFAULT_RESTRICTED_PATHS = [
  "/admin",
  "/dashboard",
  "/account",
  "/profile",
  "/settings",
  "/orders",
  "/checkout"
];

export const DEFAULT_API_ENDPOINTS = ["/api/user", "/api/admin", "/api/orders", "/api/settings"];

export function readCsvEnv(name, fallback = []) {
  const raw = process.env[name];
  if (!raw) return fallback;
  return raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function toAbsoluteUrl(baseUrl, value) {
  try {
    return new URL(value, baseUrl).toString();
  } catch {
    return null;
  }
}
