// Елементи паперового світу: гори, вогонь, складений кут аркуша. Кольори беруться з Palette,
// тож ті самі форми працюють і в PNG (реальні кольори), і в inline SVG (CSS-змінні).
import type { Palette } from "./palette.ts";

const poly = (pts: string, fill: string, extra = "") =>
  `<polygon points="${pts}" fill="${fill}" ${extra}/>`;

/** Палітра з CSS-змінних: дає inline SVG автоматичну підтримку світлої/темної теми. */
export const cssPalette: Palette = {
  bg: "var(--color-bg)",
  paper: "var(--color-paper)",
  ink: "var(--color-ink)",
  muted: "var(--color-muted)",
  accent: "var(--color-accent)",
  fire: "var(--color-fire)",
  shade: "var(--color-shade)",
};

/** Язики полум'я з основою в (x, y). h — висота. */
export function flame(x: number, y: number, h: number, p: Palette): string {
  const w = h * 0.55;
  const f = (k: number, fill: string) => {
    const hh = h * k;
    const ww = w * k;
    return `<path d="M${x - ww},${y} C${x - ww * 1.1},${y - hh * 0.4} ${x - ww * 0.2},${y - hh * 0.55} ${x},${y - hh} C${x + ww * 0.1},${y - hh * 0.55} ${x + ww * 1.15},${y - hh * 0.45} ${x + ww},${y} Z" fill="${fill}"/>`;
  };
  return f(1, p.fire) + f(0.68, p.accent) + f(0.36, p.paper);
}

/** Два шари гір для ландшафту шириною w, що закінчуються на висоті h. */
export function mountains(p: Palette, w: number, h: number, top: number): string {
  const k = w / 1200;
  const y = (v: number) => top + (v / 630) * (h - top);
  const far = [
    [0, 430],
    [160, 230],
    [300, 370],
    [470, 190],
    [640, 380],
    [800, 250],
    [960, 400],
    [1200, 220],
  ];
  const near = [
    [0, 520],
    [220, 380],
    [420, 490],
    [640, 350],
    [860, 500],
    [1040, 400],
    [1200, 470],
  ];
  const pts = (a: number[][]) =>
    a.map(([px, py]) => `${(px as number) * k},${y(py as number)}`).join(" ");
  return (
    poly(`${pts(far)} ${w},${h} 0,${h}`, p.shade) +
    poly(`${pts(near)} ${w},${h} 0,${h}`, p.muted, 'fill-opacity="0.4"')
  );
}

/** Складений правий верхній кут аркуша розміром s. */
export function foldedCorner(p: Palette, w: number, s: number): string {
  return (
    poly(`${w - s},0 ${w},0 ${w},${s}`, p.shade) +
    poly(
      `${w - s},0 ${w},${s} ${w - s},${s}`,
      p.paper,
      `stroke="${p.muted}" stroke-opacity="0.35" stroke-width="2"`,
    )
  );
}

/** Паперовий «онi» у квадраті 24×30; frame 0/1 — перекидання з ноги на ногу. */
export function oni(p: Palette, frame: 0 | 1): string {
  const tilt = frame === 0 ? -3 : 3;
  const feet =
    frame === 0
      ? poly("3,26 10,26 10,29 2,29", p.ink) + poly("14,26 21,26 22,29 14,29", p.ink)
      : poly("4,26 11,26 12,29 4,29", p.ink) + poly("13,26 20,26 20,29 12,29", p.ink);
  return `<g stroke="${p.paper}" stroke-width="0.5" stroke-linejoin="round"><g transform="rotate(${tilt} 12 29)">${feet}${[
    poly("2,27 5,8 19,8 22,27", p.accent),
    poly("12,8 19,8 22,27 12,27", p.ink, 'fill-opacity="0.28"'),
    poly("5,8 3,1 10,6", p.ink),
    poly("19,8 21,1 14,6", p.ink),
    poly("6.5,13 11,15 6.5,17.5", p.paper),
    poly("17.5,13 13,15 17.5,17.5", p.paper),
    poly("8,21 16,21 12,24.5", p.ink),
  ].join("")}</g></g>`;
}

/** Дуга удару мечем 100×60: тонкий півмісяць. */
export function slash(p: Palette): string {
  return `<path d="M4,54 Q50,-14 96,54 Q50,12 4,54Z" fill="${p.accent}"/><path d="M14,48 Q50,0 86,48 Q50,20 14,48Z" fill="${p.paper}" fill-opacity="0.85"/>`;
}

/** Кущ із трьох язиків полум'я у квадраті 120×130 (для вогняних зон). */
export function flameCluster(p: Palette): string {
  return flame(30, 128, 78, p) + flame(88, 128, 86, p) + flame(60, 128, 120, p);
}

/** Чекпоінт-прапорець у квадраті 40×90: сірий неактивний, червоний активний. */
export function checkpointFlag(p: Palette, active: boolean): string {
  const flag = active
    ? `${poly("10,8 38,19 10,32", p.accent)}<circle cx="8" cy="5" r="4" fill="${p.fire}"/>`
    : poly("10,8 38,19 10,32", p.shade, `stroke="${p.muted}" stroke-width="1"`) +
      `<circle cx="8" cy="5" r="3" fill="${p.muted}"/>`;
  return `<rect x="6" y="4" width="4" height="84" fill="${p.ink}"/>${flag}${poly("0,90 18,90 15,82 3,82", p.ink)}`;
}

/** Ворота фінішу (тори) у квадраті 80×140. */
export function finishGate(p: Palette): string {
  return [
    `<rect x="10" y="30" width="9" height="108" fill="${p.ink}"/>`,
    `<rect x="61" y="30" width="9" height="108" fill="${p.ink}"/>`,
    poly("0,12 80,12 74,30 6,30", p.accent),
    poly("-4,6 84,6 80,14 0,14", p.ink),
    `<rect x="6" y="46" width="68" height="7" fill="${p.ink}"/>`,
    poly("20,62 60,62 52,84 28,84", p.paper, `stroke="${p.ink}" stroke-width="1"`),
    poly("40,66 46,73 40,80 34,73", p.accent),
  ].join("");
}

/** М'яка овальна тінь під персонажем 64×16. */
export function blobShadow(p: Palette): string {
  return `<ellipse cx="32" cy="8" rx="30" ry="7" fill="${p.ink}" fill-opacity="0.28"/>`;
}

/** Бамбуковий ліс для рівня «Бамбукова річка»: стовбури з вузлами та орігамі-листям. */
export function bambooForest(p: Palette, w: number, h: number, top: number): string {
  const k = w / 1200;
  // Стовбури дальнього плану
  const farStalks = [70, 180, 310, 430, 560, 680, 800, 930, 1070]
    .map((bx) => {
      const x = bx * k;
      const bw = 12 * k;
      return (
        poly(`${x},${top} ${x + bw},${top + 6} ${x + bw},${h} ${x},${h}`, p.shade) +
        [140, 240, 340, 440]
          .map((y) =>
            poly(
              `${x - 2},${y} ${x + bw + 2},${y + 4} ${x + bw + 1},${y + 9} ${x - 1},${y + 5}`,
              p.muted,
              'fill-opacity="0.45"',
            ),
          )
          .join("")
      );
    })
    .join("");

  // Стовбури ближнього плану з орігамі-листям
  const nearStalks = [120, 250, 380, 500, 630, 750, 880, 1010, 1140]
    .map((bx) => {
      const x = bx * k;
      const bw = 18 * k;
      return (
        poly(
          `${x},${top + 20} ${x + bw},${top + 28} ${x + bw},${h} ${x},${h}`,
          p.muted,
          'fill-opacity="0.4"',
        ) +
        poly(
          `${x + bw},${top + 100} ${x + bw + 45 * k},${top + 80} ${x + bw},${top + 120}`,
          p.muted,
          'fill-opacity="0.55"',
        ) +
        poly(
          `${x},${top + 180} ${x - 40 * k},${top + 160} ${x},${top + 200}`,
          p.muted,
          'fill-opacity="0.55"',
        ) +
        [180, 300, 420]
          .map((y) =>
            poly(
              `${x - 3},${y} ${x + bw + 3},${y + 5} ${x + bw + 2},${y + 11} ${x - 2},${y + 6}`,
              p.ink,
              'fill-opacity="0.3"',
            ),
          )
          .join("")
      );
    })
    .join("");

  const reeds = poly(
    `0,${h - 40} 40,${h - 100} 70,${h - 30} 120,${h - 80} 160,${h - 20} 240,${h - 90} ${w},${h - 40} ${w},${h} 0,${h}`,
    p.shade,
  );

  return farStalks + nearStalks + reeds;
}

/** Водна поверхня з геометричними орігамі-хвилями (хвилеподібні ламані лінії). */
export function waterSurface(p: Palette, w: number, h: number): string {
  const segs = 10;
  const dx = w / segs;
  const crests: string[] = [];
  for (let i = 0; i <= segs; i++) {
    const x = i * dx;
    const y = i % 2 === 0 ? 3 : 12;
    crests.push(`${x},${y}`);
  }
  const pts = `0,${h} ${crests.join(" ")} ${w},${h}`;
  return (
    poly(pts, p.shade, 'fill-opacity="0.6"') +
    `<path d="${crests.map((pt, i) => `${i === 0 ? "M" : "L"}${pt}`).join(" ")}" stroke="${p.paper}" stroke-width="2.5" fill="none" stroke-linejoin="round"/>`
  );
}
