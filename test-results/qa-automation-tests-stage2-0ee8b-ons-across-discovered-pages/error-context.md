# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: qa-automation\tests\stage2.functional.spec.js >> Stage 2 - Functional Testing >> click links and buttons across discovered pages
- Location: qa-automation\tests\stage2.functional.spec.js:20:3

# Error details

```
TypeError: Invalid URL
```

# Test source

```ts
  1  | function normalize(url) {
> 2  |   const parsed = new URL(url);
     |                  ^ TypeError: Invalid URL
  3  |   parsed.hash = "";
  4  |   if (parsed.pathname.length > 1 && parsed.pathname.endsWith("/")) {
  5  |     parsed.pathname = parsed.pathname.slice(0, -1);
  6  |   }
  7  |   return parsed.toString();
  8  | }
  9  | 
  10 | export function isInternalUrl(baseUrl, maybeUrl) {
  11 |   try {
  12 |     const base = new URL(baseUrl);
  13 |     const target = new URL(maybeUrl, baseUrl);
  14 |     return target.origin === base.origin;
  15 |   } catch {
  16 |     return false;
  17 |   }
  18 | }
  19 | 
  20 | export async function getLinksFromCurrentPage(page, baseUrl) {
  21 |   const links = await page.$$eval("a[href]", (anchors) =>
  22 |     anchors
  23 |       .map((a) => a.getAttribute("href"))
  24 |       .filter(Boolean)
  25 |       .map((href) => href.trim())
  26 |   );
  27 | 
  28 |   const absolute = links
  29 |     .map((href) => {
  30 |       try {
  31 |         return new URL(href, baseUrl).toString();
  32 |       } catch {
  33 |         return null;
  34 |       }
  35 |     })
  36 |     .filter(Boolean);
  37 | 
  38 |   return [...new Set(absolute.filter((item) => isInternalUrl(baseUrl, item)).map((item) => normalize(item)))];
  39 | }
  40 | 
  41 | export async function discoverInternalPages(page, baseUrl, options = {}) {
  42 |   const maxPages = options.maxPages ?? 25;
  43 |   const waitUntil = options.waitUntil ?? "domcontentloaded";
  44 |   const queue = [normalize(baseUrl)];
  45 |   const visited = new Set();
  46 | 
  47 |   while (queue.length > 0 && visited.size < maxPages) {
  48 |     const next = queue.shift();
  49 |     if (!next || visited.has(next)) continue;
  50 |     visited.add(next);
  51 | 
  52 |     try {
  53 |       await page.goto(next, { waitUntil, timeout: 30_000 });
  54 |       const links = await getLinksFromCurrentPage(page, baseUrl);
  55 |       for (const link of links) {
  56 |         if (!visited.has(link) && !queue.includes(link) && visited.size + queue.length < maxPages) {
  57 |           queue.push(link);
  58 |         }
  59 |       }
  60 |     } catch {
  61 |       // Best-effort crawler: keep crawling even if a page fails.
  62 |     }
  63 |   }
  64 | 
  65 |   return [...visited];
  66 | }
  67 | 
```