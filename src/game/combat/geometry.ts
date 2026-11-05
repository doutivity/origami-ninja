import { tuning } from "../tuning.ts";

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Хітбокс меча перед гравцем. body — фізичне тіло гравця (лівий верхній кут і розмір). */
export function swordHitbox(body: Box, facing: -1 | 1): Box {
  const { width, height } = tuning.attack.hitbox;
  // Хітбокс починається від краю тіла й виступає вперед
  const x = facing === 1 ? body.x + body.width - 8 : body.x + 8 - width;
  const y = body.y + body.height / 2 - height / 2 - 4;
  return { x, y, width, height };
}

export const boxesOverlap = (a: Box, b: Box): boolean =>
  a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
