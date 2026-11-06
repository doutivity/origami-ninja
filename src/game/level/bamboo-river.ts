import type { LevelDef } from "./types.ts";

/** Рівень 2: «Бамбукова річка» — бамбукові хащі, водні протоки, переправа на човні та планері. */
export const bambooRiver: LevelDef = {
  id: "bamboo-river",
  name: "Bamboo River",
  bg: "bamboo",
  width: 3200,
  height: 540,
  spawn: { x: 80, y: 440 },
  platforms: [
    // Початковий берег річки
    { x: 0, y: 440, width: 680, height: 100 },
    { x: 420, y: 340, width: 140, height: 22 },
    { x: 620, y: 250, width: 140, height: 22 },

    // Бамбуковий пліт посеред першої протоки
    { x: 900, y: 440, width: 140, height: 24 },

    // Середній острів з бамбуковим гаєм
    { x: 1220, y: 440, width: 730, height: 100 },
    { x: 1440, y: 330, width: 160, height: 22 },

    // Фінішний берег після великої бистрини
    { x: 2450, y: 440, width: 750, height: 100 },
    { x: 2680, y: 330, width: 150, height: 22 },
  ],
  enemies: [
    { x: 1400, y: 440, patrolLeft: 1250, patrolRight: 1580 },
    { x: 2650, y: 440, patrolLeft: 2500, patrolRight: 2850 },
  ],
  fires: [
    { x: 1680, y: 350, width: 120, height: 90 },
    { x: 2900, y: 350, width: 120, height: 90 },
  ],
  // Прірва 1950…2450 (500 px): вимагає або польоту на планері у вітрі, або переправи
  winds: [{ x: 2160, y: 130, width: 110, height: 270 }],
  waters: [
    // Перша спокійна річкова протока (680…1220)
    { x: 680, y: 450, width: 540, height: 90, currentSpeed: 45 },
    // Друга бурхлива бистрина (1950…2450)
    { x: 1950, y: 450, width: 500, height: 90, currentSpeed: 95 },
  ],
  checkpoints: [
    { x: 560, y: 440 },
    { x: 1280, y: 440 },
    { x: 2520, y: 440 },
  ],
  finish: { x: 3120, y: 440, width: 70, height: 130 },
};
