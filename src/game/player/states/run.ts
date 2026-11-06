import { axisX } from "../../input/input-state.ts";
import type { PlayerContext, StateName } from "../context.ts";
import { groundJump, moveHorizontally } from "../movement.ts";
import type { PlayerState } from "../state-machine.ts";

export class RunState implements PlayerState {
  readonly name = "run" as const;

  update(ctx: PlayerContext): StateName | null {
    if (ctx.shellRequested && ctx.onGround) return "shell";
    moveHorizontally(ctx);
    const jump = groundJump(ctx);
    if (jump) return jump;
    if (!ctx.onGround) return "fall";
    // Відпустили напрямок: Idle доганяє швидкість до нуля
    if (axisX(ctx.input) === 0) return "idle";
    return null;
  }
}
