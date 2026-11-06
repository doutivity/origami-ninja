// Спрощена модель планера (чиста, без Phaser): за нахилом задає цільові швидкості.
import type { InputState } from "../input/input-state.ts";
import type { WindKind } from "../level/types.ts";
import { tuning } from "../tuning.ts";

/** Вітер, що діє на планер у цьому кадрі. dx/dy — одиничний напрямок (для кільця). */
export interface WindEffect {
  kind: WindKind;
  dx: number;
  dy: number;
}

/** Нормалізує напрямок кільця; нульовий вектор дає «праворуч». */
export function ringDirection(dir?: { x: number; y: number }): { dx: number; dy: number } {
  const len = Math.hypot(dir?.x ?? 1, dir?.y ?? 0);
  if (!dir || len === 0) return { dx: 1, dy: 0 };
  return { dx: dir.x / len, dy: dir.y / len };
}

export type Tilt = "up" | "neutral" | "down";

/** ↑ — ніс угору (повільніше, але довше), ↓ — ніс униз (швидше й нижче). Обидві — нейтрально. */
export function tiltOf(input: Pick<InputState, "up" | "down">): Tilt {
  if (input.up === input.down) return "neutral";
  return input.up ? "up" : "down";
}

export interface GlideTarget {
  /** Горизонтальна швидкість за модулем */
  speed: number;
  /** Швидкість падіння (додатна — вниз) */
  fall: number;
}

export const glideTarget = (tilt: Tilt): GlideTarget => ({
  speed: tuning.glide.speed[tilt],
  fall: tuning.glide.fall[tilt],
});

const approach = (v: number, target: number, step: number): number =>
  v < target ? Math.min(v + step, target) : Math.max(v - step, target);

/** Горизонтальна швидкість наближається до цілі; надлишок понад максимум планера гаситься повільно. */
function approachX(vx: number, target: number, dt: number): number {
  const over = Math.abs(vx) > tuning.glide.speed.down + 1 && Math.sign(vx) === Math.sign(target);
  const step = (over ? tuning.glide.overspeedDecay : tuning.glide.accel) * dt;
  return approach(vx, target, step);
}

/**
 * Один крок польоту: повертає нові (vx, vy).
 * Без wind вітер вважається висхідним: цільова vy стає від'ємною (сумісність із першим рівнем).
 * Спадний потік тисне донизу; кільце розганяє вздовж свого напрямку.
 */
export function glideStep(
  vx: number,
  vy: number,
  dir: -1 | 1,
  tilt: Tilt,
  inWind: boolean,
  dt: number,
  wind?: WindEffect | null,
): { vx: number; vy: number } {
  const target = glideTarget(tilt);
  const g = tuning.glide;
  const kind = inWind ? (wind?.kind ?? "lift") : null;
  if (kind === "ring" && wind) {
    // Кільце задає напрямок: dx — уздовж польоту, dy — вгору/вниз (вісь Y екрана росте донизу)
    const nextVx = approach(vx, wind.dx * g.ringSpeed, g.ringAccel * dt);
    const nextVy =
      wind.dy === 0
        ? approach(vy, target.fall, g.accel * dt)
        : approach(vy, wind.dy * g.ringSpeed, g.ringAccel * dt);
    return { vx: nextVx, vy: nextVy };
  }
  const nextVx = approachX(vx, dir * target.speed, dt);
  let nextVy: number;
  if (kind === "lift") nextVy = approach(vy, -g.windLift, g.windAccel * dt);
  else if (kind === "down") nextVy = approach(vy, g.windDown, g.windAccel * dt);
  else nextVy = approach(vy, target.fall, g.accel * dt);
  return { vx: nextVx, vy: nextVy };
}
