// Рівні якості high/low: вибір, автоматичне зниження за FPS і профілі налаштувань.
import { tuning } from "./tuning.ts";

export type Quality = "high" | "low";
export type QualityProfile = (typeof tuning.quality.profiles)[Quality];

/** Читає ?quality=low|high. Примусовий вибір вимикає автоматичне зниження. */
export function parseQualityParam(search: string): Quality | null {
  const q = new URLSearchParams(search).get("quality");
  return q === "low" || q === "high" ? q : null;
}

let current: Quality = "high";
let forced = false;

let governor: QualityGovernor | null = null;

/** Єдиний керувальник на всю гру: не скидається при перезапуску сцени (респавн, смерть). */
export function getGovernor(): QualityGovernor {
  governor ??= new QualityGovernor(current, !forced);
  return governor;
}

export function initQuality(search: string): void {
  governor = null;
  const q = parseQualityParam(search);
  if (q) {
    current = q;
    forced = true;
  } else {
    current = "high";
    forced = false;
  }
}

export const getQuality = (): Quality => current;
export const isQualityForced = (): boolean => forced;
export const setQuality = (q: Quality): void => {
  current = q;
};
export const qualityProfile = (q: Quality = current): QualityProfile => tuning.quality.profiles[q];

/**
 * Стежить за середнім FPS. Вікно windowMs; перші warmupMs ігноруються; надто довгі кадри
 * (пауза, перемикання вкладки) не враховуються й скидають вікно.
 */
export class QualityGovernor {
  private warmup: number = tuning.quality.warmupMs;
  private elapsed = 0;
  private frames = 0;
  /** Останній виміряний середній FPS (для debug-режиму) */
  lastFps = 0;

  private quality: Quality;
  private readonly auto: boolean;

  constructor(quality: Quality, auto: boolean) {
    this.quality = quality;
    this.auto = auto;
  }

  /** Повертає "downgrade", коли пора перейти на low. */
  update(dtMs: number): "downgrade" | null {
    if (!this.auto || this.quality === "low") return null;
    if (dtMs > tuning.quality.maxFrameMs) {
      this.elapsed = 0;
      this.frames = 0;
      return null;
    }
    if (this.warmup > 0) {
      this.warmup -= dtMs;
      return null;
    }
    this.elapsed += dtMs;
    this.frames++;
    if (this.elapsed < tuning.quality.windowMs) return null;
    const fps = (this.frames * 1000) / this.elapsed;
    this.lastFps = fps;
    this.elapsed = 0;
    this.frames = 0;
    if (fps < tuning.quality.fpsThreshold) {
      this.quality = "low";
      return "downgrade";
    }
    return null;
  }
}
