// Панцир черепахи (чиста логіка, без Phaser): тримає один удар, потім тріскає на cooldown.
import { tuning } from "../tuning.ts";

export class ShellGuard {
  /** Скільки мс лишилось, поки панцир тріснутий */
  crackedMs = 0;

  get ready(): boolean {
    return this.crackedMs <= 0;
  }

  /** Блокує удар, якщо панцир цілий; тоді він тріскає. Повертає true, якщо удар заблоковано. */
  block(): boolean {
    if (!this.ready) return false;
    this.crackedMs = tuning.shell.cooldownMs;
    return true;
  }

  update(dtMs: number): void {
    if (this.crackedMs > 0) this.crackedMs = Math.max(0, this.crackedMs - dtMs);
  }

  reset(): void {
    this.crackedMs = 0;
  }
}

/** Чи пора складатись у панцир: форма доступна, панцир цілий, Attack утримується достатньо довго. */
export function shellWanted(opts: {
  enabled: boolean;
  ready: boolean;
  onGround: boolean;
  attackHeldMs: number;
}): boolean {
  return opts.enabled && opts.ready && opts.onGround && opts.attackHeldMs >= tuning.shell.holdMs;
}
