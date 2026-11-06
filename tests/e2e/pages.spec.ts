import { expect, test } from "@playwright/test";
import { collectErrors } from "./helpers.ts";

const PAGES = [
  { path: "", title: /Origami Ninja/ },
  { path: "play/", title: /Play Origami Ninja/ },
  { path: "about/", title: /About Origami Ninja/ },
  { path: "controls/", title: /Controls/ },
  { path: "devlog/", title: /Devlog/ },
  { path: "devlog/prototype/", title: /Prototype/ },
  { path: "devlog/burning-pagoda/", title: /Pagoda/ },
  { path: "devlog/midnight-canyon/", title: /Canyon/ },
  { path: "devlog/ink-marsh/", title: /Ink/ },
  { path: "devlog/kirigami-workshop/", title: /Kirigami|Workshop/ },
  { path: "privacy/", title: /Privacy/ },
];

for (const { path, title } of PAGES) {
  test(`opens /${path} without console errors`, async ({ page }) => {
    const errors = collectErrors(page);
    const res = await page.goto(path);
    expect(res?.status()).toBe(200);
    await expect(page).toHaveTitle(title);
    await expect(page.locator("h1")).toHaveCount(1);
    await page.waitForLoadState("networkidle");
    expect(errors).toEqual([]);
  });
}

test("every page links to the repository in the header and the footer", async ({ page }) => {
  for (const { path } of PAGES) {
    await page.goto(path);
    await expect(page.locator("header a", { hasText: "Source" })).toHaveAttribute(
      "href",
      "https://github.com/doutivity/origami-ninja",
    );
    await expect(page.locator("footer a", { hasText: "View source on GitHub" })).toBeVisible();
  }
});

test("a non-existent URL shows the custom 404 page", async ({ page }) => {
  const res = await page.goto("no-such-page-xyz/");
  expect(res?.status()).toBe(404);
  await expect(page.locator("h1")).toHaveText("Page not found");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex");
  await expect(page.locator('link[rel="canonical"]')).toHaveCount(0);
  // Стилі та навігація на 404 працюють (абсолютні шляхи з BASE_PATH)
  await expect(page.locator("header .brand")).toBeVisible();
  const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  expect(bg).not.toBe("rgba(0, 0, 0, 0)");
});

test("/play redirects to /play/", async ({ page }) => {
  await page.goto("play");
  expect(page.url()).toMatch(/\/play\/$/);
});

test("Phaser loads only on /play/", async ({ page }) => {
  await page.goto("about/");
  await page.waitForLoadState("networkidle");
  const scripts = await page.evaluate(() =>
    performance
      .getEntriesByType("resource")
      .map((r) => r.name)
      .filter((n) => n.endsWith(".js")),
  );
  expect(scripts.some((s) => /\/play-[\w-]+\.js$/.test(s))).toBe(false);
});

test("the play page explains itself without JavaScript", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("play/");
  await expect(page.locator("noscript")).toBeAttached();
  await expect(page.locator('main a[href$="/controls/"]').first()).toBeVisible();
  await context.close();
});
