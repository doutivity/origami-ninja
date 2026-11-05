import { tuning } from "../tuning.ts";

export type AttackPhase = "idle" | "windup" | "active" | "recover";

/** Таймлайн удару мечем. Це шар поверх станів гравця: не залежить від того, біжить він чи стрибає. */
export class AttackTimer {
  phase: AttackPhase = "idle";
  private elapsed = 0;
  /** Лічильник ударів: хітбокс наносить шкоду кожному ворогові раз за удар */
  swing = 0;

  /** Починає удар, якщо попередній закінчився. Повертає true при старті. */
  start(): boolean {
    if (this.phase !== "idle") return false;
    this.phase = "windup";
    this.elapsed = 0;
    this.swing++;
    return true;
  }

  get active(): boolean {
    return this.phase === "active";
  }

  get busy(): boolean {
    return this.phase !== "idle";
  }

  update(dtMs: number): void {
    if (this.phase === "idle") return;
    const { windupMs, activeMs, recoverMs } = tuning.attack;
    this.elapsed += dtMs;
    if (this.phase === "windup" && this.elapsed >= windupMs) {
      this.phase = "active";
    }
    if (this.phase === "active" && this.elapsed >= windupMs + activeMs) {
      this.phase = "recover";
    }
    if (this.phase === "recover" && this.elapsed >= windupMs + activeMs + recoverMs) {
      this.phase = "idle";
    }
  }

  /** Прогрес у межах поточної фази 0…1. */
  get phaseProgress(): number {
    const { windupMs, activeMs, recoverMs } = tuning.attack;
    switch (this.phase) {
      case "windup":
        return Math.min(1, this.elapsed / windupMs);
      case "active":
        return Math.min(1, (this.elapsed - windupMs) / activeMs);
      case "recover":
        return Math.min(1, (this.elapsed - windupMs - activeMs) / recoverMs);
      default:
        return 0;
    }
  }

  /** Прогрес поточного удару 0…1 (для візуального ефекту). */
  get progress(): number {
    const { windupMs, activeMs, recoverMs } = tuning.attack;
    return this.phase === "idle"
      ? 0
      : Math.min(1, this.elapsed / (windupMs + activeMs + recoverMs));
  }
}
