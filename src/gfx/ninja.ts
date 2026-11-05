// Фінальні форми ніндзя-ляльки та планера (SVG-рядки). Квадрат 64×64, дивиться праворуч.
// Планер — варіант C2: чорний дротик із ширшим візором і поясом на хвості.
import type { Palette } from "./palette.ts";

export type NinjaPose = "idle" | "run" | "glide";

const poly = (pts: string, fill: string, extra = "") =>
  `<polygon points="${pts}" fill="${fill}" ${extra}/>`;

/** Контур кольору аркуша створює "щілини" між шматками паперу. */
const gap = (p: Palette, w = 0.9) =>
  `stroke="${p.paper}" stroke-width="${w}" stroke-linejoin="round"`;

/** Планер: шматки ляльки склалися в дротик. Хвости пов'язки йдуть від носа назад. */
export function glider(p: Palette): string {
  const ink = p.ink;
  return `<g ${gap(p)}>${[
    poly("4,14 36,25 20,30.5", ink),
    poly("36,25 62,30 20,30.5", ink),
    poly("20,31.5 62,30.8 36,38", ink),
    poly("20,31.5 36,38 4,48", ink),
    // Візор: широка щілина на носі
    `<line x1="47" y1="29.9" x2="60.5" y2="30.1" stroke="${p.paper}" stroke-width="1.9" stroke-linecap="round"/>`,
    // Пов'язка на носі й хвости
    poly("44,26 48,27 50,34.5 46,34", p.accent),
    poly("45,27 34,19 20,12 4,7 19,15 33,22 46,30", p.accent),
    // Пояс на хвості: по смузі на кожному крилі
    poly("8,15.4 12,16.75 12,22.25 8,18.1", p.accent),
    poly("8,43.9 12,39.8 12,45.5 8,46.75", p.accent),
  ].join("")}</g>`;
}

/** Гліф голови для іконок у квадраті 64×64 (центр ≈ 30,33): капюшон, візор, пов'язка з хвостами. */
export const ICON_HEAD = { cx: 30, cy: 33, width: 56 } as const;

export function iconHead(p: Palette): string {
  return [
    poly("16,10 38,6 53,16 55,36 46,54 20,54 9,36", p.ink),
    poly("9,36 20,54 30,54 20,40", p.muted, 'fill-opacity="0.45"'),
    poly("20,27 51,24 52,36 22,39", p.paper),
    poly("26,29 33,30.5 26,34.5", p.ink),
    poly("46.5,28.5 39,30.5 46.5,34.5", p.ink),
    poly("10,15 54,13 55,21 11,23", p.accent),
    poly("10,16 2,10 3,19 9,23", p.accent),
    poly("10,20 1,26 7,29 11,23", p.accent),
  ].join("");
}

/** Голова-капюшон із проріззю візора й пов'язкою. slit — колір щілини (колір фону під головою). */
export function headPieces(p: Palette, slit: string): string {
  const f = (pts: string, fill = p.ink) => poly(pts, fill);
  return [
    f("530,70 645,58 700,95 722,135 650,150 628,182 622,245 615,250 548,258 500,135"),
    `<line x1="618" y1="120" x2="698" y2="95" stroke="${slit}" stroke-width="7"/>`,
    f("636,184 730,178 718,212 682,262 655,258 624,246"),
    f("503,128 565,121 648,151 636,171 520,166", p.accent),
  ].join("");
}

/** Параметри пози ляльки: кути деталей навколо суглобів (градуси) і зсуви рук. */
export interface PuppetParams {
  backLeg: number;
  frontLeg: number;
  /** Нахил верхньої частини тіла навколо стегон */
  lean: number;
  backHand: readonly [number, number];
  frontHand: readonly [number, number];
  tails: "idle" | "run" | "wave";
  /** Поворот меча навколо плеча (градуси); 0 — меч за спиною */
  swordAngle?: number;
}

const HANDS_REST = [0, 0] as const;

/** Кадри ляльки: ті самі деталі, інші кути. Цикл бігу — run0…run3. */
export const PUPPET_POSES = {
  idle: {
    backLeg: -16,
    frontLeg: 5,
    lean: 0,
    backHand: HANDS_REST,
    frontHand: HANDS_REST,
    tails: "idle",
  },
  /** Другий кадр idle: легке «дихання» й інші хвости пов'язки */
  idle2: {
    backLeg: -15,
    frontLeg: 4,
    lean: -1.5,
    backHand: [0, 5],
    frontHand: [0, 5],
    tails: "wave",
  },
  run0: {
    backLeg: 28,
    frontLeg: -38,
    lean: 8,
    backHand: [-30, -40],
    frontHand: [30, -50],
    tails: "run",
  },
  run1: {
    backLeg: 8,
    frontLeg: -12,
    lean: 8,
    backHand: [-12, -22],
    frontHand: [14, -32],
    tails: "wave",
  },
  run2: {
    backLeg: -38,
    frontLeg: 28,
    lean: 8,
    backHand: [28, -48],
    frontHand: [-34, -34],
    tails: "run",
  },
  run3: {
    backLeg: -12,
    frontLeg: 8,
    lean: 8,
    backHand: [12, -30],
    frontHand: [-12, -22],
    tails: "wave",
  },
  jump: {
    backLeg: -55,
    frontLeg: -72,
    lean: 3,
    backHand: [-12, -90],
    frontHand: [22, -100],
    tails: "run",
  },
  attack: {
    backLeg: 20,
    frontLeg: -34,
    lean: 14,
    backHand: [40, -30],
    frontHand: [70, -40],
    tails: "run",
    swordAngle: 62,
  },
  /** Проміжний кадр між стоячим і планером: ноги підтягнуті, тулуб подається вперед */
  fold: {
    backLeg: -88,
    frontLeg: -98,
    lean: 30,
    backHand: [34, -16],
    frontHand: [74, -6],
    tails: "run",
  },
  /** Приголомшення після удару: відкинутий назад, руки вгору */
  hurt: {
    backLeg: 16,
    frontLeg: -20,
    lean: -20,
    backHand: [-30, -120],
    frontHand: [36, -118],
    tails: "run",
  },
  fall: {
    backLeg: 22,
    frontLeg: -22,
    lean: -3,
    backHand: [-22, -80],
    frontHand: [26, -90],
    tails: "run",
  },
} as const satisfies Record<string, PuppetParams>;

export type PuppetPoseName = keyof typeof PUPPET_POSES;

/**
 * Паперова лялька за чернеткою: окремі деталі з щілинами.
 * Координати деталей — у системі чернетки (≈1024), далі масштабуються в 64×64.
 * Пози отримуються з тих самих деталей поворотами навколо суглобів.
 */
export function puppetFigure(p: Palette, q: PuppetParams): string {
  const ink = p.ink;
  const f = (pts: string, fill = ink, extra = "") => poly(pts, fill, extra);
  const head = headPieces(p, p.paper);
  const tailsRun =
    f("505,140 410,138 330,112 372,158 440,178 512,165", p.accent) +
    f("510,150 420,185 340,200 400,215 520,172", p.accent);
  const tailsIdle =
    f("505,140 430,152 372,142 400,172 450,186 512,165", p.accent) +
    f("510,152 440,205 400,250 460,232 520,172", p.accent);
  const tailsWave =
    f("505,140 420,128 352,150 396,166 452,168 512,165", p.accent) +
    f("510,150 432,196 366,184 414,228 484,204 520,172", p.accent);
  const bodyPieces = [
    f("548,260 620,292 578,362 560,320"),
    f("458,275 548,260 562,332 555,335"),
    f("290,395 458,275 555,335 430,425", p.muted, 'fill-opacity="0.75"'),
    f("290,395 430,425 428,640 335,588"),
    f("448,418 555,335 578,362 462,540"),
    f("580,365 620,292 652,422 578,522 465,527"),
    f("462,545 575,522 662,698 580,730 520,708"),
    f("462,560 520,708 540,745 455,738 438,690"),
    f("466,548 574,525 582,553 474,578", p.accent),
  ].join("");
  const backLeg =
    f("455,738 540,748 532,778 395,893 358,870 365,770") + f("355,880 390,900 430,985 305,928");
  const frontLeg =
    f("662,702 580,732 518,810 575,905 615,905") + f("572,908 615,908 692,968 552,975");
  const handBack = f("395,625 425,650 402,690 362,655");
  const handFront = f("738,490 752,565 676,552") + f("688,562 750,567 716,598");
  const sword =
    f("470,330 728,22 762,52 500,362", p.paper, `stroke="${ink}" stroke-width="9"`) +
    f("455,320 505,355 480,385 435,350", p.accent);

  const rot = (deg: number, x: number, y: number, inner: string) =>
    `<g transform="rotate(${deg} ${x} ${y})">${inner}</g>`;
  const move = (d: readonly [number, number], inner: string) =>
    `<g transform="translate(${d[0]} ${d[1]})">${inner}</g>`;
  const upper =
    rot(q.swordAngle ?? 0, 480, 345, sword) +
    bodyPieces +
    head +
    (q.tails === "run" ? tailsRun : q.tails === "wave" ? tailsWave : tailsIdle);
  const figure =
    rot(q.backLeg, 500, 742, backLeg) +
    rot(q.frontLeg, 620, 712, frontLeg) +
    rot(q.lean, 540, 720, upper + move(q.backHand, handBack) + move(q.frontHand, handFront));
  // Щілини між деталями: контур кольору аркуша (ефект вирізаних шматків паперу).
  return `<g transform="translate(-2.8 -2.9) scale(0.0669)" stroke="${p.paper}" stroke-width="9" stroke-linejoin="round">${figure}</g>`;
}

export function puppet(pose: NinjaPose, p: Palette): string {
  if (pose === "glide") return glider(p);
  return puppetFigure(p, pose === "run" ? PUPPET_POSES.run0 : PUPPET_POSES.idle);
}
