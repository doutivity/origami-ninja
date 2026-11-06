import { axisX } from "../../input/input-state.ts";
import { tuning } from "../../tuning.ts";
import type { PlayerContext, StateName } from "../context.ts";
import { moveHorizontally } from "../movement.ts";
import type { PlayerState } from "../state-machine.ts";

export class JumpState implements PlayerState {
  readonly name = "jump" as const;
  private cut = false;

  enter(ctx?: PlayerContext): void {
    // Стрибок жабки вже має потрібну швидкість: не обрізаємо його при відпусканні Jump
    this.cut = ctx?.skipJumpCut === true;
    if (ctx) ctx.skipJumpCut = false;
  }

  update(ctx: PlayerContext): StateName | null {
    moveHorizontally(ctx);
    // Змінна висота: відпустили Jump під час підйому — обрізаємо швидкість один раз
    if (!this.cut && !ctx.input.jumpHeld && ctx.vy < 0) {
      ctx.vy *= tuning.player.jumpCut;
      this.cut = true;
    }
    if (ctx.vy >= 0) {
      if (ctx.onGround) return axisX(ctx.input) === 0 ? "idle" : "run";
      return "fall";
    }
    return null;
  }
}
