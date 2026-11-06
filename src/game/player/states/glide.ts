import { axisX } from "../../input/input-state.ts";
import type { PlayerContext, StateName } from "../context.ts";
import { glideStep, tiltOf } from "../glide-model.ts";
import type { PlayerState } from "../state-machine.ts";

/** Планер: утримання Jump складає ніндзя в паперовий літачок. Відпустили Jump або приземлились — вихід. */
export class GlideState implements PlayerState {
  readonly name = "glide" as const;

  update(ctx: PlayerContext): StateName | null {
    if (ctx.onGround) return axisX(ctx.input) === 0 ? "idle" : "run";
    if (!ctx.input.jumpHeld) return "fall";
    // Напрям польоту: ←/→ розвертають літачок, інакше летимо в напрямку погляду
    const dir = axisX(ctx.input);
    if (dir !== 0) ctx.facing = dir;
    const next = glideStep(
      ctx.vx,
      ctx.vy,
      ctx.facing,
      tiltOf(ctx.input),
      ctx.inWind,
      ctx.dt,
      ctx.wind,
    );
    ctx.vx = next.vx;
    ctx.vy = next.vy;
    return null;
  }
}
