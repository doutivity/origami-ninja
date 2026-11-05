// JSON-LD: VideoGame на головній, BreadcrumbList на внутрішніх, Article для записів devlog.
import { site } from "./config.ts";
import type { PageMeta } from "./pages.ts";

type Json = Record<string, unknown>;

const author = { "@type": "Person", name: site.authorName, url: site.authorUrl };

export function jsonLdFor(page: PageMeta, siteUrl: string): Json[] {
  const url = (path: string) => `${siteUrl}${path}`;
  const out: Json[] = [];
  if (page.kind === "home") {
    out.push({
      "@context": "https://schema.org",
      "@type": "VideoGame",
      name: site.name,
      description: site.description,
      url: url("/"),
      image: url("/og-image.png"),
      genre: "Platformer",
      applicationCategory: "Game",
      gamePlatform: "Web browser",
      operatingSystem: "Any",
      inLanguage: site.language,
      isAccessibleForFree: true,
      license: "https://opensource.org/licenses/MIT",
      author,
      sameAs: [site.repoUrl],
    });
  }
  if (page.crumbs.length > 0) {
    out.push({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: page.crumbs.map((c, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: c.name,
        item: url(c.path),
      })),
    });
  }
  if (page.kind === "article" && page.entry) {
    out.push({
      "@context": "https://schema.org",
      "@type": "Article",
      headline: page.entry.title,
      description: page.entry.description,
      datePublished: page.entry.date,
      dateModified: page.entry.date,
      inLanguage: site.language,
      image: url(`/og/${page.entry.slug}.png`),
      mainEntityOfPage: url(page.path),
      author,
      publisher: author,
    });
  }
  return out;
}
