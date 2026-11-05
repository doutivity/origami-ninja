import { expect, test } from "@playwright/test";
import { GOOGLE, stubGoogle, TEST_GA_ID } from "./helpers.ts";

test("before Accept: banner is shown and there are NO requests to Google or cookies", async ({
  page,
  context,
}) => {
  const google = await stubGoogle(context);
  await page.goto("");
  await page.waitForLoadState("networkidle");
  const banner = page.locator(".consent-banner");
  await expect(banner).toBeVisible();
  await expect(banner).toHaveAttribute("role", "dialog");
  expect(google).toEqual([]);
  expect(await context.cookies()).toEqual([]);
  // Банер не зсуває макет: він position: fixed
  expect(await banner.evaluate((e) => getComputedStyle(e).position)).toBe("fixed");
});

test("Accept loads gtag.js, and the choice is remembered", async ({ page, context }) => {
  const google = await stubGoogle(context);
  await page.goto("");
  await page.locator('[data-consent="accept"]').click();
  await expect.poll(() => google.some((u) => u.includes(`gtag/js?id=${TEST_GA_ID}`))).toBe(true);
  await expect(page.locator(".consent-banner")).toBeHidden();

  google.length = 0;
  await page.reload();
  await expect(page.locator(".consent-banner")).toBeHidden();
  await expect.poll(() => google.some((u) => u.includes("gtag/js"))).toBe(true);
});

test("Decline: no requests to Google, and the banner stays away", async ({ page, context }) => {
  const google = await stubGoogle(context);
  await page.goto("");
  await page.locator('[data-consent="decline"]').click();
  await expect(page.locator(".consent-banner")).toBeHidden();
  await page.goto("about/");
  await page.waitForLoadState("networkidle");
  expect(google).toEqual([]);
  await expect(page.locator(".consent-banner")).toBeHidden();
});

test("Accept and Decline have equal prominence and the banner links to the privacy policy", async ({
  page,
}) => {
  await page.goto("");
  const metrics = await page.locator(".consent-btn").evaluateAll((els) =>
    els.map((e) => {
      const r = e.getBoundingClientRect();
      const c = getComputedStyle(e);
      return [
        Math.round(r.width),
        Math.round(r.height),
        c.backgroundColor,
        c.color,
        c.fontWeight,
      ].join("|");
    }),
  );
  expect(metrics).toHaveLength(2);
  expect(metrics[0]).toBe(metrics[1]);
  await expect(page.locator(".consent-banner a")).toHaveAttribute("href", /\/privacy\/$/);
});

test("the banner is reachable by keyboard", async ({ page, isMobile }) => {
  test.skip(isMobile, "keyboard focus is a desktop concern");
  await page.goto("");
  await expect(page.locator(".consent-banner")).toBeFocused();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  const focused = await page.evaluate(() => document.activeElement?.getAttribute("data-consent"));
  expect(["accept", "decline"]).toContain(focused);
});

test("Cookie settings reopens the banner and withdrawal removes _ga cookies", async ({
  page,
  context,
}) => {
  const google = await stubGoogle(context);
  await page.goto("");
  await page.locator('[data-consent="accept"]').click();
  await expect.poll(() => google.length).toBeGreaterThan(0);

  const url = new URL(page.url());
  await context.addCookies([
    { name: "_ga", value: "GA1.1.1", url: url.origin },
    { name: "_ga_E2E", value: "GS1", url: url.origin },
    { name: "keep_me", value: "1", url: url.origin },
  ]);
  await page.locator("footer [data-cookie-settings]").click();
  await expect(page.locator(".consent-banner")).toBeVisible();
  await page.locator('[data-consent="decline"]').click();
  await expect(page.locator(".consent-banner")).toBeHidden();
  const names = (await context.cookies()).map((c) => c.name);
  expect(names.some((n) => n.startsWith("_ga"))).toBe(false);
  expect(names).toContain("keep_me");
  expect(
    await page.evaluate(
      (id) => (window as unknown as Record<string, unknown>)[`ga-disable-${id}`],
      TEST_GA_ID,
    ),
  ).toBe(true);
});

test("game events reach the dataLayer only after consent", async ({ page, context, isMobile }) => {
  test.skip(isMobile, "the game flow is covered on desktop");
  await stubGoogle(context);
  await page.goto("play/?debug=1");
  await page.waitForFunction(() => document.getElementById("game")?.dataset.scene === "GameScene");
  const events = () =>
    page.evaluate(() =>
      ((window as unknown as { dataLayer?: ArrayLike<unknown>[] }).dataLayer ?? [])
        .map((a) => Array.from(a))
        .filter((a) => a[0] === "event"),
    );
  expect(await events()).toEqual([]);
  await page.locator('[data-consent="accept"]').click();
  await page.evaluate(() => {
    const g = (
      window as unknown as { __origami: { events: { emit(e: string, d: unknown): void } } }
    ).__origami;
    g.events.emit("game:checkpoint", { index: 1 });
  });
  const after = await events();
  expect(after.some((a) => a[1] === "checkpoint")).toBe(true);
});

test("no page requests Google Fonts", async ({ page }) => {
  const external: string[] = [];
  page.on("request", (r) => {
    if (/fonts\.(googleapis|gstatic)\.com/.test(r.url())) external.push(r.url());
  });
  for (const path of ["", "play/", "about/", "controls/", "devlog/", "privacy/"]) {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
  }
  expect(external).toEqual([]);
  expect(GOOGLE.test("https://example.com/")).toBe(false);
});
