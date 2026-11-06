import { tuning } from "../tuning.ts";

/** Чи бачить лучник ціль: у межах дальності по горизонталі й допуску по вертикалі. */
export const archerSees = (dx: number, dy: number): boolean =>
  Math.abs(dx) <= tuning.archer.range && Math.abs(dy) <= tuning.archer.reachY;
