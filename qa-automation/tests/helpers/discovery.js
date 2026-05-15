function normalize(url) {
  const parsed = new URL(url);
  parsed.hash = "";
  if (parsed.pathname.length > 1 && parsed.pathname.endsWith("/")) {
    parsed.pathname = parsed.pathname.slice(0, -1);
  }
  return parsed.toString();
}

export function isInternalUrl(baseUrl, maybeUrl) {
  try {
    const base = new URL(baseUrl);
    const target = new URL(maybeUrl, baseUrl);
    return target.origin === base.origin;
  } catch {
    return false;
  }
}

export async function getLinksFromCurrentPage(page, baseUrl) {
  const links = await page.$$eval("a[href]", (anchors) =>
    anchors
      .map((a) => a.getAttribute("href"))
      .filter(Boolean)
      .map((href) => href.trim())
  );

  const absolute = links
    .map((href) => {
      try {
        return new URL(href, baseUrl).toString();
      } catch {
        return null;
      }
    })
    .filter(Boolean);

  return [...new Set(absolute.filter((item) => isInternalUrl(baseUrl, item)).map((item) => normalize(item)))];
}

export async function discoverInternalPages(page, baseUrl, options = {}) {
  const maxPages = options.maxPages ?? 25;
  const waitUntil = options.waitUntil ?? "domcontentloaded";
  const queue = [normalize(baseUrl)];
  const visited = new Set();

  while (queue.length > 0 && visited.size < maxPages) {
    const next = queue.shift();
    if (!next || visited.has(next)) continue;
    visited.add(next);

    try {
      await page.goto(next, { waitUntil, timeout: 30_000 });
      const links = await getLinksFromCurrentPage(page, baseUrl);
      for (const link of links) {
        if (!visited.has(link) && !queue.includes(link) && visited.size + queue.length < maxPages) {
          queue.push(link);
        }
      }
    } catch {
      // Best-effort crawler: keep crawling even if a page fails.
    }
  }

  return [...visited];
}
