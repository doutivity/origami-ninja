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
  const slow = ctx.inInk && ctx.onGround ? tuning.ink.runScale : 1;
  const target = dir * t.runSpeed * slow;
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
  ctx.vy = -t.jumpVelocity * (ctx.inInk ? tuning.ink.jumpScale : 1);
  ctx.jumpBufferMs = Number.POSITIVE_INFINITY;
  ctx.coyoteMs = Number.POSITIVE_INFINITY;
}

/**
 * Рішення про стрибок на землі.
 * Без жабки — миттєвий стрибок за натиском. З жабкою — тап стрибає при відпусканні,
 * а утримання Jump довше за chargeStartMs починає заряд.
 */
export function groundJump(ctx: PlayerContext): "jump" | "charge" | null {
  if (!ctx.frogEnabled) {
    if (!jumpRequested(ctx)) return null;
    startJump(ctx);
    return "jump";
  }
  if (ctx.onGround && ctx.input.jumpHeld && (ctx.groundHeldMs ?? 0) >= tuning.frog.chargeStartMs)
    return "charge";
  if (ctx.jumpTap || (!ctx.onGround && jumpRequested(ctx))) {
    startJump(ctx);
    // Тап уже відпущено до початку стрибка, тож обрізання висоти зробило б кожен стрибок коротким
    if (ctx.jumpTap) ctx.skipJumpCut = true;
    return "jump";
  }
  return null;
}

export const clampFall = (ctx: PlayerContext): void => {
  if (ctx.vy > t.maxFallSpeed) ctx.vy = t.maxFallSpeed;
};
