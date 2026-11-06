import { bambooRiver } from "./bamboo-river.ts";
import { burningPagoda } from "./burning-pagoda.ts";
import { inkMarsh } from "./ink-marsh.ts";
import { kirigamiWorkshop } from "./kirigami-workshop.ts";
import { midnightCanyon } from "./midnight-canyon.ts";
import { mountain } from "./mountain.ts";
import { paperSea } from "./paper-sea.ts";
import type { LevelDef } from "./types.ts";

/** Усі доступні рівні гри за порядком проходження. */
export const LEVELS: readonly LevelDef[] = [
  mountain,
  bambooRiver,
  burningPagoda,
  midnightCanyon,
  inkMarsh,
  kirigamiWorkshop,
  paperSea,
];

export function getLevel(idOrIndex: string | number): LevelDef {
  if (typeof idOrIndex === "number") {
    return LEVELS[idOrIndex] ?? mountain;
  }
  return LEVELS.find((l) => l.id === idOrIndex) ?? mountain;
}

export function nextLevel(currentId: string): LevelDef | null {
  const idx = LEVELS.findIndex((l) => l.id === currentId);
  if (idx >= 0 && idx < LEVELS.length - 1) {
    return LEVELS[idx + 1] ?? null;
  }
  return null;
}
