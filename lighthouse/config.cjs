// Спільна конфігурація Lighthouse CI. BASE_URL закінчується на "/" і містить BASE_PATH.
// /play/ — лише звіт без порогів; решта сторінок: SEO, Accessibility, Best Practices ≥ 0.9.
// Сторінка 404 навмисно noindex, тому для неї перевіряються лише Accessibility і Best Practices.
const BASE = process.env.BASE_URL ?? "http://localhost:8080/origami-ninja/";
const OUT = process.env.LHCI_OUT ?? "reports/lighthouse";

const MIN = 0.9;
const score = () => ["error", { minScore: MIN }];

const PAGES = [
  "",
  "about/",
  "controls/",
  "devlog/",
  "devlog/prototype/",
  "devlog/burning-pagoda/",
  "privacy/",
  "play/",
  "404.html",
];

/** @param {"desktop" | "mobile"} profile */
module.exports = (profile) => {
  const escaped = BASE.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");
  return {
    ci: {
      collect: {
        url: PAGES.map((p) => `${BASE}${p}`),
        numberOfRuns: 2,
        settings: {
          // Мобільний профіль — типові налаштування Lighthouse; desktop — preset desktop
          ...(profile === "desktop" ? { preset: "desktop" } : {}),
          // Chromium із образу Playwright; у контейнері без sandbox
          chromeFlags: "--no-sandbox --headless=new --disable-gpu",
          onlyCategories: ["performance", "accessibility", "best-practices", "seo"],
        },
      },
      assert: {
        assertMatrix: [
          {
            // Усі сторінки, крім /play/ і 404.html
            matchingUrlPattern: `^${escaped}(?!play/)(?!404\\.html).*$`,
            aggregationMethod: "median-run",
            assertions: {
              "categories:seo": score(),
              "categories:accessibility": score(),
              "categories:best-practices": score(),
            },
          },
          {
            matchingUrlPattern: `^${escaped}404\\.html$`,
            aggregationMethod: "median-run",
            assertions: {
              "categories:accessibility": score(),
              "categories:best-practices": score(),
            },
          },
          // /play/ без порогів: лише звіт
        ],
      },
      upload: {
        target: "filesystem",
        outputDir: `${OUT}/${profile}`,
        reportFilenamePattern: "%%PATHNAME%%-%%DATETIME%%-report.%%EXTENSION%%",
      },
    },
  };
};
