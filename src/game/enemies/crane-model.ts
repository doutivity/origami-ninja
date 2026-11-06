// Поведінка паперового журавлика (чиста, без Phaser): гойдається → попереджає → пікірує → повертається.
import { tuning } from "../tuning.ts";

export type CranePhase = "hover" | "warn" | "dive" | "recover";

export interface CraneState {
  phase: CranePhase;
  /** Скільки мс лишилось у поточній фазі (для hover — до наступного пікірування) */
  timerMs: number;
  /** Годинник гойдання, секунди */
  clock: number;
  anchorX: number;
  anchorY: number;
  range: number;
  /** Напрямок пікірування (одиничний вектор), фіксується в кінці попередження */
  diveDx: number;
  diveDy: number;
}

export interface Vec {
  x: number;
  y: number;
}

export const newCrane = (anchorX: number, anchorY: number, range: number): CraneState => ({
  phase: "hover",
  timerMs: 900,
  clock: 0,
  anchorX,
  anchorY,
  range,
  diveDx: 0,
  diveDy: 1,
});

/** Де журавлик має бути під час гойдання. */
export function hoverPoint(c: CraneState): Vec {
  const t = tuning.crane;
  return {
    x: c.anchorX + Math.sin(c.clock * t.swayRate) * c.range,
    y: c.anchorY + Math.sin(c.clock * t.swayRate * 2) * t.swayAmp,
  };
}

/** Чи бачить журавлик ціль: вона поруч по горизонталі й нижче за нього (або майже на рівні). */
export function craneSees(pos: Vec, target: Vec): boolean {
  const t = tuning.crane;
  const dy = target.y - pos.y;
  return Math.abs(target.x - pos.x) <= t.sightX && dy >= -t.sightAbove && dy <= t.sightBelow;
}

const toward = (from: Vec, to: Vec, speed: number): Vec => {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy);
  if (len < 1e-6) return { x: 0, y: 0 };
  const s = Math.min(speed, len * 8);
  return { x: (dx / len) * s, y: (dy / len) * s };
};

/** Один крок: змінює стан і повертає швидкість (px/с), яку застосовує спрайт. */
export function craneStep(c: CraneState, pos: Vec, target: Vec | null, dtMs: number): Vec {
  const t = tuning.crane;
  c.clock += dtMs / 1000;
  switch (c.phase) {
    case "hover": {
      c.timerMs -= dtMs;
      if (c.timerMs <= 0 && target && craneSees(pos, target)) {
        c.phase = "warn";
        c.timerMs = t.warnMs;
        return { x: 0, y: 0 };
      }
      return toward(pos, hoverPoint(c), t.returnSpeed * 1.5);
    }
    case "warn": {
      c.timerMs -= dtMs;
      if (c.timerMs <= 0) {
        const dx = (target?.x ?? pos.x) - pos.x;
        const dy = (target?.y ?? pos.y + 1) - pos.y;
        const len = Math.hypot(dx, dy) || 1;
        c.diveDx = dx / len;
        c.diveDy = dy / len;
        c.phase = "dive";
        c.timerMs = t.diveMs;
      }
      return { x: 0, y: 0 };
    }
    case "dive": {
      c.timerMs -= dtMs;
      if (c.timerMs <= 0) c.phase = "recover";
      return { x: c.diveDx * t.diveSpeed, y: c.diveDy * t.diveSpeed };
    }
    default: {
      const home = hoverPoint(c);
      if (Math.hypot(home.x - pos.x, home.y - pos.y) < 10) {
        c.phase = "hover";
        c.timerMs = t.cooldownMs;
      }
      return toward(pos, home, t.returnSpeed);
    }
  }
}
