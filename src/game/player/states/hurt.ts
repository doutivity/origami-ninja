import { axisX } from "../../input/input-state.ts";
import { tuning } from "../../tuning.ts";
import type { PlayerContext, StateName } from "../context.ts";
import type { PlayerState } from "../state-machine.ts";

/** Приголомшення після удару: керування вимкнене, відкидання гасне. */
export class HurtState implements PlayerState {
  readonly name = "hurt" as const;
  private elapsedMs = 0;

  enter(): void {
    this.elapsedMs = 0;
  }

  update(ctx: PlayerContext): StateName | null {
    this.elapsedMs += ctx.dt * 1000;
    // Горизонтальна швидкість поступово гасне
    const step = tuning.player.airDecel * ctx.dt;
    ctx.vx = ctx.vx > 0 ? Math.max(0, ctx.vx - step) : Math.min(0, ctx.vx + step);
    if (this.elapsedMs < tuning.health.stunMs) return null;
    if (!ctx.onGround) return "fall";
    return axisX(ctx.input) === 0 ? "idle" : "run";
  }
}
