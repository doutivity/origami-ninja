import type { PlayerContext, StateName } from "../context.ts";
import type { PlayerState } from "../state-machine.ts";

/** Смерть: керування вимкнене, гравець зупиняється. Оверлей показує GameScene. */
export class DeadState implements PlayerState {
  readonly name = "dead" as const;

  update(ctx: PlayerContext): StateName | null {
    ctx.vx = 0;
    return null;
  }
}
