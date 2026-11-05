// Текстура рисового паперу (васі): довгі волокна + дрібне зерно, як SVG data-URI.
import { hexToRgb } from "../gfx/palette.ts";
import { type ThemeName, themes } from "./tokens.ts";

function noise(
  id: string,
  freq: string,
  octaves: number,
  rgb: [number, number, number],
  k: number,
  off: number,
) {
  const [r, g, b] = rgb.map((v) => (v / 255).toFixed(3));
  return `<filter id="${id}"><feTurbulence type="fractalNoise" baseFrequency="${freq}" numOctaves="${octaves}" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 ${r} 0 0 0 0 ${g} 0 0 0 0 ${b} 0 0 0 ${k} ${off}"/></filter><rect width="100%" height="100%" filter="url(#${id})"/>`;
}

export function washiTexture(theme: ThemeName): string {
  const ink = hexToRgb(themes[theme].ink);
  // Тонка текстура: на всю сторінку вона не повинна відволікати від тексту.
  const off = theme === "dark" ? -0.6 : -0.5;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="480">${noise("f", "0.012 0.55", 3, ink, 0.9, off)}${noise("g", "0.9", 2, ink, 0.4, -0.18)}</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}
