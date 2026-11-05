import { tuning } from "../tuning.ts";

/** Здоров'я з невразливістю після шкоди. Без залежностей від Phaser. */
export class Health {
  hp: number;
  readonly max: number;
  /** Скільки мс лишилось невразливості */
  invulnerableMs = 0;

  constructor(max: number = tuning.health.max) {
    this.max = max;
    this.hp = max;
  }

  get dead(): boolean {
    return this.hp <= 0;
  }

  get invulnerable(): boolean {
    return this.invulnerableMs > 0;
  }

  /** Повертає true, якщо шкода застосована (не під невразливістю й не мертвий). */
  damage(amount: number, invulnerableMs: number = tuning.health.invulnerableMs): boolean {
    if (this.dead || this.invulnerable) return false;
    this.hp = Math.max(0, this.hp - amount);
    this.invulnerableMs = invulnerableMs;
    return true;
  }

  /** Постійна шкода без запуску невразливості (вогонь, етап 8). */
  drain(amount: number): void {
    if (this.dead) return;
    this.hp = Math.max(0, this.hp - amount);
  }

  update(dtMs: number): void {
    if (this.invulnerableMs > 0) this.invulnerableMs = Math.max(0, this.invulnerableMs - dtMs);
  }

  reset(): void {
    this.hp = this.max;
    this.invulnerableMs = 0;
  }
}

/** Чи видимий спрайт у цей момент миготіння (true = малюємо). */
export function blinkVisible(invulnerableMs: number, hz: number = tuning.health.blinkHz): boolean {
  if (invulnerableMs <= 0) return true;
  return Math.floor((invulnerableMs / 1000) * hz * 2) % 2 === 0;
}
