// Vite-плагін теми: інжектить у <head> CSS-змінні з tokens.ts, <meta theme-color> для обох тем,
// inline-скрипт (ставить тему до першого рендеру) і preload ключових шрифтів.
import type { HtmlTagDescriptor, Plugin } from "vite";
import { washiTexture } from "../src/theme/texture.ts";
import { cssVars, themes } from "../src/theme/tokens.ts";

export const THEME_STORAGE_KEY = "origami-ninja:theme";

// Ключові шрифти для preload (латиниця для заголовків і тексту).
const PRELOAD = ["shippori-mincho-700-latin.woff2", "hanken-grotesk-var-latin.woff2"];

function themeCss(): string {
  const light = `${cssVars("light")};--tex:${washiTexture("light")}`;
  const dark = `${cssVars("dark")};--tex:${washiTexture("dark")}`;
  return [
    `:root{${light}}`,
    `@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){${dark}}}`,
    `:root[data-theme="dark"]{${dark}}`,
  ].join("\n");
}

// Без try/catch до localStorage не звертаємось: в окремих браузерах доступ може кидати помилку.
const INLINE_SCRIPT = `(function(){var d=document.documentElement;d.classList.add("js");try{var t=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});if(t==="light"||t==="dark"){d.setAttribute("data-theme",t)}}catch(e){}})();`;

export function themePlugin(base: string): Plugin {
  return {
    name: "origami-theme",
    transformIndexHtml: {
      order: "post",
      handler(_html, ctx) {
        const tags: HtmlTagDescriptor[] = [
          { tag: "script", children: INLINE_SCRIPT, injectTo: "head-prepend" },
          {
            tag: "style",
            attrs: { id: "theme-vars" },
            children: themeCss(),
            injectTo: "head-prepend",
          },
          {
            tag: "meta",
            attrs: {
              name: "theme-color",
              content: themes.light.bg,
              media: "(prefers-color-scheme: light)",
            },
            injectTo: "head",
          },
          {
            tag: "meta",
            attrs: {
              name: "theme-color",
              content: themes.dark.bg,
              media: "(prefers-color-scheme: dark)",
            },
            injectTo: "head",
          },
        ];
        // Preload можливий лише в збірці: там відомі імена файлів із хешем.
        if (ctx.bundle) {
          for (const name of PRELOAD) {
            const asset = Object.values(ctx.bundle).find(
              (a) => a.type === "asset" && a.originalFileNames?.some((n) => n.endsWith(name)),
            );
            if (asset) {
              tags.push({
                tag: "link",
                attrs: {
                  rel: "preload",
                  as: "font",
                  type: "font/woff2",
                  href: `${base}${asset.fileName}`,
                  crossorigin: "",
                },
                injectTo: "head",
              });
            }
          }
        }
        return tags;
      },
    },
  };
}
