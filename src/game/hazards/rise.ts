import { tuning } from "../tuning.ts";

/** Верх стіни вогню (координата y світу) через elapsedMs від старту: до затримки стоїть, далі повзе вгору. */
export function riseTop(startTop: number, elapsedMs: number, speedScale = 1): number {
  const moving = Math.max(0, elapsedMs - tuning.rise.delayMs);
  return startTop - (tuning.rise.speed * speedScale * moving) / 1000;
}
