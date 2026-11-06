import { axisX } from "../../input/input-state.ts";
import { tuning } from "../../tuning.ts";
import type { PlayerContext, StateName } from "../context.ts";
import type { PlayerState } from "../state-machine.ts";

/** Черепаха: поки утримується Attack, ніндзя повільно рухається під панциром, що тримає один удар. Без стрибка. */
export class ShellState implements PlayerState {
  readonly name = "shell" as const;

  update(ctx: PlayerContext): StateName | null {
    const dir = axisX(ctx.input);
    if (dir !== 0) ctx.facing = dir;
    // Панцир не зазнає сповільнення чорнилом: швидкість стала
    const target = dir * tuning.shell.speed;
    const step = tuning.shell.accel * ctx.dt;
    ctx.vx = ctx.vx < target ? Math.min(ctx.vx + step, target) : Math.max(ctx.vx - step, target);
    if (!ctx.onGround) return "fall";
    // Відпустили Attack або панцир тріснув
    if (!ctx.input.attackHeld || ctx.shellReady === false) return dir === 0 ? "idle" : "run";
    return null;
  }
}
