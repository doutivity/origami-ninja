import type { LevelDef } from "./types.ts";

// Гірський рівень (поки лише платформи; вогонь, ворог, прірва й фініш додаються пізніше).
export const mountain: LevelDef = {
  id: "mountain",
  name: "Mountain",
  width: 2880,
  height: 540,
  spawn: { x: 90, y: 440 },
  platforms: [
    { x: 0, y: 440, width: 900, height: 100 },
    { x: 560, y: 340, width: 150, height: 24 },
    { x: 820, y: 260, width: 150, height: 24 },
    { x: 1000, y: 440, width: 700, height: 100 },
    { x: 1250, y: 330, width: 140, height: 24 },
    { x: 2040, y: 440, width: 840, height: 100 },
    { x: 2300, y: 340, width: 160, height: 24 },
  ],
  enemies: [
    { x: 1250, y: 440, patrolLeft: 1080, patrolRight: 1400 },
    { x: 2350, y: 440, patrolLeft: 2200, patrolRight: 2520 },
  ],
  // Прірва 1700…2040 без платформ: без планера її не пройти
  winds: [{ x: 1830, y: 120, width: 100, height: 280 }],
  checkpoints: [
    { x: 1040, y: 440 },
    { x: 1650, y: 440 },
    { x: 2090, y: 440 },
  ],
  finish: { x: 2810, y: 440, width: 70, height: 130 },
  fires: [
    { x: 1480, y: 350, width: 130, height: 90 },
    { x: 2580, y: 350, width: 130, height: 90 },
  ],
};
