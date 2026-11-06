import type { LevelDef } from "./types.ts";

/**
 * Рівень 8: «Тихий згин» — спокійний підсумковий рівень. Кожна форма отримує один м'який відрізок:
 * жабка (високий уступ), планер (прірва з вітром), човник (тиха річка), черепаха (калюжа чорнила),
 * ривок (товста стіна). Фон і висота землі на фініші збігаються зі стартом першого рівня,
 * тому вихід із цього рівня безшовно перетікає в гори першого.
 */
export const quietFold: LevelDef = {
  id: "quiet-fold",
  name: "Quiet Fold",
  // Той самий фон і та сама земля, що на старті першого рівня
  bg: "mountains",
  frog: true,
  shell: true,
  dash: true,
  sail: true,
  hint: "A quiet stretch for every form you have learned.",
  width: 3400,
  height: 540,
  spawn: { x: 90, y: 440 },
  platforms: [
    // Старт і високий уступ, який бере лише жабка
    { x: 0, y: 440, width: 700, height: 100 },
    { x: 700, y: 290, width: 300, height: 250 },
    // Острів після прірви для планера
    { x: 1760, y: 440, width: 560, height: 100 },
    // Пліт посеред тихої річки
    { x: 2560, y: 440, width: 130, height: 24 },
    // Фінальний берег: калюжа, товста стіна, фініш
    { x: 2900, y: 440, width: 500, height: 100 },
  ],
  enemies: [{ x: 2000, y: 440, patrolLeft: 1840, patrolRight: 2240 }],
  fires: [],
  winds: [{ x: 1300, y: 60, width: 100, height: 460 }],
  waters: [{ x: 2320, y: 450, width: 580, height: 90, currentSpeed: 40 }],
  inks: [{ x: 2960, y: 440, width: 200 }],
  cuts: [{ x: 3230, y: 300, width: 30, height: 140, tough: true }],
  checkpoints: [
    { x: 760, y: 290 },
    { x: 1810, y: 440 },
    { x: 2940, y: 440 },
  ],
  finish: { x: 3340, y: 440, width: 70, height: 130 },
};
