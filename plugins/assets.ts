// Плагін графіки: вставляє hero (`<!--hero-->`) і посилання на favicon/іконки/manifest у <head>.
import type { HtmlTagDescriptor, Plugin } from "vite";
import { heroSvg } from "../src/gfx/brand.ts";

export function assetsPlugin(base: string): Plugin {
  const hero = heroSvg();
  return {
    name: "origami-assets",
    transformIndexHtml: {
      order: "pre",
      handler(html) {
        const tags: HtmlTagDescriptor[] = [
          {
            tag: "link",
            attrs: { rel: "icon", href: `${base}favicon.svg`, type: "image/svg+xml" },
            injectTo: "head",
          },
          {
            tag: "link",
            attrs: {
              rel: "icon",
              href: `${base}favicon-32.png`,
              sizes: "32x32",
              type: "image/png",
            },
            injectTo: "head",
          },
          {
            tag: "link",
            attrs: { rel: "apple-touch-icon", href: `${base}apple-touch-icon.png` },
            injectTo: "head",
          },
          {
            tag: "link",
            attrs: { rel: "manifest", href: `${base}manifest.webmanifest` },
            injectTo: "head",
          },
        ];
        return { html: html.replace("<!--hero-->", hero), tags };
      },
    },
  };
}
