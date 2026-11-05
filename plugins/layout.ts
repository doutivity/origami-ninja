// Плагін шаблонів: на етапі збірки вставляє в кожну HTML-сторінку спільні header/footer,
// мета-теги, canonical, OG/Twitter, JSON-LD і підключає стилі. Без дублювання коду по сторінках.
import { relative } from "node:path";
import type { HtmlTagDescriptor, Plugin } from "vite";
import {
  devlogListHtml,
  footerHtml,
  headerHtml,
  headTags,
  jsonLdScripts,
} from "../src/site/layout.ts";
import { pageByPath } from "../src/site/pages.ts";

/** src/devlog/foo/index.html → /devlog/foo/ ; src/404.html → /404.html */
export function urlPathFor(srcRoot: string, filename: string): string {
  const rel = relative(srcRoot, filename).split("\\").join("/");
  if (rel.endsWith("index.html")) return `/${rel.slice(0, -"index.html".length)}`;
  return `/${rel}`;
}

export function layoutPlugin(
  srcRoot: string,
  base: string,
  siteUrl: string,
  analytics: boolean,
): Plugin {
  return {
    name: "origami-layout",
    transformIndexHtml: {
      order: "pre",
      handler(html, ctx) {
        const path = urlPathFor(srcRoot, ctx.filename);
        const page = pageByPath(path);
        if (!page) return html;

        // Спершу BASE_PATH для посилань у самому файлі сторінки, потім вставляємо вже готові
        // фрагменти (список devlog, header, footer): у них база додана самостійно.
        let out = html
          .replace(/(<a\s[^>]*?href=")\/(?!\/)/g, `$1${base}`)
          .replace("<!--devlog-list-->", devlogListHtml(base))
          .replace(/(<body[^>]*>)/, `$1\n${headerHtml(base, page)}`)
          .replace("</body>", `${footerHtml(base, analytics)}\n</body>`);
        // Для 404 абсолютні шляхи вже містять BASE_PATH (Pages віддає її на довільних URL).

        const tags: HtmlTagDescriptor[] = [
          {
            tag: "meta",
            attrs: { name: "viewport", content: "width=device-width, initial-scale=1" },
            injectTo: "head-prepend",
          },
          { tag: "title", children: page.title, injectTo: "head" },
          ...headTags(page, base, siteUrl).map((t) => ({
            tag: t.tag,
            attrs: t.attrs,
            injectTo: "head" as const,
          })),
          { tag: "link", attrs: { rel: "stylesheet", href: "/styles/site.css" }, injectTo: "head" },
          { tag: "script", attrs: { type: "module", src: "/theme/switcher.ts" }, injectTo: "head" },
          ...(analytics
            ? [
                {
                  tag: "script",
                  attrs: { type: "module", src: "/consent/main.ts" },
                  injectTo: "head" as const,
                },
              ]
            : []),
          ...jsonLdScripts(page, siteUrl).map((json) => ({
            tag: "script",
            attrs: { type: "application/ld+json" },
            children: json,
            injectTo: "head" as const,
          })),
        ];
        if (!/<meta\s+charset/i.test(out)) {
          tags.unshift({ tag: "meta", attrs: { charset: "utf-8" }, injectTo: "head-prepend" });
        }
        out = out.replace(/<title>[^<]*<\/title>/, "");
        return { html: out, tags };
      },
    },
  };
}
