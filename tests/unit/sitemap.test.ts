import { describe, expect, it } from "vitest";
import { allPages, notFoundPage, pages } from "../../src/site/pages.ts";
import { buildRobots, buildSitemap, canonicalUrl, sitemapPages } from "../../src/site/sitemap.ts";

const SITE = "https://doutivity.github.io/origami-ninja";

describe("sitemap", () => {
  const xml = buildSitemap(allPages, SITE);
  const locs = [...xml.matchAll(/<loc>([^<]*)<\/loc>/g)].map((m) => m[1]);

  it("is a valid urlset document", () => {
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
    expect(xml.trim().endsWith("</urlset>")).toBe(true);
  });

  it("lists every indexable page with an absolute URL", () => {
    expect(locs).toHaveLength(pages.length);
    for (const p of pages) expect(locs).toContain(`${SITE}${p.path}`);
  });

  it("never contains the 404 page", () => {
    expect(locs.some((l) => l?.includes("404"))).toBe(false);
    expect(sitemapPages(allPages)).not.toContain(notFoundPage);
  });

  it("has no duplicates", () => {
    expect(new Set(locs).size).toBe(locs.length);
  });

  it("adds lastmod for devlog entries only", () => {
    const entry = pages.find((p) => p.entry);
    expect(entry).toBeDefined();
    expect(xml).toContain(
      `<loc>${SITE}${entry?.path}</loc>\n    <lastmod>${entry?.entry?.date}</lastmod>`,
    );
    expect(xml).not.toMatch(/<loc>[^<]*\/about\/<\/loc>\s*<lastmod>/);
  });

  it("works for a root-hosted site", () => {
    const local = buildSitemap(allPages, "http://localhost:8080");
    expect(local).toContain("<loc>http://localhost:8080/</loc>");
    expect(local).toContain("<loc>http://localhost:8080/play/</loc>");
  });

  it("canonicalUrl joins site URL and page path", () => {
    expect(canonicalUrl(SITE, "/about/")).toBe(`${SITE}/about/`);
  });
});

describe("robots.txt", () => {
  it("allows crawling and links to the sitemap", () => {
    const txt = buildRobots(SITE);
    expect(txt).toContain("User-agent: *");
    expect(txt).toContain("Allow: /");
    expect(txt).toContain(`Sitemap: ${SITE}/sitemap.xml`);
  });
});
