import { axisX } from "../../input/input-state.ts";
import type { PlayerContext, StateName } from "../context.ts";
import { groundJump, moveHorizontally } from "../movement.ts";
import type { PlayerState } from "../state-machine.ts";

export class IdleState implements PlayerState {
  readonly name = "idle" as const;

  update(ctx: PlayerContext): StateName | null {
    moveHorizontally(ctx);
    const jump = groundJump(ctx);
    if (jump) return jump;
    if (!ctx.onGround) return "fall";
    if (axisX(ctx.input) !== 0) return "run";
    return null;
  }
}
