// Ривок «сюрікен» (чиста логіка, без Phaser): подвійний тап Attack, cooldown, один ривок у повітрі.
import { tuning } from "../tuning.ts";

export class DashController {
  private sincePressMs = Number.POSITIVE_INFINITY;
  /** Скільки мс лишилось до наступного ривка */
  cooldownMs = 0;
  /** У повітрі ривок можна зробити лише раз, до приземлення */
  private airUsed = false;

  update(dtMs: number, onGround: boolean): void {
    this.sincePressMs += dtMs;
    if (this.cooldownMs > 0) this.cooldownMs = Math.max(0, this.cooldownMs - dtMs);
    if (onGround) this.airUsed = false;
  }

  /** Реєструє натиск Attack. Повертає true, якщо це другий натиск у вікні й ривок доступний. */
  press(onGround: boolean): boolean {
    const second = this.sincePressMs <= tuning.dash.doubleTapMs;
    this.sincePressMs = 0;
    if (!second || this.cooldownMs > 0 || (!onGround && this.airUsed)) return false;
    this.cooldownMs = tuning.dash.cooldownMs;
    if (!onGround) this.airUsed = true;
    // Наступний натиск рахується як перший, а не як третій тап
    this.sincePressMs = Number.POSITIVE_INFINITY;
    return true;
  }

  reset(): void {
    this.sincePressMs = Number.POSITIVE_INFINITY;
    this.cooldownMs = 0;
    this.airUsed = false;
  }
}

/** Скільки px долітає ривок по горизонталі. */
export const dashDistance = (): number => (tuning.dash.speed * tuning.dash.durationMs) / 1000;
