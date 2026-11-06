// Цикл падіння палаючої балки: очікування → попередження → падіння → удар. Без Phaser, тестується окремо.
export type BeamPhase = "wait" | "warn" | "fall";

export interface BeamState {
  phase: BeamPhase;
  /** Залишок часу поточної фази (wait/warn), мс */
  timerMs: number;
  /** Верх балки, px (лише у фазі fall) */
  y: number;
}

export interface BeamParams {
  topY: number;
  landY: number;
  height: number;
  speed: number;
  warnMs: number;
  intervalMs: number;
}

export const initialBeam = (offsetMs: number): BeamState => ({
  phase: "wait",
  timerMs: offsetMs,
  y: 0,
});

/** Один крок циклу. impact = true в кадрі, коли балка вдарилась об платформу. */
export function stepBeam(
  s: BeamState,
  dtMs: number,
  prm: BeamParams,
): { state: BeamState; impact: boolean } {
  if (s.phase === "wait") {
    const timerMs = s.timerMs - dtMs;
    return {
      state: timerMs <= 0 ? { phase: "warn", timerMs: prm.warnMs, y: 0 } : { ...s, timerMs },
      impact: false,
    };
  }
  if (s.phase === "warn") {
    const timerMs = s.timerMs - dtMs;
    return {
      state: timerMs <= 0 ? { phase: "fall", timerMs: 0, y: prm.topY } : { ...s, timerMs },
      impact: false,
    };
  }
  const y = s.y + (prm.speed * dtMs) / 1000;
  if (y + prm.height >= prm.landY) {
    return { state: { phase: "wait", timerMs: prm.intervalMs, y: 0 }, impact: true };
  }
  return { state: { ...s, y }, impact: false };
}
