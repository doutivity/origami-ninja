import { axisX } from "../../input/input-state.ts";
import { tuning } from "../../tuning.ts";
import type { PlayerContext, StateName } from "../context.ts";
import { clampFall, jumpRequested, moveHorizontally, startJump } from "../movement.ts";
import type { PlayerState } from "../state-machine.ts";

export class FallState implements PlayerState {
  readonly name = "fall" as const;
  private heldMs = 0;

  enter(): void {
    this.heldMs = 0;
  }

  update(ctx: PlayerContext): StateName | null {
    moveHorizontally(ctx);
    clampFall(ctx);
    // Coyote time: після сходу з краю ще можна стрибнути; input buffer: натиск перед приземленням
    if (jumpRequested(ctx)) {
      startJump(ctx);
      return "jump";
    }
    if (ctx.onGround) return axisX(ctx.input) === 0 ? "idle" : "run";
    // Утримання Jump під час падіння складає ніндзя в літачок
    if (ctx.input.jumpHeld && ctx.vy >= tuning.glide.minFallSpeed) {
      this.heldMs += ctx.dt * 1000;
      if (this.heldMs >= tuning.glide.holdMs) return "glide";
    } else {
      this.heldMs = 0;
    }
    return null;
  }
}
