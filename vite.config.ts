import { readdirSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig } from "vite";
import { assetsPlugin } from "./plugins/assets.ts";
import { analyticsEnabled, basePath, gaId, gtmId, siteUrl } from "./plugins/env.ts";
import { layoutPlugin } from "./plugins/layout.ts";
import { themePlugin } from "./plugins/theme.ts";

// Корінь Vite — src/: сторінки лежать у src/<url>/index.html, тож URL збігаються зі структурою.
const srcRoot = resolve(import.meta.dirname, "src");

// Усі HTML-входи: src/**/index.html і src/404.html (нові сторінки підхоплюються автоматично).
function htmlInputs(): Record<string, string> {
  const files = readdirSync(srcRoot, { recursive: true, encoding: "utf8" })
    .map((f) => f.split("\\").join("/"))
    .filter((f) => f.endsWith("index.html") || f === "404.html")
    .filter((f) => !f.includes("node_modules"));
  return Object.fromEntries(
    files.map((f) => [f.replace(/\/?index\.html$|\.html$/, "") || "index", resolve(srcRoot, f)]),
  );
}

export default defineConfig({
  root: srcRoot,
  plugins: [
    layoutPlugin(srcRoot, basePath, siteUrl, analyticsEnabled),
    themePlugin(basePath),
    assetsPlugin(basePath),
  ],
  base: basePath,
  publicDir: resolve(import.meta.dirname, "public"),
  define: {
    __SITE_URL__: JSON.stringify(siteUrl),
    __BASE_PATH__: JSON.stringify(basePath),
    __GA_ID__: JSON.stringify(gaId),
    __GTM_ID__: JSON.stringify(gtmId),
  },
  server: {
    host: "0.0.0.0",
    port: 5173,
    // Polling, щоб watcher працював у Docker на macOS/Windows.
    watch: { usePolling: true, interval: 150 },
  },
  build: {
    outDir: resolve(import.meta.dirname, "dist"),
    emptyOutDir: true,
    target: "es2022",
    rollupOptions: {
      // Multi-page: нові сторінки додаються сюди.
      input: htmlInputs(),
    },
  },
});
