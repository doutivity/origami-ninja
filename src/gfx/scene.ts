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

/** Лучник у квадраті 32×30: онi (зсунутий на 4 одиниці вправо) з луком; frame 1 — тятива натягнута зі стрілою. */
export function archer(p: Palette, frame: 0 | 1): string {
  const bowX = 27;
  const bow = `<path d="M${bowX - 2},4 Q${bowX + 5},15 ${bowX - 2},26" stroke="${p.ink}" stroke-width="1.4" fill="none" stroke-linecap="round"/>`;
  const string =
    frame === 0
      ? `<line x1="${bowX - 2}" y1="4" x2="${bowX - 2}" y2="26" stroke="${p.muted}" stroke-width="0.5"/>`
      : `<polyline points="${bowX - 2},4 ${bowX - 9},15 ${bowX - 2},26" stroke="${p.muted}" stroke-width="0.5" fill="none"/>` +
        poly(`${bowX - 9},14 ${bowX + 6},14.4 ${bowX + 6},15.6 ${bowX - 9},16`, p.ink) +
        poly(`${bowX + 6},13 ${bowX + 9},15 ${bowX + 6},17`, p.fire);
  return `<g transform="translate(4 0)">${oni(p, 0)}</g>${bow}${string}`;
}

/** Вогняна стріла у прямокутнику 20×4: деревце, наконечник-полум'я й іскра на хвості. */
export function fireArrow(p: Palette): string {
  return [
    `<rect x="3" y="1.4" width="12" height="1.2" fill="${p.ink}"/>`,
    poly("15,0 20,2 15,4", p.fire),
    poly("15,0.9 18,2 15,3.1", p.paper),
    poly("0,0.4 4,2 0,3.6", p.accent),
  ].join("");
}

/** Палаюча балка: дерев'яний брус із червоними обмотками та полум'ям зверху. Квадрат 64×40, брус внизу (висота 24). */
export function burningBeam(p: Palette): string {
  return [
    poly(
      "0,16 64,16 64,40 0,40",
      p.shade,
      `stroke="${p.ink}" stroke-width="2" stroke-linejoin="round"`,
    ),
    `<path d="M0,22H64M0,28H64M0,34H64" stroke="${p.ink}" stroke-opacity="0.25" stroke-width="1"/>`,
    poly("8,16 14,16 14,40 8,40", p.accent),
    poly("50,16 56,16 56,40 50,40", p.accent),
    flame(18, 17, 26, p),
    flame(34, 17, 32, p),
    flame(48, 17, 22, p),
  ].join("");
}

/** Фон «Палаюча пагода»: багатоярусна вежа в сутінках, ліхтарі й розсувні перегородки. */
export function pagodaBackdrop(p: Palette, w: number, h: number): string {
  const cx = w * 0.33;
  const parts: string[] = [];
  // Сітка перегородок сьодзі: ледь помітні лінії
  for (let x = 0; x < w; x += 96) {
    parts.push(
      `<rect x="${x}" y="0" width="2" height="${h}" fill="${p.muted}" fill-opacity="0.12"/>`,
    );
  }
  for (let y = 60; y < h; y += 96) {
    parts.push(
      `<rect x="0" y="${y}" width="${w}" height="2" fill="${p.muted}" fill-opacity="0.12"/>`,
    );
  }
  // Ярусна пагода
  for (let t = 0; t < 5; t++) {
    const base = h - 24 - t * 96;
    const half = 230 - t * 36;
    const body = half * 0.66;
    parts.push(
      poly(
        `${cx - body},${base} ${cx + body},${base} ${cx + body},${base - 56} ${cx - body},${base - 56}`,
        p.shade,
      ),
      poly(
        `${cx - body * 0.5},${base} ${cx + body * 0.5},${base} ${cx + body * 0.5},${base - 56} ${cx - body * 0.5},${base - 56}`,
        p.muted,
        'fill-opacity="0.35"',
      ),
      poly(
        `${cx - half - 38},${base - 46} ${cx - half * 0.6},${base - 74} ${cx + half * 0.6},${base - 74} ${cx + half + 38},${base - 46} ${cx + half},${base - 58} ${cx - half},${base - 58}`,
        p.ink,
        'fill-opacity="0.5"',
      ),
      poly(
        `${cx - half},${base - 58} ${cx + half},${base - 58} ${cx + half - 6},${base - 64} ${cx - half + 6},${base - 64}`,
        p.accent,
        'fill-opacity="0.6"',
      ),
    );
  }
  parts.push(
    poly(
      `${cx - 8},${h - 24 - 4 * 96 - 74} ${cx + 8},${h - 24 - 4 * 96 - 74} ${cx},${h - 24 - 4 * 96 - 130}`,
      p.ink,
      'fill-opacity="0.5"',
    ),
  );
  // Ліхтарі на нитках
  const lanterns = [140, 330, 560, 760, 900, 1180, 1420, 1650];
  lanterns.forEach((lx, i) => {
    const ly = 90 + ((i * 53) % 170);
    parts.push(
      `<line x1="${lx}" y1="0" x2="${lx}" y2="${ly}" stroke="${p.ink}" stroke-opacity="0.4" stroke-width="2"/>`,
      `<ellipse cx="${lx}" cy="${ly + 18}" rx="14" ry="19" fill="${p.accent}" fill-opacity="0.8"/>`,
      `<rect x="${lx - 8}" y="${ly - 2}" width="16" height="5" fill="${p.ink}" fill-opacity="0.6"/>`,
    );
  });
  return parts.join("");
}

/** Паперовий журавлик у квадраті 48×32; frame 0 — крила вгору, 1 — крила вниз. */
export function crane(p: Palette, frame: 0 | 1): string {
  const wing =
    frame === 0
      ? [poly("22,16 14,2 30,12", p.paper), poly("22,16 30,12 34,4", p.shade)]
      : [poly("22,16 12,28 30,20", p.paper), poly("22,16 30,20 36,28", p.shade)];
  return `<g stroke="${p.ink}" stroke-width="0.8" stroke-linejoin="round">${[
    poly("8,14 22,16 30,20 22,22", p.paper),
    ...wing,
    poly("30,20 40,16 38,19", p.paper),
    poly("38,16 44,18 38,19", p.accent),
    poly("8,14 2,12 8,16", p.paper),
    `<circle cx="39" cy="17" r="0.9" fill="${p.ink}"/>`,
  ].join("")}</g>`;
}

/** Флюгер на стовпі 40×110: закритий — сірий і нерухомий, відкритий — акцентний. Основа внизу. */
export function weathervane(p: Palette, open: boolean): string {
  const head = open ? p.accent : p.shade;
  return [
    `<rect x="18" y="26" width="4" height="82" fill="${p.ink}"/>`,
    poly("8,108 32,108 26,98 14,98", p.ink),
    `<circle cx="20" cy="24" r="4" fill="${p.ink}"/>`,
    poly("20,10 38,22 20,34", head, `stroke="${p.ink}" stroke-width="1.2" stroke-linejoin="round"`),
    poly(
      "20,10 2,22 20,34",
      open ? p.fire : p.muted,
      `fill-opacity="0.7" stroke="${p.ink}" stroke-width="1.2"`,
    ),
  ].join("");
}

/** Паперова стіна w×h для кірігамі-майстерні: вирізні щілини; товста — з акцентним хрестом-розпіркою. */
export function cutPanel(p: Palette, w: number, h: number, tough: boolean): string {
  const parts: string[] = [
    `<rect x="1" y="1" width="${w - 2}" height="${h - 2}" fill="${p.paper}" stroke="${p.ink}" stroke-width="${tough ? 3 : 1.6}"/>`,
  ];
  // Кірігамі-щілини: короткі косі прорізи рядами
  for (let y = 14; y < h - 10; y += 22) {
    const x = ((y / 22) % 2) * 6 + 5;
    parts.push(
      `<path d="M${x},${y} L${w - x},${y + 8}" stroke="${p.muted}" stroke-width="1.4" stroke-opacity="0.7" fill="none" stroke-linecap="round"/>`,
    );
  }
  if (tough) {
    parts.push(
      `<path d="M2,2 L${w - 2},${h - 2} M${w - 2},2 L2,${h - 2}" stroke="${p.accent}" stroke-width="3" fill="none"/>`,
      `<rect x="1" y="${h / 2 - 6}" width="${w - 2}" height="12" fill="${p.accent}" fill-opacity="0.8"/>`,
    );
  }
  return parts.join("");
}

/** Кірігамі-майстерня: розкрійний мат, ножиці на стіні, паперові гірлянди. */
export function workshopBackdrop(p: Palette, w: number, h: number): string {
  const parts: string[] = [];
  // Розкрійна сітка
  for (let x = 0; x < w; x += 64) {
    parts.push(
      `<rect x="${x}" y="0" width="1.5" height="${h}" fill="${p.muted}" fill-opacity="0.14"/>`,
    );
  }
  for (let y = 40; y < h; y += 64) {
    parts.push(
      `<rect x="0" y="${y}" width="${w}" height="1.5" fill="${p.muted}" fill-opacity="0.14"/>`,
    );
  }
  // Полиці з рулонами паперу
  for (let i = 0; i < 4; i++) {
    const x = 120 + i * 440;
    const y = 250 + ((i * 41) % 60);
    parts.push(
      `<rect x="${x}" y="${y}" width="260" height="10" fill="${p.ink}" fill-opacity="0.35"/>`,
      `<rect x="${x + 20}" y="${y - 54}" width="40" height="54" fill="${p.shade}"/>`,
      `<rect x="${x + 76}" y="${y - 40}" width="34" height="40" fill="${p.muted}" fill-opacity="0.5"/>`,
      `<rect x="${x + 128}" y="${y - 62}" width="46" height="62" fill="${p.shade}"/>`,
      poly(`${x + 196},${y} ${x + 214},${y - 44} ${x + 232},${y}`, p.accent, 'fill-opacity="0.45"'),
    );
  }
  // Ножиці на стіні
  for (const sx of [300, 980, 1500]) {
    parts.push(
      `<g stroke="${p.ink}" stroke-opacity="0.4" stroke-width="5" stroke-linecap="round" fill="none">`,
      `<line x1="${sx}" y1="120" x2="${sx + 60}" y2="40"/><line x1="${sx + 60}" y1="120" x2="${sx}" y2="40"/>`,
      `<circle cx="${sx}" cy="130" r="9"/><circle cx="${sx + 60}" cy="130" r="9"/></g>`,
    );
  }
  // Паперова гірлянда з трикутників
  for (let x = 0; x < w; x += 70) {
    parts.push(
      poly(
        `${x},0 ${x + 70},0 ${x + 35},${26 + ((x / 70) % 3) * 8}`,
        p.accent,
        'fill-opacity="0.22"',
      ),
    );
  }
  return parts.join("");
}

/** Чорнильна заплава: розмиті гори тушшю, очерет і чорнильні краплі, що стікають із неба. */
export function marshBackdrop(p: Palette, w: number, h: number): string {
  const parts: string[] = [];
  // Далекі гори, написані тушшю
  const hills = (
    base: number,
    step: number,
    amp: number,
    seed: number,
    fill: string,
    op: number,
  ) => {
    const pts = [`0,${h}`];
    for (let x = 0; x <= w; x += step) {
      const k = (Math.floor(x / step) * seed) % 5;
      pts.push(`${x},${base - (k / 4) * amp}`);
    }
    pts.push(`${w},${h}`);
    return poly(pts.join(" "), fill, `fill-opacity="${op}"`);
  };
  parts.push(
    hills(360, 200, 140, 3, p.shade, 1),
    hills(420, 150, 90, 7, p.muted, 0.35),
    hills(470, 110, 60, 4, p.ink, 0.28),
  );
  // Чорнильні кола-«плями» на небі
  for (let i = 0; i < 5; i++) {
    const x = 160 + ((i * 397) % (w - 200));
    const y = 70 + ((i * 53) % 120);
    parts.push(
      `<circle cx="${x}" cy="${y}" r="${26 + (i % 3) * 14}" fill="${p.ink}" fill-opacity="0.08"/>`,
    );
  }
  // Очерет
  for (let i = 0; i < 26; i++) {
    const x = (i * 77) % w;
    const top = 330 + ((i * 29) % 70);
    parts.push(
      `<line x1="${x}" y1="${h}" x2="${x + (i % 2 ? 6 : -6)}" y2="${top}" stroke="${p.ink}" stroke-opacity="0.32" stroke-width="3" stroke-linecap="round"/>`,
      poly(
        `${x + (i % 2 ? 6 : -6)},${top} ${x + (i % 2 ? 12 : -12)},${top + 22} ${x + (i % 2 ? 4 : -4)},${top + 18}`,
        p.ink,
        'fill-opacity="0.32"',
      ),
    );
  }
  return parts.join("");
}

/** Нічний каньйон: далекі скелі, місяць із ореолом, зірки й паперові смуги хмар. */
export function canyonBackdrop(p: Palette, w: number, h: number): string {
  const parts: string[] = [];
  // Зірки з детермінованим розкидом (без Math.random: збірка відтворювана)
  for (let i = 0; i < 46; i++) {
    const x = (i * 211) % w;
    const y = 14 + ((i * 97) % 230);
    const r = 1 + (i % 3) * 0.6;
    parts.push(`<circle cx="${x}" cy="${y}" r="${r}" fill="${p.paper}" fill-opacity="0.75"/>`);
  }
  // Місяць
  parts.push(
    `<circle cx="${w * 0.72}" cy="120" r="64" fill="${p.paper}" fill-opacity="0.16"/>`,
    `<circle cx="${w * 0.72}" cy="120" r="42" fill="${p.paper}" fill-opacity="0.9"/>`,
  );
  // Смуги хмар
  for (let i = 0; i < 6; i++) {
    const x = ((i * 337) % w) - 60;
    const y = 90 + ((i * 71) % 210);
    parts.push(
      `<rect x="${x}" y="${y}" width="${180 + (i % 3) * 60}" height="8" rx="4" fill="${p.muted}" fill-opacity="0.25"/>`,
    );
  }
  // Два шари стін каньйону: зубчасті силуети
  const ridge = (base: number, step: number, amp: number, seed: number) => {
    const pts = [`0,${h}`];
    for (let x = 0; x <= w; x += step) {
      const k = (Math.floor(x / step) * seed) % 7;
      pts.push(`${x},${base - (k / 6) * amp}`);
    }
    pts.push(`${w},${h}`);
    return pts.join(" ");
  };
  parts.push(
    poly(ridge(380, 120, 150, 3), p.shade),
    poly(ridge(450, 90, 110, 5), p.ink, 'fill-opacity="0.55"'),
  );
  return parts.join("");
}
