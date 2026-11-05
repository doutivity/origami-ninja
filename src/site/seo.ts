// Розбір згенерованого HTML для перевірок SEO (без залежностей: сторінки генеруємо ми самі).

export type Attrs = Record<string, string>;

export interface ParsedPage {
  lang: string | undefined;
  title: string | undefined;
  description: string | undefined;
  canonical: string | undefined;
  robots: string | undefined;
  h1Count: number;
  hasCharset: boolean;
  hasViewport: boolean;
  /** meta name/property → content */
  meta: Record<string, string>;
  /** <link> теги: rel, href, sizes, type… */
  links: Attrs[];
  /** href усіх <a> */
  anchors: string[];
  /** src скриптів і зображень */
  sources: string[];
  images: Attrs[];
  jsonLd: unknown[];
  /** Видимий текст усіх <a> (для перевірки «Source» / «View source on GitHub») */
  anchorTexts: Map<string, string[]>;
}

const decode = (s: string): string =>
  s
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");

export function parseAttrs(tagBody: string): Attrs {
  const attrs: Attrs = {};
  for (const m of tagBody.matchAll(/([:\w-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g)) {
    attrs[(m[1] as string).toLowerCase()] = decode(m[2] ?? m[3] ?? m[4] ?? "");
  }
  return attrs;
}

function startTags(html: string, name: string): Attrs[] {
  const re = new RegExp(`<${name}(?=[\\s>/])([^>]*)>`, "gi");
  return [...html.matchAll(re)].map((m) => parseAttrs(m[1] as string));
}

export function parseHtml(html: string): ParsedPage {
  const meta: Record<string, string> = {};
  for (const a of startTags(html, "meta")) {
    const key = a.name ?? a.property;
    if (key && a.content !== undefined) meta[key] = a.content;
  }
  const links = startTags(html, "link");
  const jsonLd: unknown[] = [];
  for (const m of html.matchAll(
    /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi,
  )) {
    try {
      jsonLd.push(JSON.parse(m[1] as string));
    } catch {
      jsonLd.push({ "@error": "invalid JSON" });
    }
  }
  const anchorTexts = new Map<string, string[]>();
  for (const m of html.matchAll(/<a(?=[\s>])([^>]*)>([\s\S]*?)<\/a>/gi)) {
    const href = parseAttrs(m[1] as string).href;
    if (!href) continue;
    const text = (m[2] as string)
      .replace(/<[^>]*>/g, "")
      .replace(/\s+/g, " ")
      .trim();
    anchorTexts.set(href, [...(anchorTexts.get(href) ?? []), text]);
  }
  const scripts = startTags(html, "script").flatMap((a) => (a.src ? [a.src] : []));
  const images = startTags(html, "img");
  const title = /<title>([^<]*)<\/title>/i.exec(html)?.[1];
  return {
    lang: /<html[^>]*\blang="([^"]*)"/i.exec(html)?.[1],
    title: title === undefined ? undefined : decode(title).trim(),
    description: meta.description,
    canonical: links.find((l) => l.rel === "canonical")?.href,
    robots: meta.robots,
    h1Count: (html.match(/<h1(?=[\s>])/gi) ?? []).length,
    hasCharset: /<meta[^>]*\bcharset=/i.test(html),
    hasViewport: meta.viewport !== undefined,
    meta,
    links,
    anchors: startTags(html, "a").flatMap((a) => (a.href ? [a.href] : [])),
    sources: [...scripts, ...images.flatMap((i) => (i.src ? [i.src] : []))],
    images,
    jsonLd,
    anchorTexts,
  };
}

/** Значення `<loc>` із sitemap.xml. */
export const sitemapLocs = (xml: string): string[] =>
  [...xml.matchAll(/<loc>([^<]*)<\/loc>/g)].map((m) => decode(m[1] as string));

export type Resolved =
  | { kind: "internal"; rel: string }
  | { kind: "external" }
  | { kind: "ignore" }
  | { kind: "bad"; reason: string };

/**
 * Перетворює посилання на шлях усередині dist/. Абсолютні шляхи мають починатися з BASE_PATH,
 * повні URL свого сайту (siteUrl) теж зіставляються з dist; решта зовнішні.
 */
export function resolveLink(href: string, base: string, siteUrl: string): Resolved {
  if (href === "" || href.startsWith("#") || /^(mailto:|tel:|javascript:|data:)/i.test(href))
    return { kind: "ignore" };
  let path = href;
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(href) || href.startsWith("//")) {
    if (!href.startsWith(siteUrl)) return { kind: "external" };
    path = href.slice(new URL(siteUrl).origin.length);
  }
  path = path.split("#")[0]?.split("?")[0] ?? "";
  if (!path.startsWith("/"))
    return { kind: "bad", reason: "relative link (expected an absolute path under BASE_PATH)" };
  if (!path.startsWith(base))
    return { kind: "bad", reason: `path does not start with BASE_PATH ${base}` };
  return { kind: "internal", rel: decodeURIComponent(path.slice(base.length)) };
}

/** Кандидати файлів у dist/ для посилання (каталоги → index.html). */
export function distCandidates(rel: string): string[] {
  if (rel === "" || rel.endsWith("/")) return [`${rel}index.html`];
  const last = rel.split("/").pop() ?? "";
  return last.includes(".") ? [rel] : [rel, `${rel}/index.html`, `${rel}.html`];
}
