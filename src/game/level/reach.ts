// Досяжність платформ: чиста геометрія стрибка для перевірки вертикальних рівнів.
import { tuning } from "../tuning.ts";
import type { PlatformDef } from "./types.ts";

const g = tuning.player.gravity;
/** Запас на неточність гравця: беремо 92 % висоти й 90 % дальності */
const HEIGHT_MARGIN = 0.92;
const REACH_MARGIN = 0.9;

/** Максимальна висота стрибка з початковою швидкістю v, px (з запасом). */
export const jumpHeight = (v: number): number => ((v * v) / (2 * g)) * HEIGHT_MARGIN;

/** Горизонтальна відстань між краями двох платформ (0, якщо проєкції перекриваються). */
export const horizontalGap = (a: PlatformDef, b: PlatformDef): number =>
  Math.max(0, b.x - (a.x + a.width), a.x - (b.x + b.width));

/** Чи можна з платформи a дістатися платформи b стрибком із початковою швидкістю v. */
export function canReach(a: PlatformDef, b: PlatformDef, v: number): boolean {
  const rise = a.y - b.y; // додатне — b вище
  if (rise > jumpHeight(v)) return false;
  // Час у повітрі до рівня b на шляху вниз (для падіння рівняння те саме)
  const t = (v + Math.sqrt(Math.max(0, v * v - 2 * g * rise))) / g;
  return horizontalGap(a, b) <= tuning.player.runSpeed * t * REACH_MARGIN;
}

/** Усі платформи, до яких можна дійти від стартової стрибками зі швидкістю v. */
export function reachableSet(platforms: readonly PlatformDef[], start: PlatformDef, v: number) {
  const seen = new Set<PlatformDef>([start]);
  const queue = [start];
  while (queue.length > 0) {
    const cur = queue.pop() as PlatformDef;
    for (const next of platforms) {
      if (seen.has(next) || !canReach(cur, next, v)) continue;
      seen.add(next);
      queue.push(next);
    }
  }
  return seen;
}
