// Генерує всю графіку сайту з tokens.ts і спільних форм (src/gfx): favicon, іконки manifest,
// OG-картинку й manifest.webmanifest. Результат — у public/ (не комітиться). Запуск: `npm run assets`.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import sharp from "sharp";
import { basePath, siteUrl } from "../plugins/env.ts";
import { devlog } from "../src/content/devlog/index.ts";
import { faviconSvg, iconSvg, ogSvg } from "../src/gfx/brand.ts";
import { buildHumans, humansDate } from "../src/site/humans.ts";
import { devlogEntryHtml } from "../src/site/layout.ts";
import { allPages } from "../src/site/pages.ts";
import { buildRobots, buildSitemap } from "../src/site/sitemap.ts";
import { dark, fonts, light } from "../src/theme/tokens.ts";

const OUT = "public";
mkdirSync(OUT, { recursive: true });

const png = async (svg: string, file: string, width: number, height: number, opaque = false) => {
  let img = sharp(Buffer.from(svg), { density: 72 }).resize(width, height);
  if (opaque) img = img.flatten({ background: light.paper }).removeAlpha();
  await img.png({ compressionLevel: 9 }).toFile(`${OUT}/${file}`);
  const meta = await sharp(`${OUT}/${file}`).metadata();
  if (meta.width !== width || meta.height !== height) {
    throw new Error(`${file}: expected ${width}x${height}, got ${meta.width}x${meta.height}`);
  }
  console.log(`${file}  ${width}x${height}`);
};

// Favicon: SVG зі світлою/темною версією + PNG 32
writeFileSync(`${OUT}/favicon.svg`, faviconSvg(light, dark));
await png(iconSvg(light, { size: 128, fill: 0.82, radius: 0.2 }), "favicon-32.png", 32, 32);

// Apple touch icon: 180×180 без прозорості
await png(
  iconSvg(light, { size: 180, fill: 0.78, radius: 0 }),
  "apple-touch-icon.png",
  180,
  180,
  true,
);

// Іконки manifest: звичайні й maskable (голова в безпечній зоні 80%: вписана в коло радіусом 40%)
await png(iconSvg(light, { size: 192, fill: 0.7, radius: 0.2 }), "icon-192.png", 192, 192);
await png(iconSvg(light, { size: 512, fill: 0.7, radius: 0.2 }), "icon-512.png", 512, 512);
await png(
  iconSvg(light, { size: 512, fill: 0.5, radius: 0 }),
  "icon-maskable-512.png",
  512,
  512,
  true,
);

// OG / Twitter: 1200×630, стабільний шлях без хешу
await png(ogSvg(light), "og-image.png", 1200, 630, true);

// Web manifest
const manifest = {
  name: "Origami Ninja",
  short_name: "Origami Ninja",
  description: "A paper ninja platformer: run, fold and glide over a burning mountain.",
  start_url: basePath,
  scope: basePath,
  display: "standalone",
  theme_color: light.bg,
  background_color: light.bg,
  icons: [
    { src: `${basePath}icon-192.png`, sizes: "192x192", type: "image/png", purpose: "any" },
    { src: `${basePath}icon-512.png`, sizes: "512x512", type: "image/png", purpose: "any" },
    {
      src: `${basePath}icon-maskable-512.png`,
      sizes: "512x512",
      type: "image/png",
      purpose: "maskable",
    },
  ],
};
writeFileSync(`${OUT}/manifest.webmanifest`, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`manifest.webmanifest  (fonts: ${fonts.heading} + ${fonts.body}, base ${basePath})`);

// Окрема OG-картинка для кожного запису devlog + HTML-сторінки записів (src/devlog/<slug>/)
mkdirSync(`${OUT}/og`, { recursive: true });
for (const entry of devlog) {
  await png(
    ogSvg(light, { title: entry.title, kicker: "Devlog" }),
    `og/${entry.slug}.png`,
    1200,
    630,
    true,
  );
  mkdirSync(`src/devlog/${entry.slug}`, { recursive: true });
  writeFileSync(`src/devlog/${entry.slug}/index.html`, devlogEntryHtml(entry));
}

// humans.txt: версії беруться з package-lock.json і Dockerfile
const lock = JSON.parse(readFileSync("package-lock.json", "utf8")) as {
  packages: Record<string, { version?: string }>;
};
const ver = (pkg: string) => lock.packages[`node_modules/${pkg}`]?.version ?? "";
const dockerfile = readFileSync("Dockerfile", "utf8");
const arg = (name: string, re: RegExp) =>
  re.exec(dockerfile.split(`ARG ${name}=`)[1] ?? "")?.[1] ?? "";
writeFileSync(
  `${OUT}/humans.txt`,
  buildHumans({
    date: humansDate(),
    components: {
      Phaser: ver("phaser"),
      Vite: ver("vite"),
      TypeScript: ver("typescript"),
      Vitest: ver("vitest"),
      Biome: ver("@biomejs/biome"),
      Playwright: ver("@playwright/test"),
      "Lighthouse CI": ver("@lhci/cli"),
      sharp: ver("sharp"),
      Node: arg("NODE_IMAGE", /node:([\d.]+)/),
      Docker: "",
      Caddy: arg("CADDY_IMAGE", /caddy:([\d.]+)/),
      "GitHub Actions": "",
      "GitHub Pages": "",
    },
    fonts: [fonts.heading, fonts.body],
  }),
);
console.log("humans.txt, devlog pages and og/*.png written");

// sitemap.xml і robots.txt: зі списку сторінок, SITE_URL і BASE_PATH
writeFileSync(`${OUT}/sitemap.xml`, buildSitemap(allPages, siteUrl));
writeFileSync(`${OUT}/robots.txt`, buildRobots(siteUrl));
console.log("sitemap.xml and robots.txt written");
