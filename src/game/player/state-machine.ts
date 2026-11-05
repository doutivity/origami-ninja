import type { PlayerContext, StateName } from "./context.ts";

export interface PlayerState {
  readonly name: StateName;
  enter?(ctx: PlayerContext): void;
  exit?(ctx: PlayerContext): void;
  /** Повертає ім'я наступного стану або null, якщо стан не змінюється. */
  update(ctx: PlayerContext): StateName | null;
}

/** Проста state machine: кожен стан — окремий клас, переходи повертає сам стан. */
export class StateMachine {
  private readonly states = new Map<StateName, PlayerState>();
  private current: PlayerState;

  constructor(states: PlayerState[], initial: StateName) {
    for (const s of states) this.states.set(s.name, s);
    const first = this.states.get(initial);
    if (!first) throw new Error(`Unknown initial state: ${initial}`);
    this.current = first;
  }

  get name(): StateName {
    return this.current.name;
  }

  update(ctx: PlayerContext): void {
    const next = this.current.update(ctx);
    if (next && next !== this.current.name) this.transition(next, ctx);
  }

  transition(name: StateName, ctx: PlayerContext): void {
    const state = this.states.get(name);
    if (!state) throw new Error(`Unknown state: ${name}`);
    this.current.exit?.(ctx);
    this.current = state;
    state.enter?.(ctx);
  }
}
