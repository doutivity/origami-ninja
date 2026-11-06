import { tuning } from "../tuning.ts";

/** Частка заряду 0…1 за час утримання від початку присіду. */
export const chargeFraction = (chargeMs: number): number =>
  Math.min(1, Math.max(0, chargeMs / tuning.frog.chargeMs));

/** Початкова швидкість стрибка жабки (px/с, додатна — вгору) для частки заряду. */
export const leapVelocity = (fraction: number): number =>
  tuning.frog.minLeap + (tuning.frog.maxLeap - tuning.frog.minLeap) * fraction;
