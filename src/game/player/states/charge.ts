import { axisX } from "../../input/input-state.ts";
import { tuning } from "../../tuning.ts";
import type { PlayerContext, StateName } from "../context.ts";
import { chargeFraction, leapVelocity } from "../frog-model.ts";
import type { PlayerState } from "../state-machine.ts";

/** Жабка: присід із зарядом. Відпустили Jump — стрибок угору, сила залежить від заряду. */
export class ChargeState implements PlayerState {
  readonly name = "charge" as const;
  /** Скільки мс триває заряд (читає Player для візуалу) */
  chargeMs = 0;

  enter(): void {
    this.chargeMs = 0;
  }

  update(ctx: PlayerContext): StateName | null {
    const dir = axisX(ctx.input);
    if (dir !== 0) ctx.facing = dir;
    // У присіді гравець стоїть: гальмуємо до нуля
    const step = tuning.player.runDecel * ctx.dt;
    ctx.vx = ctx.vx > 0 ? Math.max(0, ctx.vx - step) : Math.min(0, ctx.vx + step);
    if (!ctx.onGround) return "fall";
    this.chargeMs += ctx.dt * 1000;
    if (ctx.input.jumpHeld) return null;
    // Стрибок: швидкість за зарядом, горизонтальний напрямок із ←/→
    ctx.vy = -leapVelocity(chargeFraction(this.chargeMs));
    ctx.vx = dir * tuning.player.runSpeed;
    ctx.skipJumpCut = true;
    ctx.jumpBufferMs = Number.POSITIVE_INFINITY;
    ctx.coyoteMs = Number.POSITIVE_INFINITY;
    return "jump";
  }
}
