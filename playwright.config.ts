import { defineConfig, devices } from "@playwright/test";

// Smoke e2e на зібраному сайті. BASE_URL закінчується на "/" і містить BASE_PATH
// (для Pages: http://web-e2e:8080/origami-ninja/), тож у тестах шляхи відносні: page.goto("about/").
export default defineConfig({
  testDir: "tests/e2e",
  timeout: 45_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  // На CI лише один процес: гра на програмному WebGL і так вантажить 2-ядерний раннер,
  // а паралельні сторінки сповільнюють ігровий час і роблять тести нестабільними
  workers: process.env.CI ? 1 : 2,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { outputFolder: "playwright-report/html", open: "never" }]],
  outputDir: "test-results/artifacts",
  use: {
    baseURL: process.env.BASE_URL ?? "http://localhost:8080/origami-ninja/",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "desktop-chromium", use: { ...devices["Desktop Chrome"] } },
    // Емуляція телефону на Chromium: дотик, coarse pointer, портретна орієнтація за замовчуванням
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
});
