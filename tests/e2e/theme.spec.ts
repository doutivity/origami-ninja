import { expect, test } from "@playwright/test";
import { preDecline } from "./helpers.ts";

const DARK_BG = "rgb(26, 23, 20)";
const LIGHT_BG = "rgb(244, 238, 225)";
const bg = (page: import("@playwright/test").Page) =>
  page.evaluate(() => getComputedStyle(document.body).backgroundColor);

test.beforeEach(async ({ page }) => {
  await preDecline(page);
});

test("follows the system theme by default", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("");
  expect(await bg(page)).toBe(DARK_BG);
  await page.emulateMedia({ colorScheme: "light" });
  expect(await bg(page)).toBe(LIGHT_BG);
  await expect(page.locator('[data-theme-value="system"]')).toHaveAttribute("aria-pressed", "true");
});

test("the switcher changes the theme and remembers the choice", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("");
  await page.locator('[data-theme-value="dark"]').click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  expect(await bg(page)).toBe(DARK_BG);
  await expect(page.locator('[data-theme-value="dark"]')).toHaveAttribute("aria-pressed", "true");

  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  expect(await bg(page)).toBe(DARK_BG);

  await page.goto("about/");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

  await page.locator('[data-theme-value="system"]').click();
  await expect(page.locator("html")).not.toHaveAttribute("data-theme", /.+/);
  expect(await bg(page)).toBe(LIGHT_BG);
  expect(await page.evaluate(() => localStorage.getItem("origami-ninja:theme"))).toBeNull();
});

test("the theme is applied before first paint (no flash)", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("origami-ninja:theme", "dark"));
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("", { waitUntil: "domcontentloaded" });
  expect(await page.locator("html").getAttribute("data-theme")).toBe("dark");
});

test("the switcher is keyboard accessible with a visible focus ring", async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, "keyboard focus is a desktop concern");
  await page.goto("");
  const btn = page.locator('[data-theme-value="light"]');
  await btn.focus();
  const outline = await btn.evaluate((e) => getComputedStyle(e).outlineStyle);
  expect(outline).not.toBe("none");
  await page.keyboard.press("Enter");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
});

test("without JavaScript the system theme works and the switcher is hidden", async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false, colorScheme: "dark" });
  const page = await context.newPage();
  await page.goto("");
  expect(await bg(page)).toBe(DARK_BG);
  await expect(page.locator("[data-theme-switcher]")).toBeHidden();
  await context.close();
});

test("theme-color meta exists for both themes", async ({ page }) => {
  await page.goto("");
  const metas = await page
    .locator('meta[name="theme-color"]')
    .evaluateAll((els) => els.map((e) => e.getAttribute("media")));
  expect(metas).toContain("(prefers-color-scheme: light)");
  expect(metas).toContain("(prefers-color-scheme: dark)");
});
