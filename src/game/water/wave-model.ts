// Хвилі (чиста логіка, без Phaser): висота поверхні води в точці x у момент t.
import type { WaterDef } from "../level/types.ts";

/** Y поверхні води; без хвилі — рівна лінія def.y. */
export function surfaceY(def: WaterDef, x: number, tMs: number): number {
  const w = def.wave;
  if (!w) return def.y;
  return def.y + w.amp * Math.sin((x / w.length) * Math.PI * 2 + (tMs / 1000) * w.speed);
}

/** Кут нахилу поверхні в точці x, радіани (додатний — вниз праворуч, як вісь Y екрана). */
export function surfaceAngle(def: WaterDef, x: number, tMs: number): number {
  const w = def.wave;
  if (!w) return 0;
  const k = (Math.PI * 2) / w.length;
  const slope = w.amp * k * Math.cos(x * k + (tMs / 1000) * w.speed);
  return Math.atan(slope);
}

/** Скільки px над середньою лінією води може підніматись гребінь. */
export const crestRise = (def: WaterDef): number => def.wave?.amp ?? 0;
