function randomSuffix() {
  return Math.floor(Math.random() * 100_000).toString();
}

function getValueForType(type, mode, name = "") {
  const key = name.toLowerCase();
  const isInvalid = mode === "invalid";

  if (type === "email") return isInvalid ? "bad-email" : `qa.${randomSuffix()}@example.com`;
  if (type === "password") return isInvalid ? "12345" : "StrongPassw0rd!2026";
  if (type === "tel") return isInvalid ? "abc" : "+2348012345678";
  if (type === "url") return isInvalid ? "notaurl" : "https://example.com";
  if (type === "number") return isInvalid ? "-1" : "10";
  if (type === "date") return "2026-04-01";
  if (type === "search") return isInvalid ? "" : "qa search query";
  if (key.includes("first")) return "QA";
  if (key.includes("last")) return "Engineer";
  if (key.includes("name")) return "QA Engineer";
  if (key.includes("address")) return "12 Example Street";
  if (key.includes("city")) return "Lagos";
  if (key.includes("subject")) return "Automation Test Subject";
  if (key.includes("message")) return isInvalid ? "x" : "Automated functional test message body.";
  return isInvalid ? "x" : "Automated test value";
}

export async function fillForm(formLocator, mode = "valid") {
  const controls = formLocator.locator("input, textarea, select");
  const count = await controls.count();

  for (let index = 0; index < count; index += 1) {
    const control = controls.nth(index);
    if (!(await control.isVisible())) continue;
    if (!(await control.isEnabled())) continue;

    const tagName = await control.evaluate((el) => el.tagName.toLowerCase());
    const type = (await control.getAttribute("type"))?.toLowerCase() || "";
    const name = (await control.getAttribute("name")) || (await control.getAttribute("id")) || "";

    if (type === "hidden" || type === "file" || type === "submit" || type === "button" || type === "reset") {
      continue;
    }

    if (tagName === "select") {
      const optionsCount = await control.locator("option").count();
      if (optionsCount > 1) {
        if (mode === "invalid") {
          await control.selectOption({ index: 0 });
        } else {
          await control.selectOption({ index: 1 });
        }
      }
      continue;
    }

    if (type === "checkbox" || type === "radio") {
      if (mode === "valid") await control.check({ force: true });
      if (mode === "invalid") await control.uncheck({ force: true }).catch(() => {});
      continue;
    }

    const value = getValueForType(type, mode, name);
    await control.fill("");
    await control.fill(value);
  }
}

export async function submitForm(formLocator) {
  const submit = formLocator.locator(
    "button[type='submit'], input[type='submit'], button:not([type]), [role='button']"
  );
  if ((await submit.count()) > 0) {
    await submit.first().click({ timeout: 7_000 });
    return;
  }

  const firstInput = formLocator.locator("input, textarea").first();
  if ((await firstInput.count()) > 0) {
    await firstInput.press("Enter");
  }
}
