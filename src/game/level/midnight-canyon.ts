import type { LevelDef } from "./types.ts";

/**
 * Рівень 4: «Нічний каньйон» — майстерність польоту.
 * Прірва 1: термальні кільця й журавлики. Прірва 2: вітровий тунель відкриває флюгер.
 * У другій прірві перед тунелем є холодний спадний потік, який забирає висоту.
 */
export const midnightCanyon: LevelDef = {
  id: "midnight-canyon",
  name: "Midnight Canyon",
  bg: "canyon",
  hint: "Hold Jump to glide. Ride the rings, strike the weathervane to call the wind.",
  width: 3200,
  height: 540,
  spawn: { x: 80, y: 440 },
  platforms: [
    { x: 0, y: 440, width: 700, height: 100 },
    { x: 380, y: 340, width: 130, height: 22 },
    { x: 1200, y: 440, width: 760, height: 100 },
    { x: 1560, y: 340, width: 140, height: 22 },
    { x: 1760, y: 340, width: 140, height: 22 },
    { x: 2460, y: 440, width: 740, height: 100 },
    { x: 2760, y: 340, width: 150, height: 22 },
  ],
  enemies: [{ x: 1420, y: 440, patrolLeft: 1300, patrolRight: 1540 }],
  fires: [{ x: 2650, y: 350, width: 110, height: 90 }],
  cranes: [
    { x: 1020, y: 250, range: 110 },
    { x: 2300, y: 210, range: 120 },
  ],
  vanes: [{ id: "gust", x: 1830, y: 340 }],
  winds: [
    { kind: "ring", x: 840, y: 330, width: 90, height: 130 },
    { kind: "ring", x: 1130, y: 330, width: 90, height: 130 },
    { kind: "down", x: 2030, y: 300, width: 80, height: 240 },
    { kind: "lift", x: 2230, y: 100, width: 170, height: 440, gate: "gust" },
  ],
  checkpoints: [
    { x: 620, y: 440 },
    { x: 1320, y: 440 },
    { x: 2510, y: 440 },
  ],
  finish: { x: 3120, y: 440, width: 70, height: 130 },
};
