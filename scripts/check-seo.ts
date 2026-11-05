// Перевірка SEO зібраного сайту (dist/). Запуск: `just check-seo` (після `just build`).
// BASE_PATH і SITE_URL беруться з самого dist/ (manifest і canonical головної), тож перевірка
// працює однаково для локальної збірки й для GitHub Pages.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import sharp from "sharp";
import { devlog } from "../src/content/devlog/index.ts";
import { site } from "../src/site/config.ts";
import { allPages, type PageMeta } from "../src/site/pages.ts";
import {
  distCandidates,
  type ParsedPage,
  parseHtml,
  resolveLink,
  sitemapLocs,
} from "../src/site/seo.ts";
import { sitemapPages } from "../src/site/sitemap.ts";
import { light } from "../src/theme/tokens.ts";

const DIST = process.env.DIST_DIR ?? "dist";
const errors: string[] = [];
const fail = (where: string, msg: string) => errors.push(`${where}: ${msg}`);

const read = (rel: string) => readFileSync(join(DIST, rel), "utf8");
const exists = (rel: string) => existsSync(join(DIST, rel));

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

if (!existsSync(DIST)) {
  console.error(`check:seo — ${DIST}/ not found. Run \`just build\` first.`);
  process.exit(1);
}

// --- BASE_PATH і SITE_URL виводимо з dist/ ---
const manifest = exists("manifest.webmanifest")
  ? (JSON.parse(read("manifest.webmanifest")) as {
      start_url: string;
      scope: string;
      theme_color: string;
      background_color: string;
      icons: { src: string; sizes: string; type: string; purpose?: string }[];
    })
  : null;
if (!manifest) {
  console.error("check:seo — manifest.webmanifest is missing");
  process.exit(1);
}
const base = manifest.start_url;
if (!base.startsWith("/") || !base.endsWith("/"))
  fail("manifest", `start_url "${base}" must start and end with "/"`);
if (manifest.scope !== base)
  fail("manifest", `scope "${manifest.scope}" must equal start_url "${base}"`);
if (manifest.theme_color !== light.bg || manifest.background_color !== light.bg) {
  fail("manifest", "theme_color/background_color do not match the design tokens");
}

const homeHtml = exists("index.html") ? parseHtml(read("index.html")) : null;
const siteUrl = (homeHtml?.canonical ?? "").replace(/\/$/, "");
if (!siteUrl.startsWith("http")) {
  console.error("check:seo — cannot derive SITE_URL from the canonical link of the home page");
  process.exit(1);
}
if (!siteUrl.endsWith(base.replace(/\/$/, "")) && base !== "/") {
  fail("site", `SITE_URL ${siteUrl} does not end with BASE_PATH ${base}`);
}

/** Шлях у dist/ для URL сторінки з реєстру. */
const fileFor = (path: string) =>
  path.endsWith("/") ? `${path.slice(1)}index.html` : path.slice(1);

// --- Список HTML-файлів у dist/ збігається з реєстром ---
const htmlFiles = new Set(
  walk(DIST)
    .map((f) => relative(DIST, f).split("\\").join("/"))
    .filter((f) => f.endsWith(".html")),
);
const expectedFiles = new Set(allPages.map((p) => fileFor(p.path)));
for (const f of expectedFiles) if (!htmlFiles.has(f)) fail(f, "page is missing from dist/");
for (const f of htmlFiles)
  if (!expectedFiles.has(f)) fail(f, "unexpected HTML file in dist/ (not in the page registry)");

// --- Перевірки кожної сторінки ---
const titles = new Map<string, string>();
const descriptions = new Map<string, string>();
const imageUrls = new Set<string>();
const parsed = new Map<string, ParsedPage>();

function checkLinks(where: string, page: ParsedPage): void {
  const refs = [
    ...page.anchors,
    ...page.sources,
    ...page.links.flatMap((l) => (l.href ? [l.href] : [])),
  ];
  for (const href of refs) {
    const r = resolveLink(href, base, siteUrl);
    if (r.kind === "bad") fail(where, `link "${href}": ${r.reason}`);
    if (r.kind !== "internal") continue;
    if (!distCandidates(r.rel).some(exists)) fail(where, `link "${href}" does not exist in dist/`);
  }
}

async function checkPage(p: PageMeta): Promise<void> {
  const file = fileFor(p.path);
  if (!htmlFiles.has(file)) return;
  const where = file;
  const page = parseHtml(read(file));
  parsed.set(p.path, page);
  const is404 = p.kind === "not-found";

  if (page.lang !== "en") fail(where, `lang is "${page.lang}", expected "en"`);
  if (!page.hasCharset) fail(where, "missing <meta charset>");
  if (!page.hasViewport) fail(where, "missing viewport meta");
  if (!page.title) fail(where, "missing <title>");
  if (!page.description) fail(where, "missing meta description");
  if (page.h1Count !== 1) fail(where, `expected exactly one <h1>, found ${page.h1Count}`);
  if (page.title) {
    const other = titles.get(page.title);
    if (other) fail(where, `duplicate <title> (also on ${other})`);
    titles.set(page.title, where);
  }
  if (page.description) {
    const other = descriptions.get(page.description);
    if (other) fail(where, `duplicate description (also on ${other})`);
    descriptions.set(page.description, where);
  }

  if (is404) {
    if (page.canonical) fail(where, "404 must not have a canonical link");
    if (!page.robots?.includes("noindex")) fail(where, "404 must be noindex");
  } else {
    if (page.canonical !== `${siteUrl}${p.path}`)
      fail(where, `canonical is "${page.canonical}", expected "${siteUrl}${p.path}"`);
    if (page.robots?.includes("noindex")) fail(where, "indexable page has noindex");
    for (const key of [
      "og:title",
      "og:description",
      "og:url",
      "og:image",
      "og:type",
      "twitter:card",
      "twitter:image",
    ]) {
      if (!page.meta[key]) fail(where, `missing ${key}`);
    }
    if (page.meta["twitter:card"] !== "summary_large_image")
      fail(where, "twitter:card must be summary_large_image");
    if (page.meta["og:url"] !== page.canonical) fail(where, "og:url differs from canonical");
    if (page.meta["og:image"]) imageUrls.add(page.meta["og:image"]);
    if (page.meta["twitter:image"] !== page.meta["og:image"])
      fail(where, "twitter:image differs from og:image");
    const expectedImage = p.entry ? `${siteUrl}/og/${p.entry.slug}.png` : `${siteUrl}/og-image.png`;
    if (page.meta["og:image"] !== expectedImage)
      fail(where, `og:image is "${page.meta["og:image"]}", expected "${expectedImage}"`);
  }

  // Посилання на репозиторій, автор, humans.txt
  if (!page.anchors.includes(site.repoUrl)) fail(where, "no link to the repository");
  const texts = page.anchorTexts.get(site.repoUrl) ?? [];
  if (!texts.some((t) => t === "Source")) fail(where, 'header link with text "Source" is missing');
  if (!texts.some((t) => t === "View source on GitHub"))
    fail(where, 'footer link "View source on GitHub" is missing');
  if (!page.links.some((l) => l.rel === "author" && l.href === `${base}humans.txt`))
    fail(where, 'missing <link rel="author"> to humans.txt');

  // Іконки й manifest у head
  const has = (rel: string, href: string, extra?: (l: Record<string, string>) => boolean) =>
    page.links.some(
      (l) => l.rel === rel && l.href === `${base}${href}` && (extra ? extra(l) : true),
    );
  if (!has("icon", "favicon.svg", (l) => l.type === "image/svg+xml"))
    fail(where, "missing favicon.svg link");
  if (!has("icon", "favicon-32.png", (l) => l.sizes === "32x32"))
    fail(where, "missing favicon-32.png link");
  if (!has("apple-touch-icon", "apple-touch-icon.png"))
    fail(where, "missing apple-touch-icon link");
  if (!has("manifest", "manifest.webmanifest")) fail(where, "missing manifest link");
  if (!page.links.some((l) => l.rel === "stylesheet")) fail(where, "no stylesheet linked");
  if (page.meta["theme-color"] === undefined) fail(where, "missing theme-color");

  // Зображення: явні width/height; поза першим екраном — lazy (сторінки поки без <img>)
  for (const img of page.images) {
    if (!img.width || !img.height)
      fail(where, `<img src="${img.src}"> has no explicit width/height`);
  }

  // JSON-LD
  const ld = page.jsonLd.flat() as {
    "@type"?: string;
    sameAs?: string[];
    itemListElement?: { item: string }[];
    datePublished?: string;
  }[];
  if (ld.some((o) => o["@error"] !== undefined)) fail(where, "invalid JSON-LD");
  const ofType = (t: string) => ld.find((o) => o["@type"] === t);
  if (p.kind === "home") {
    const game = ofType("VideoGame");
    if (!game) fail(where, "VideoGame JSON-LD is missing");
    else if (!game.sameAs?.includes(site.repoUrl))
      fail(where, "VideoGame.sameAs must contain the repository URL");
  }
  if (!is404 && p.kind !== "home") {
    const crumbs = ofType("BreadcrumbList");
    if (!crumbs) fail(where, "BreadcrumbList JSON-LD is missing");
    else if (crumbs.itemListElement?.at(-1)?.item !== `${siteUrl}${p.path}`)
      fail(where, "BreadcrumbList does not end with this page");
  }
  if (p.kind === "article") {
    const art = ofType("Article");
    if (!art) fail(where, "Article JSON-LD is missing");
    else if (art.datePublished !== p.entry?.date)
      fail(where, "Article.datePublished does not match the entry date");
  }

  checkLinks(where, page);
}

for (const p of allPages) await checkPage(p);

// --- sitemap.xml і robots.txt ---
if (!exists("sitemap.xml")) fail("sitemap.xml", "missing");
else {
  const locs = sitemapLocs(read("sitemap.xml"));
  const expected = sitemapPages(allPages).map((p) => `${siteUrl}${p.path}`);
  for (const u of expected) if (!locs.includes(u)) fail("sitemap.xml", `missing ${u}`);
  for (const u of locs) if (!expected.includes(u)) fail("sitemap.xml", `unexpected ${u}`);
  if (new Set(locs).size !== locs.length) fail("sitemap.xml", "contains duplicates");
  if (locs.some((u) => u.includes("404"))) fail("sitemap.xml", "must not contain the 404 page");
}
if (!exists("robots.txt")) fail("robots.txt", "missing");
else if (!read("robots.txt").includes(`Sitemap: ${siteUrl}/sitemap.xml`))
  fail("robots.txt", "does not link to the sitemap");

// --- humans.txt, .nojekyll ---
if (!exists("humans.txt")) fail("humans.txt", "missing");
else {
  const humans = read("humans.txt");
  for (const s of [
    "/* TEAM */",
    "/* SITE */",
    "/* DEVELOPMENT PROCESS */",
    "Phaser ",
    "Last update:",
  ]) {
    if (!humans.includes(s)) fail("humans.txt", `missing "${s}"`);
  }
}
if (!exists(".nojekyll")) fail(".nojekyll", "missing");

// --- Іконки й картинки: існують, правильні розміри ---
async function checkImage(rel: string, w: number, h: number, opaque = false): Promise<void> {
  if (!exists(rel)) return fail(rel, "missing");
  const meta = await sharp(join(DIST, rel)).metadata();
  if (meta.width !== w || meta.height !== h)
    fail(rel, `expected ${w}x${h}, got ${meta.width}x${meta.height}`);
  if (opaque && meta.hasAlpha) fail(rel, "must not have an alpha channel");
}
if (!exists("favicon.svg")) fail("favicon.svg", "missing");
else if (!read("favicon.svg").includes("prefers-color-scheme"))
  fail("favicon.svg", "has no dark-mode variant");
await checkImage("favicon-32.png", 32, 32);
await checkImage("apple-touch-icon.png", 180, 180, true);
for (const icon of manifest.icons) {
  const [w, h] = icon.sizes.split("x").map(Number);
  const r = resolveLink(icon.src, base, siteUrl);
  if (r.kind !== "internal") fail("manifest", `icon ${icon.src} is not under BASE_PATH`);
  else await checkImage(r.rel, w as number, h as number, icon.purpose === "maskable");
}
if (!manifest.icons.some((i) => i.purpose === "maskable" && i.sizes === "512x512"))
  fail("manifest", "no maskable 512x512 icon");
for (const size of ["192x192", "512x512"]) {
  if (!manifest.icons.some((i) => i.sizes === size && (i.purpose ?? "any") === "any"))
    fail("manifest", `no ${size} icon`);
}
// OG-картинки: головна й кожен запис devlog, 1200×630
for (const url of imageUrls) {
  const r = resolveLink(url, base, siteUrl);
  if (r.kind !== "internal") fail("og", `${url} does not point to this site`);
  else await checkImage(r.rel, 1200, 630);
}
for (const e of devlog) {
  if (!imageUrls.has(`${siteUrl}/og/${e.slug}.png`))
    fail("og", `devlog entry "${e.slug}" has no dedicated OG image on its page`);
}

// --- Жодних запитів до Google Fonts у dist/ ---
const textExt = /\.(html|css|js|svg|json|webmanifest|txt|xml)$/;
for (const f of walk(DIST).filter((f) => textExt.test(f))) {
  const text = readFileSync(f, "utf8");
  for (const host of ["fonts.googleapis.com", "fonts.gstatic.com"]) {
    if (text.includes(host)) fail(relative(DIST, f), `references ${host}`);
  }
}

if (errors.length > 0) {
  console.error(`check:seo — ${errors.length} problem(s):`);
  for (const e of errors) console.error(`  ✗ ${e}`);
  process.exit(1);
}
console.log(`check:seo — OK: ${allPages.length} pages, base ${base}, site ${siteUrl}`);
