// Розмітка спільних частин сторінки: header, footer, мета-теги. Використовується Vite-плагіном.
import { site } from "./config.ts";
import { jsonLdFor } from "./jsonld.ts";
import { type PageMeta, pages } from "./pages.ts";

export const esc = (s: string): string =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// Octicon "mark-github" (MIT)
const GITHUB_ICON =
  '<svg class="icon" viewBox="0 0 16 16" width="20" height="20" aria-hidden="true" focusable="false"><path fill="currentColor" d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z"/></svg>';

/** Посилання з урахуванням BASE_PATH: href("/about/") → "/origami-ninja/about/" */
export const href = (base: string, path: string): string => `${base}${path.replace(/^\//, "")}`;

export function headerHtml(base: string, current: PageMeta): string {
  const items = pages
    .filter((p) => p.nav)
    .map((p) => {
      const active =
        current.path === p.path || (p.path === "/devlog/" && current.path.startsWith("/devlog/"));
      return `<li><a href="${href(base, p.path)}"${active ? ' aria-current="page"' : ""}>${esc(p.nav ?? "")}</a></li>`;
    })
    .join("");
  return `<a class="skip-link" href="#main">Skip to content</a>
<header class="site-header"><div class="container header-inner">
<a class="brand" href="${href(base, "/")}">${esc(site.name)}</a>
<nav class="main-nav" aria-label="Main"><ul>${items}</ul></nav>
<a class="gh-link" href="${site.repoUrl}" rel="noopener">${GITHUB_ICON}<span>Source</span></a>
<fieldset class="theme-switch" data-theme-switcher><legend class="visually-hidden">Color theme</legend>
<button type="button" data-theme-value="system" aria-pressed="true">System</button>
<button type="button" data-theme-value="light" aria-pressed="false">Light</button>
<button type="button" data-theme-value="dark" aria-pressed="false">Dark</button></fieldset>
</div></header>`;
}

export function footerHtml(base: string, analytics = false): string {
  const year = new Date().getFullYear();
  return `<footer class="site-footer"><div class="container footer-inner">
<p>© ${year} ${esc(site.authorName)} · <a href="${site.licenseUrl}" rel="noopener">${site.license} License</a></p>
<p><a href="${site.repoUrl}" rel="noopener">View source on GitHub</a></p>
<ul class="footer-links">
<li><a href="${href(base, "/controls/")}">Controls</a></li>
<li><a href="${href(base, "/devlog/")}">Devlog</a></li>
<li><a href="${href(base, "/privacy/")}">Privacy</a></li>
<li><a href="${href(base, "/humans.txt")}">humans.txt</a></li>
${analytics ? '<li><button type="button" class="link-button" data-cookie-settings>Cookie settings</button></li>' : ""}
</ul>
</div></footer>`;
}

export interface MetaTag {
  tag: string;
  attrs: Record<string, string | boolean>;
}

/** Мета-теги <head>: canonical, OG, Twitter, author. Для 404 — noindex і без canonical. */
export function headTags(page: PageMeta, base: string, siteUrl: string): MetaTag[] {
  const meta = (name: string, content: string): MetaTag => ({
    tag: "meta",
    attrs: { name, content },
  });
  const og = (property: string, content: string): MetaTag => ({
    tag: "meta",
    attrs: { property, content },
  });
  const tags: MetaTag[] = [
    meta("description", page.description),
    { tag: "link", attrs: { rel: "author", href: `${base}humans.txt` } },
  ];
  if (page.kind === "not-found") {
    tags.push(meta("robots", "noindex"));
    return tags;
  }
  const url = `${siteUrl}${page.path}`;
  const image = page.entry ? `${siteUrl}/og/${page.entry.slug}.png` : `${siteUrl}/og-image.png`;
  tags.push(
    { tag: "link", attrs: { rel: "canonical", href: url } },
    og("og:type", page.kind === "article" ? "article" : "website"),
    og("og:site_name", site.name),
    og("og:title", page.title),
    og("og:description", page.description),
    og("og:url", url),
    og("og:image", image),
    og("og:image:width", "1200"),
    og("og:image:height", "630"),
    og("og:image:alt", `${site.name}: ${site.tagline}`),
    og("og:locale", "en_US"),
    meta("twitter:card", "summary_large_image"),
    meta("twitter:title", page.title),
    meta("twitter:description", page.description),
    meta("twitter:image", image),
  );
  if (page.entry) tags.push(og("article:published_time", page.entry.date));
  return tags;
}

export function jsonLdScripts(page: PageMeta, siteUrl: string): string[] {
  return jsonLdFor(page, siteUrl).map((o) => JSON.stringify(o).replace(/</g, "\\u003c"));
}

/** HTML списку записів devlog (підставляється замість <!--devlog-list-->). */
export function devlogListHtml(base: string): string {
  return pages
    .filter((p) => p.kind === "article" && p.entry)
    .map((p) => {
      const e = p.entry;
      if (!e) return "";
      return `<li class="post-card"><p class="meta"><time datetime="${e.date}">${e.date}</time></p><h2><a href="${href(base, p.path)}">${esc(e.title)}</a></h2><p>${esc(e.description)}</p></li>`;
    })
    .join("\n");
}

/** Сторінка запису devlog (генерується скриптом у src/devlog/<slug>/index.html). */
export function devlogEntryHtml(entry: { title: string; date: string; body: string }): string {
  return `<!doctype html>
<html lang="en">
  <head></head>
  <body>
    <main id="main" class="container prose">
      <article>
        <header>
          <p class="meta"><time datetime="${entry.date}">${entry.date}</time></p>
          <h1>${esc(entry.title)}</h1>
        </header>
        ${entry.body.trim()}
      </article>
      <p><a href="/devlog/">← All devlog posts</a></p>
    </main>
  </body>
</html>
`;
}
