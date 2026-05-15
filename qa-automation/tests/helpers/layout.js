export async function inspectLayout(page) {
  return page.evaluate(() => {
    const issues = [];
    const viewportWidth = window.innerWidth;

    // Check for horizontal overflow that typically indicates layout breakage.
    if (document.documentElement.scrollWidth > viewportWidth + 2) {
      issues.push({
        type: "overflow",
        detail: `scrollWidth=${document.documentElement.scrollWidth}, viewportWidth=${viewportWidth}`
      });
    }

    const hasMain = Boolean(document.querySelector("main, [role='main']"));
    const textLength = (document.body?.innerText || "").trim().length;
    if (!hasMain && textLength < 40) {
      issues.push({
        type: "missing-content",
        detail: `hasMain=${hasMain}, textLength=${textLength}`
      });
    }

    // Sample a bounded list of visible interactive elements for overlap checks.
    const candidates = Array.from(
      document.querySelectorAll("a, button, input, textarea, select, [role='button'], h1, h2, img")
    )
      .filter((el) => {
        const rect = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);
        return (
          rect.width > 5 &&
          rect.height > 5 &&
          rect.top < window.innerHeight &&
          rect.left < window.innerWidth &&
          style.visibility !== "hidden" &&
          style.display !== "none" &&
          Number(style.opacity) > 0
        );
      })
      .slice(0, 100)
      .map((el) => {
        const rect = el.getBoundingClientRect();
        return {
          el,
          tag: el.tagName.toLowerCase(),
          text: (el.textContent || "").trim().slice(0, 50),
          rect: {
            left: rect.left,
            right: rect.right,
            top: rect.top,
            bottom: rect.bottom,
            width: rect.width,
            height: rect.height
          }
        };
      });

    for (let i = 0; i < candidates.length; i += 1) {
      for (let j = i + 1; j < candidates.length; j += 1) {
        const a = candidates[i];
        const b = candidates[j];
        if (a.el.contains(b.el) || b.el.contains(a.el)) {
          continue;
        }
        const overlapX = Math.min(a.rect.right, b.rect.right) - Math.max(a.rect.left, b.rect.left);
        const overlapY = Math.min(a.rect.bottom, b.rect.bottom) - Math.max(a.rect.top, b.rect.top);
        if (overlapX > 16 && overlapY > 16) {
          const area = overlapX * overlapY;
          if (area > 450) {
            issues.push({
              type: "overlap",
              detail: `${a.tag}("${a.text}") overlaps ${b.tag}("${b.text}") area=${Math.round(area)}`
            });
            if (issues.length >= 20) {
              return issues;
            }
          }
        }
      }
    }

    return issues;
  });
}
