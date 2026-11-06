import type { LevelDef } from "./types.ts";

/**
 * Рівень 6: «Кірігамі-майстерня» — світ, який можна різати.
 * Паперові стіни розрізає меч, «товсті» стіни й широкі прірви беруться ривком (подвійний тап Attack).
 */
export const kirigamiWorkshop: LevelDef = {
  id: "kirigami-workshop",
  name: "Kirigami Workshop",
  bg: "workshop",
  dash: true,
  // Закрита майстерня: планерувати нема де
  noGlide: true,
  hint: "Sword cuts paper walls. Double-tap Attack to dash: it cuts thick walls and flies through arrows.",
  width: 3000,
  height: 540,
  spawn: { x: 80, y: 440 },
  platforms: [
    { x: 0, y: 440, width: 700, height: 100 },
    { x: 380, y: 340, width: 130, height: 22 },
    { x: 1000, y: 440, width: 840, height: 100 },
    { x: 1260, y: 330, width: 150, height: 22 },
    { x: 2140, y: 440, width: 860, height: 100 },
    { x: 2720, y: 340, width: 150, height: 22 },
  ],
  cuts: [
    { x: 570, y: 320, width: 26, height: 120 },
    { x: 1620, y: 300, width: 30, height: 140, tough: true },
    { x: 2420, y: 320, width: 26, height: 120 },
    { x: 2650, y: 300, width: 30, height: 140, tough: true },
  ],
  enemies: [
    { x: 1740, y: 440, patrolLeft: 1670, patrolRight: 1810 },
    { x: 2340, y: 440, patrolLeft: 2270, patrolRight: 2400 },
  ],
  archers: [{ x: 1340, y: 330 }],
  fires: [{ x: 2490, y: 350, width: 110, height: 90 }],
  winds: [],
  checkpoints: [
    { x: 500, y: 440 },
    { x: 1040, y: 440 },
    { x: 2190, y: 440 },
  ],
  finish: { x: 2930, y: 440, width: 70, height: 130 },
};
