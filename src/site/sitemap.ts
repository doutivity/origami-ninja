// Генерація sitemap.xml і robots.txt зі списку сторінок, SITE_URL і BASE_PATH.
import type { PageMeta } from "./pages.ts";

const xmlEscape = (s: string): string =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Абсолютна адреса сторінки: siteUrl уже містить шлях проєкту (напр. …/origami-ninja). */
export const canonicalUrl = (siteUrl: string, path: string): string => `${siteUrl}${path}`;

/** Сторінки, що потрапляють у sitemap: усе, крім 404 і noindex. */
export const sitemapPages = (pages: readonly PageMeta[]): PageMeta[] =>
  pages.filter((p) => p.kind !== "not-found");

/** lastmod лише там, де дата відома (записи devlog; список — за найновішим записом). */
function lastmod(page: PageMeta, pages: readonly PageMeta[]): string | undefined {
  if (page.entry) return page.entry.date;
  if (page.path === "/devlog/") {
    const dates = pages.flatMap((p) => (p.entry ? [p.entry.date] : [])).sort();
    return dates[dates.length - 1];
  }
  return undefined;
}

export function buildSitemap(pages: readonly PageMeta[], siteUrl: string): string {
  const items = sitemapPages(pages)
    .map((p) => {
      const mod = lastmod(p, pages);
      return `  <url>\n    <loc>${xmlEscape(canonicalUrl(siteUrl, p.path))}</loc>${mod ? `\n    <lastmod>${mod}</lastmod>` : ""}\n  </url>`;
    })
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${items}\n</urlset>\n`;
}

export function buildRobots(siteUrl: string): string {
  return `User-agent: *\nAllow: /\n\nSitemap: ${siteUrl}/sitemap.xml\n`;
}
