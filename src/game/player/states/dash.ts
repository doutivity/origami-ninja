import { axisX } from "../../input/input-state.ts";
import { tuning } from "../../tuning.ts";
import type { PlayerContext, StateName } from "../context.ts";
import type { PlayerState } from "../state-machine.ts";

/** Ривок-сюрікен: короткий горизонтальний рух без гравітації. Різе паперові панелі й не зазнає ударів. */
export class DashState implements PlayerState {
  readonly name = "dash" as const;
  private elapsedMs = 0;

  enter(ctx: PlayerContext): void {
    this.elapsedMs = 0;
    const dir = axisX(ctx.input);
    if (dir !== 0) ctx.facing = dir;
    ctx.vx = ctx.facing * tuning.dash.speed;
    ctx.vy = 0;
  }

  update(ctx: PlayerContext): StateName | null {
    this.elapsedMs += ctx.dt * 1000;
    ctx.vx = ctx.facing * tuning.dash.speed;
    ctx.vy = 0;
    if (this.elapsedMs < tuning.dash.durationMs) return null;
    // Ривок скінчився: далі біг по землі або падіння, швидкість знижується до бігу
    ctx.vx = ctx.facing * tuning.player.runSpeed;
    if (!ctx.onGround) return "fall";
    return axisX(ctx.input) === 0 ? "idle" : "run";
  }
}
