// Спільні типи палітри та допоміжні функції контрасту (WCAG 2.x).

export interface Palette {
  /** Фон сторінки */
  bg: string;
  /** Колір "аркуша" (картки, небо рівня) */
  paper: string;
  /** Основний колір тексту і тіла ніндзя */
  ink: string;
  /** Приглушений текст і грані складок */
  muted: string;
  /** Акцент (шарф, посилання, кнопки) */
  accent: string;
  /** Вогонь */
  fire: string;
  /** Тіні та далекі гори */
  shade: string;
}

function channel(v: number): number {
  const c = v / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    Number.parseInt(h.slice(0, 2), 16),
    Number.parseInt(h.slice(2, 4), 16),
    Number.parseInt(h.slice(4, 6), 16),
  ];
}

export function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrast(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** Білий або майже чорний — залежно від того, що контрастніше на заданому фоні. */
export function bestOn(bg: string): string {
  return contrast("#FFFFFF", bg) >= contrast("#111111", bg) ? "#FFFFFF" : "#111111";
}
