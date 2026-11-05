import { axisX } from "../../input/input-state.ts";
import type { PlayerContext, StateName } from "../context.ts";
import { jumpRequested, moveHorizontally, startJump } from "../movement.ts";
import type { PlayerState } from "../state-machine.ts";

export class RunState implements PlayerState {
  readonly name = "run" as const;

  update(ctx: PlayerContext): StateName | null {
    moveHorizontally(ctx);
    if (jumpRequested(ctx)) {
      startJump(ctx);
      return "jump";
    }
    if (!ctx.onGround) return "fall";
    // Відпустили напрямок: Idle доганяє швидкість до нуля
    if (axisX(ctx.input) === 0) return "idle";
    return null;
  }
}
