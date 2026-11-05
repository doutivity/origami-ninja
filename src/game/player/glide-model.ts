// Спрощена модель планера (чиста, без Phaser): за нахилом задає цільові швидкості.
import type { InputState } from "../input/input-state.ts";
import { tuning } from "../tuning.ts";

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

/** Один крок польоту: повертає нові (vx, vy). Вітер піднімає планер: цільова vy стає від'ємною. */
export function glideStep(
  vx: number,
  vy: number,
  dir: -1 | 1,
  tilt: Tilt,
  inWind: boolean,
  dt: number,
): { vx: number; vy: number } {
  const target = glideTarget(tilt);
  const g = tuning.glide;
  const nextVx = approach(vx, dir * target.speed, g.accel * dt);
  const nextVy = inWind
    ? approach(vy, -g.windLift, g.windAccel * dt)
    : approach(vy, target.fall, g.accel * dt);
  return { vx: nextVx, vy: nextVy };
}
