// Єдине джерело дизайн-токенів: палітра A «Washi & Sumi» (світла й темна), шрифти A.
// З нього беруть стиль гра, CSS сайту (CSS custom properties) і генератор графіки.
import { bestOn, type Palette } from "../gfx/palette.ts";

export const fonts = {
  heading: "Shippori Mincho",
  body: "Hanken Grotesk",
} as const;

export const light: Palette = {
  bg: "#F4EEE1",
  paper: "#FBF7EE",
  ink: "#1E1B18",
  muted: "#5A534A",
  accent: "#B3261E",
  fire: "#E8602C",
  shade: "#DCD2BE",
};

export const dark: Palette = {
  bg: "#1A1714",
  paper: "#24201C",
  ink: "#F1E9DA",
  muted: "#B8AE9D",
  accent: "#FF6B5E",
  fire: "#FF9A4D",
  shade: "#3A342D",
};

export type ThemeName = "light" | "dark";

export const themes: Record<ThemeName, Palette> = { light, dark };

/** Колір тексту на акценті (кнопки): білий або майже чорний — що контрастніше. */
export const onAccent = (theme: ThemeName): string => bestOn(themes[theme].accent);

/** Назви CSS-змінних, що генеруються з токенів. */
export function cssVars(theme: ThemeName): string {
  const p = themes[theme];
  return [
    `--color-bg:${p.bg}`,
    `--color-paper:${p.paper}`,
    `--color-ink:${p.ink}`,
    `--color-muted:${p.muted}`,
    `--color-accent:${p.accent}`,
    `--color-fire:${p.fire}`,
    `--color-shade:${p.shade}`,
    `--color-on-accent:${onAccent(theme)}`,
    `color-scheme:${theme}`,
  ].join(";");
}
