// Брендова графіка: favicon/іконки, OG-картинка й hero. Єдине джерело форм для сайту й PNG.
import { glider, ICON_HEAD, iconHead } from "./ninja.ts";
import type { Palette } from "./palette.ts";
import { cssPalette, flame, foldedCorner, mountains } from "./scene.ts";

const poly = (pts: string, fill: string, extra = "") =>
  `<polygon points="${pts}" fill="${fill}" ${extra}/>`;

export interface IconOptions {
  size: number;
  /** Частка ширини, яку займає голова (0–1) */
  fill: number;
  /** Радіус плитки як частка розміру (0 — суцільний квадрат) */
  radius: number;
}

/** Плитка з головою ніндзя (favicon, apple-touch-icon, іконки manifest). */
export function iconTile(p: Palette, o: IconOptions): string {
  const k = (o.size * o.fill) / ICON_HEAD.width;
  const t = `translate(${o.size / 2} ${o.size / 2}) scale(${k}) translate(${-ICON_HEAD.cx} ${-ICON_HEAD.cy})`;
  return `<rect width="${o.size}" height="${o.size}" rx="${o.size * o.radius}" fill="${p.paper}"/><g transform="${t}" stroke="${p.paper}" stroke-width="1.1" stroke-linejoin="round" paint-order="stroke">${iconHead(p)}</g>`;
}

export const iconSvg = (p: Palette, o: IconOptions): string =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${o.size}" height="${o.size}" viewBox="0 0 ${o.size} ${o.size}">${iconTile(p, o)}</svg>`;

/** favicon.svg: світла й темна версії через prefers-color-scheme. */
export function faviconSvg(light: Palette, dark: Palette): string {
  const vars = (p: Palette) =>
    `--color-paper:${p.paper};--color-ink:${p.ink};--color-accent:${p.accent};--color-muted:${p.muted};--color-bg:${p.bg};--color-shade:${p.shade};--color-fire:${p.fire}`;
  const tile = iconTile(cssPalette, { size: 64, fill: 0.82, radius: 0.2 });
  return `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><style>:root{${vars(light)}}@media (prefers-color-scheme:dark){:root{${vars(dark)}}}</style>${tile}</svg>`;
}

/** Простий перенос слів за кількістю символів. */
export function wrapText(text: string, maxChars: number): string[] {
  const lines: string[] = [];
  let cur = "";
  for (const word of text.split(/\s+/)) {
    if (cur && `${cur} ${word}`.length > maxChars) {
      lines.push(cur);
      cur = word;
    } else {
      cur = cur ? `${cur} ${word}` : word;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const HEADING = "font-family:'Shippori Mincho';font-weight:700";
const BODY = "font-family:'Hanken Grotesk'";

export interface OgOptions {
  /** Заголовок запису devlog; без нього малюється головна версія з назвою гри */
  title?: string;
  kicker?: string;
  slogan?: string;
}

/** OG-картинка 1200×630: назва + слоган (або заголовок запису), планер, гори й вогонь. */
export function ogSvg(p: Palette, o: OgOptions = {}): string {
  const W = 1200;
  const H = 630;
  let text: string;
  if (o.title) {
    const lines = wrapText(o.title, 22).slice(0, 3);
    const size = lines.length > 2 ? 64 : 76;
    text =
      `<text x="80" y="150" style="${BODY};font-weight:700;font-size:34px;letter-spacing:4px" fill="${p.accent}">${esc((o.kicker ?? "Devlog").toUpperCase())}</text>` +
      lines
        .map(
          (l, i) =>
            `<text x="80" y="${250 + i * (size + 14)}" style="${HEADING};font-size:${size}px" fill="${p.ink}">${esc(l)}</text>`,
        )
        .join("") +
      `<text x="80" y="570" style="${BODY};font-size:34px" fill="${p.muted}">Origami Ninja · a paper platformer</text>`;
  } else {
    text =
      `<text x="80" y="270" style="${HEADING};font-size:128px" fill="${p.ink}">Origami</text>` +
      `<text x="80" y="400" style="${HEADING};font-size:128px" fill="${p.ink}">Ninja</text>` +
      `<rect x="84" y="436" width="180" height="12" fill="${p.accent}"/>` +
      `<text x="80" y="520" style="${BODY};font-size:44px" fill="${p.muted}">${esc(o.slogan ?? "Run. Fold. Glide.")}</text>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<rect width="${W}" height="${H}" fill="${p.bg}"/>
<rect x="24" y="24" width="${W - 48}" height="${H - 48}" fill="${p.paper}"/>
<clipPath id="og-clip"><polygon points="640,24 ${W - 24},24 ${W - 24},${H - 24} 430,${H - 24}"/></clipPath>
<g clip-path="url(#og-clip)">${mountains(p, W, H - 24, 24)}</g>
<g transform="translate(790 70) scale(5)">${glider(p)}</g>
${flame(930, H - 24, 150, p)}${flame(1010, H - 24, 210, p)}${flame(1090, H - 24, 140, p)}
${foldedCorner(p, W, 150)}
${text}
</svg>`;
}

/** Hero для головної: ніндзя-планер над згорнутим аркушем у горах. Кольори — CSS-змінні. */
export function heroSvg(): string {
  const p = cssPalette;
  const W = 960;
  const H = 420;
  return `<svg class="hero" xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="A paper ninja gliding over mountains on a folded sheet of paper">
<style>
.hero{display:block;width:100%;height:auto;max-width:${W}px;margin:0 0 28px}
.hero-float{animation:hero-float 5s ease-in-out infinite}
.hero-sun{animation:hero-sun 6s ease-in-out infinite;transform-origin:760px 120px}
@keyframes hero-float{0%,100%{transform:translate(0,0) rotate(0)}50%{transform:translate(14px,-12px) rotate(-2deg)}}
@keyframes hero-sun{0%,100%{transform:scale(1)}50%{transform:scale(1.04)}}
@media (prefers-reduced-motion:reduce){.hero-float,.hero-sun{animation:none}}
</style>
<clipPath id="hero-clip"><rect width="${W}" height="${H}" rx="22"/></clipPath>
<g clip-path="url(#hero-clip)">
<rect width="${W}" height="${H}" fill="${p.paper}"/>
<circle class="hero-sun" cx="760" cy="120" r="52" fill="${p.accent}"/>
${poly("60,92 190,92 210,110 80,110", p.shade)}${poly("560,60 700,60 716,76 576,76", p.shade)}
<g transform="translate(0 20)">${mountains(p, W, H - 20, 70)}</g>
<path d="M330,420 L420,200 M600,420 L520,230 M180,420 L330,250" stroke="${p.paper}" stroke-opacity="0.45" stroke-width="2" fill="none"/>
${flame(470, H, 70, p)}${flame(510, H, 96, p)}${flame(548, H, 64, p)}
${poly(`${W - 150},${H} ${W},${H - 150} ${W},${H}`, p.shade)}
${poly(`${W - 150},${H} ${W},${H - 150} ${W - 150},${H - 150}`, p.paper, `stroke="${p.muted}" stroke-opacity="0.4" stroke-width="2"`)}
<g class="hero-float"><g transform="translate(120 70) scale(3.6)">${glider(p)}</g></g>
</g>
</svg>`;
}
