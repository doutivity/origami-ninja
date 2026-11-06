// Риба-стрибун (чиста логіка): періодично вистрибує з води по дузі й ховається назад.
import { tuning } from "../tuning.ts";

export interface FishPose {
  /** Над водою (видима й небезпечна) */
  airborne: boolean;
  x: number;
  y: number;
  /** Напрямок руху по горизонталі: -1 або 1 */
  facing: -1 | 1;
}

/**
 * Поза риби в момент tMs. baseY — середня лінія води, x0 — місце стрибка.
 * Дуга параболічна: максимум висоти посередині стрибка, зсув по x — на ±drift.
 */
export function fishPose(
  tMs: number,
  x0: number,
  baseY: number,
  offsetMs: number,
  dir: -1 | 1 = 1,
): FishPose {
  const f = tuning.fish;
  const u = (((tMs + offsetMs) % f.periodMs) + f.periodMs) % f.periodMs;
  if (u >= f.leapMs) return { airborne: false, x: x0, y: baseY + 20, facing: dir };
  const p = u / f.leapMs;
  return {
    airborne: true,
    x: x0 + dir * f.drift * (p - 0.5),
    y: baseY - 4 * f.height * p * (1 - p),
    facing: dir,
  };
}
