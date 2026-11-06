import type { LevelDef } from "./types.ts";

/**
 * Рівень 3: «Палаюча пагода» — вертикальний підйом по карнизах, поки знизу повзе стіна вогню.
 * Звичайним стрибком долаються східці по ~100 px; високі карнизи (>136 px) потребують стрибка жабки.
 */
export const burningPagoda: LevelDef = {
  id: "burning-pagoda",
  name: "Burning Pagoda",
  bg: "pagoda",
  vertical: true,
  frog: true,
  hint: "Hold Jump on the ground to charge a frog leap",
  width: 960,
  height: 2300,
  spawn: { x: 90, y: 2200 },
  rise: {},
  platforms: [
    // Підлога першого ярусу
    { x: 0, y: 2200, width: 960, height: 100 },
    // Перший підйом: східці по 100 px
    { x: 620, y: 2100, width: 200, height: 22, oneWay: true },
    { x: 320, y: 2000, width: 220, height: 22, oneWay: true },
    { x: 40, y: 1900, width: 220, height: 22, oneWay: true },
    { x: 340, y: 1800, width: 200, height: 22, oneWay: true },
    { x: 660, y: 1700, width: 240, height: 22, oneWay: true },
    // Високий карниз: 220 px вгору, потрібна жабка
    { x: 400, y: 1480, width: 260, height: 22, oneWay: true },
    { x: 120, y: 1380, width: 200, height: 22, oneWay: true },
    // Ярус із падаючими балками
    { x: 420, y: 1290, width: 200, height: 22, oneWay: true },
    { x: 680, y: 1200, width: 260, height: 22, oneWay: true },
    { x: 400, y: 1100, width: 200, height: 22, oneWay: true },
    { x: 80, y: 1000, width: 240, height: 22, oneWay: true },
    // Галерея з лучником і ворогом
    { x: 440, y: 900, width: 420, height: 22, oneWay: true },
    // Другий високий карниз: 260 px, жабка з майже повним зарядом
    { x: 120, y: 640, width: 240, height: 22, oneWay: true },
    { x: 440, y: 550, width: 200, height: 22, oneWay: true },
    { x: 720, y: 450, width: 200, height: 22, oneWay: true },
    // Верхня галерея з лучником
    { x: 380, y: 350, width: 300, height: 22, oneWay: true },
    // Дах: 180 px вгору, остання жабка
    { x: 60, y: 170, width: 300, height: 22, oneWay: true },
  ],
  enemies: [{ x: 650, y: 900, patrolLeft: 560, patrolRight: 760 }],
  archers: [
    { x: 830, y: 900 },
    { x: 420, y: 350 },
  ],
  beams: [
    { x: 520, topY: 1130, landY: 1290, intervalMs: 3200, offsetMs: 800 },
    { x: 540, topY: 380, landY: 550, intervalMs: 2800, offsetMs: 1500 },
    { x: 620, topY: 600, landY: 900, intervalMs: 3400, offsetMs: 2200 },
  ],
  fires: [{ x: 760, y: 1110, width: 100, height: 90 }],
  winds: [],
  checkpoints: [
    { x: 780, y: 1700 },
    { x: 480, y: 900 },
    { x: 800, y: 450 },
  ],
  finish: { x: 200, y: 170, width: 70, height: 130 },
};
