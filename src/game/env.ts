// Середовище гри: тема на момент запуску, режим налагодження, масштаб рендеру.

import type { Palette } from "../gfx/palette.ts";
import { type ThemeName, themes } from "../theme/tokens.ts";
import { qualityProfile } from "./quality.ts";

/** Тема береться на момент запуску гри: явний вибір користувача або системна. */
export function currentTheme(): ThemeName {
  const t = document.documentElement.dataset.theme;
  if (t === "light" || t === "dark") return t;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export const currentPalette = (): Palette => themes[currentTheme()];

/** "#RRGGBB" → число для Phaser. */
export const hexToNumber = (hex: string): number => Number.parseInt(hex.slice(1), 16);

const params = new URLSearchParams(window.location.search);

/** `?debug=1`: лічильник FPS, хітбокси, рівень якості. */
export const debugMode = params.get("debug") === "1";

/** `?touch=1` примусово показує сенсорні кнопки (для перевірки на десктопі). */
export const forceTouch = params.get("touch") === "1";

export const isTouchDevice = (): boolean =>
  forceTouch || navigator.maxTouchPoints > 0 || "ontouchstart" in window;

/** devicePixelRatio, обмежений зверху профілем якості (high — 2, low — 1). */
export const renderScale = (): number =>
  Math.min(window.devicePixelRatio || 1, qualityProfile().renderScaleMax);
