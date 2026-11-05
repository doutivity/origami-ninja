import { describe, expect, it } from "vitest";
import { devlog } from "../../src/content/devlog/index.ts";
import { jsonLdFor } from "../../src/site/jsonld.ts";
import { headTags } from "../../src/site/layout.ts";
import { allPages, notFoundPage, pageByPath, pages } from "../../src/site/pages.ts";
import { distCandidates, parseHtml, resolveLink, sitemapLocs } from "../../src/site/seo.ts";

const SITE = "https://doutivity.github.io/origami-ninja";

describe("page registry", () => {
  it("has unique paths, titles and descriptions", () => {
    for (const key of ["path", "title", "description"] as const) {
      const values = allPages.map((p) => p[key]);
      expect(new Set(values).size).toBe(values.length);
    }
  });

  it("covers every required page", () => {
    for (const path of [
      "/",
      "/play/",
      "/about/",
      "/controls/",
      "/devlog/",
      "/privacy/",
      "/404.html",
    ]) {
      expect(pageByPath(path)).toBeDefined();
    }
  });

  it("has a page for every devlog entry", () => {
    for (const e of devlog) expect(pageByPath(`/devlog/${e.slug}/`)?.entry).toBe(e);
  });

  it("titles and descriptions stay a sensible length", () => {
    for (const p of allPages) {
      expect(p.title.length).toBeGreaterThan(10);
      expect(p.title.length).toBeLessThanOrEqual(70);
      expect(p.description.length).toBeGreaterThan(40);
      expect(p.description.length).toBeLessThanOrEqual(200);
    }
  });
});

describe("JSON-LD", () => {
  it("home page: VideoGame with sameAs to the repository", () => {
    const home = pageByPath("/");
    if (!home) throw new Error("home");
    const game = jsonLdFor(home, SITE).find((o) => o["@type"] === "VideoGame");
    expect(game?.sameAs).toContain("https://github.com/doutivity/origami-ninja");
    expect(game?.url).toBe(`${SITE}/`);
  });

  it("inner pages: BreadcrumbList that ends with the page", () => {
    for (const p of pages.filter((x) => x.path !== "/")) {
      const crumbs = jsonLdFor(p, SITE).find((o) => o["@type"] === "BreadcrumbList");
      const items = crumbs?.itemListElement as { item: string; position: number }[];
      expect(items.at(-1)?.item).toBe(`${SITE}${p.path}`);
      expect(items[0]?.position).toBe(1);
    }
  });

  it("devlog entry: Article with the publish date", () => {
    const entry = pages.find((p) => p.kind === "article");
    if (!entry?.entry) throw new Error("entry");
    const article = jsonLdFor(entry, SITE).find((o) => o["@type"] === "Article");
    expect(article?.datePublished).toBe(entry.entry.date);
    expect(article?.headline).toBe(entry.entry.title);
  });

  it("404 has no structured data", () => {
    expect(jsonLdFor(notFoundPage, SITE)).toEqual([]);
  });
});

describe("head tags", () => {
  const find = (tags: ReturnType<typeof headTags>, key: string) =>
    tags.find((t) => t.attrs.name === key || t.attrs.property === key || t.attrs.rel === key);

  it("indexable pages: canonical, OG and Twitter card", () => {
    const tags = headTags(pageByPath("/about/") ?? notFoundPage, "/origami-ninja/", SITE);
    expect(find(tags, "canonical")?.attrs.href).toBe(`${SITE}/about/`);
    expect(find(tags, "og:image")?.attrs.content).toBe(`${SITE}/og-image.png`);
    expect(find(tags, "twitter:card")?.attrs.content).toBe("summary_large_image");
    expect(find(tags, "author")?.attrs.href).toBe("/origami-ninja/humans.txt");
  });

  it("404: noindex and no canonical", () => {
    const tags = headTags(notFoundPage, "/origami-ninja/", SITE);
    expect(find(tags, "robots")?.attrs.content).toBe("noindex");
    expect(find(tags, "canonical")).toBeUndefined();
  });

  it("devlog entries get their own OG image", () => {
    const entry = pages.find((p) => p.entry);
    if (!entry) throw new Error("entry");
    const tags = headTags(entry, "/", SITE);
    expect(find(tags, "og:image")?.attrs.content).toBe(`${SITE}/og/${entry.entry?.slug}.png`);
  });
});

describe("HTML parsing for check:seo", () => {
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width">
<title>Hello &amp; welcome</title><meta name="description" content="A page"><link rel="canonical" href="https://x.test/a/">
<meta property="og:title" content="OG"><script type="application/ld+json">{"@type":"Thing"}</script></head>
<body><a href="/a/">Source</a><a href="https://github.com/o/r">View source on GitHub</a><h1>One</h1><img src="/i.png" width="1" height="1"></body></html>`;
  const p = parseHtml(html);

  it("extracts the basics", () => {
    expect(p.lang).toBe("en");
    expect(p.title).toBe("Hello & welcome");
    expect(p.description).toBe("A page");
    expect(p.canonical).toBe("https://x.test/a/");
    expect(p.h1Count).toBe(1);
    expect(p.hasCharset && p.hasViewport).toBe(true);
    expect(p.meta["og:title"]).toBe("OG");
  });

  it("extracts links, images and JSON-LD", () => {
    expect(p.anchors).toEqual(["/a/", "https://github.com/o/r"]);
    expect(p.sources).toContain("/i.png");
    expect(p.jsonLd).toEqual([{ "@type": "Thing" }]);
    expect(p.anchorTexts.get("https://github.com/o/r")).toEqual(["View source on GitHub"]);
  });

  it("counts multiple h1", () => {
    expect(parseHtml("<h1>a</h1><h1 class='x'>b</h1>").h1Count).toBe(2);
  });

  it("reports invalid JSON-LD", () => {
    expect(parseHtml('<script type="application/ld+json">{bad</script>').jsonLd[0]).toHaveProperty(
      "@error",
    );
  });

  it("reads locs from a sitemap", () => {
    expect(
      sitemapLocs(
        "<urlset><url><loc>https://a/</loc></url><url><loc>https://a/b/</loc></url></urlset>",
      ),
    ).toEqual(["https://a/", "https://a/b/"]);
  });
});

describe("link resolution", () => {
  const base = "/origami-ninja/";

  it("maps absolute paths under BASE_PATH into dist", () => {
    expect(resolveLink("/origami-ninja/about/", base, SITE)).toEqual({
      kind: "internal",
      rel: "about/",
    });
    expect(resolveLink("/origami-ninja/assets/a.css?x=1#y", base, SITE)).toEqual({
      kind: "internal",
      rel: "assets/a.css",
    });
  });

  it("flags links that ignore BASE_PATH", () => {
    expect(resolveLink("/about/", base, SITE).kind).toBe("bad");
    expect(resolveLink("about/", base, SITE).kind).toBe("bad");
  });

  it("maps full URLs of this site, ignores external and anchors", () => {
    expect(resolveLink(`${SITE}/og-image.png`, base, SITE)).toEqual({
      kind: "internal",
      rel: "og-image.png",
    });
    expect(resolveLink("https://github.com/x", base, SITE).kind).toBe("external");
    expect(resolveLink("#top", base, SITE).kind).toBe("ignore");
    expect(resolveLink("mailto:a@b.c", base, SITE).kind).toBe("ignore");
  });

  it("directory links resolve to index.html", () => {
    expect(distCandidates("about/")).toEqual(["about/index.html"]);
    expect(distCandidates("")).toEqual(["index.html"]);
    expect(distCandidates("humans.txt")).toEqual(["humans.txt"]);
    expect(distCandidates("play")).toContain("play/index.html");
  });
});
