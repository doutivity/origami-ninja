import type { LevelDef } from "./types.ts";

/**
 * Рівень 5: «Чорнильна заплава» — чорнило сповільнює біг і стрибок.
 * Форма черепахи (утримання Attack) тримає один удар і не втрачає швидкості в чорнилі.
 */
export const inkMarsh: LevelDef = {
  id: "ink-marsh",
  name: "Ink Marsh",
  bg: "marsh",
  shell: true,
  hint: "Ink slows you down. Hold Attack to fold into a shell: it takes one hit.",
  width: 3200,
  height: 540,
  spawn: { x: 80, y: 440 },
  platforms: [
    // Сухий берег на старті
    { x: 0, y: 440, width: 560, height: 100 },
    { x: 330, y: 340, width: 130, height: 22 },
    // Перша заплава (чорнило 560…1200) і лучник над нею
    { x: 560, y: 440, width: 640, height: 100 },
    { x: 860, y: 330, width: 150, height: 22 },
    // Острів із чекпоінтом і вогнем
    { x: 1200, y: 440, width: 560, height: 100 },
    // Друга, довша заплава (чорнило 1760…2500)
    { x: 1760, y: 440, width: 800, height: 100 },
    { x: 2060, y: 330, width: 150, height: 22 },
    // Фінішний берег
    { x: 2560, y: 440, width: 640, height: 100 },
    { x: 2820, y: 340, width: 150, height: 22 },
  ],
  inks: [
    { x: 600, y: 440, width: 560 },
    { x: 1800, y: 440, width: 680 },
  ],
  enemies: [
    { x: 900, y: 440, patrolLeft: 640, patrolRight: 1140 },
    { x: 2150, y: 440, patrolLeft: 1840, patrolRight: 2440 },
    { x: 2900, y: 440, patrolLeft: 2640, patrolRight: 3050 },
  ],
  archers: [
    { x: 940, y: 330 },
    { x: 2140, y: 330 },
  ],
  fires: [
    { x: 1420, y: 350, width: 120, height: 90 },
    { x: 2580, y: 350, width: 120, height: 90 },
  ],
  winds: [],
  checkpoints: [
    { x: 520, y: 440 },
    { x: 1260, y: 440 },
    { x: 2620, y: 440 },
  ],
  finish: { x: 3120, y: 440, width: 70, height: 130 },
};
