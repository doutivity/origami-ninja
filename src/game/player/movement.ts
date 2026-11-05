// Спільна логіка руху для станів: горизонтальний розгін, запит на стрибок, початок стрибка.
import { axisX } from "../input/input-state.ts";
import { tuning } from "../tuning.ts";
import type { PlayerContext } from "./context.ts";

const { player: t } = tuning;

const approach = (value: number, target: number, step: number): number =>
  value < target ? Math.min(value + step, target) : Math.max(value - step, target);

/** Горизонтальний рух: розгін до runSpeed або гальмування. У повітрі — інші прискорення. */
export function moveHorizontally(ctx: PlayerContext): void {
  const dir = axisX(ctx.input);
  if (dir !== 0) ctx.facing = dir;
  const target = dir * t.runSpeed;
  const accel =
    dir === 0 ? (ctx.onGround ? t.runDecel : t.airDecel) : ctx.onGround ? t.runAccel : t.airAccel;
  ctx.vx = approach(ctx.vx, target, accel * ctx.dt);
}

/** Чи можна стрибнути зараз: є запам'ятований натиск і гравець на землі або в coyote-вікні. */
export function jumpRequested(ctx: PlayerContext): boolean {
  return ctx.jumpBufferMs <= t.jumpBufferMs && (ctx.onGround || ctx.coyoteMs <= t.coyoteMs);
}

/** Починає стрибок: задає вертикальну швидкість і "витрачає" натиск та coyote-вікно. */
export function startJump(ctx: PlayerContext): void {
  ctx.vy = -t.jumpVelocity;
  ctx.jumpBufferMs = Number.POSITIVE_INFINITY;
  ctx.coyoteMs = Number.POSITIVE_INFINITY;
}

export const clampFall = (ctx: PlayerContext): void => {
  if (ctx.vy > t.maxFallSpeed) ctx.vy = t.maxFallSpeed;
};
