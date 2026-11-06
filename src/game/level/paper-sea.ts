import type { LevelDef } from "./types.ts";

/**
 * Рівень 7: «Паперове море» — шторм на воді.
 * Хвилі піднімають і опускають човник, риби вистрибують із води, а друге море має зустрічну течію
 * сильнішу за веслування: проти неї допомагає лише вітрило (утримання Attack).
 */
export const paperSea: LevelDef = {
  id: "paper-sea",
  name: "Paper Sea Storm",
  bg: "sea",
  sail: true,
  hint: "Waves lift the boat. Hold Attack to unfurl the sail against the current.",
  width: 3200,
  height: 540,
  spawn: { x: 80, y: 440 },
  platforms: [
    // Причал на старті
    { x: 0, y: 440, width: 500, height: 100 },
    { x: 300, y: 340, width: 120, height: 22 },
    // Плоти посеред першого моря
    { x: 820, y: 440, width: 130, height: 24 },
    { x: 1080, y: 440, width: 130, height: 24 },
    // Острів між морями
    { x: 1360, y: 440, width: 460, height: 100 },
    { x: 1560, y: 330, width: 140, height: 22 },
    // Фінішний берег
    { x: 2640, y: 440, width: 560, height: 100 },
    { x: 2860, y: 340, width: 140, height: 22 },
  ],
  waters: [
    // Перше море: хвилі й слабка течія за напрямом руху
    {
      x: 500,
      y: 450,
      width: 860,
      height: 90,
      currentSpeed: 55,
      wave: { amp: 18, length: 280, speed: 2.1 },
    },
    // Друге море: зустрічна течія (-230) сильніша за веслування (210) — потрібне вітрило (380)
    {
      x: 1820,
      y: 450,
      width: 820,
      height: 90,
      currentSpeed: -230,
      wave: { amp: 24, length: 300, speed: 2.6 },
    },
  ],
  fishes: [
    { x: 700, offsetMs: 0 },
    { x: 1180, offsetMs: 1300 },
    { x: 2080, offsetMs: 400, dir: -1 },
    { x: 2320, offsetMs: 1700 },
    { x: 2540, offsetMs: 900, dir: -1 },
  ],
  enemies: [{ x: 1560, y: 440, patrolLeft: 1400, patrolRight: 1780 }],
  fires: [{ x: 2860, y: 350, width: 110, height: 90 }],
  winds: [],
  checkpoints: [
    { x: 440, y: 440 },
    { x: 1420, y: 440 },
    { x: 2700, y: 440 },
  ],
  finish: { x: 3120, y: 440, width: 70, height: 130 },
};
