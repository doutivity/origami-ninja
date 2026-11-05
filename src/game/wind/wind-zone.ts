import type Phaser from "phaser";
import type { Palette } from "../../gfx/palette.ts";
import type { Box } from "../combat/geometry.ts";
import { hexToNumber } from "../env.ts";
import type { WindDef } from "../level/types.ts";
import type { QualityProfile } from "../quality.ts";
import { TEX } from "../scenes/BootScene.ts";
import { tuning } from "../tuning.ts";

/** Зона висхідного вітру: напівпрозорий стовп і смужки, що летять угору. Шкоди не завдає. */
export class WindZone {
  readonly box: Box;
  private readonly emitter: Phaser.GameObjects.Particles.ParticleEmitter;

  constructor(scene: Phaser.Scene, def: WindDef, p: Palette) {
    this.box = { x: def.x, y: def.y, width: def.width, height: def.height };
    // Стовп намальований один раз (статична графіка)
    const g = scene.add.graphics().setDepth(-5);
    g.fillStyle(hexToNumber(p.paper), 0.45).fillRect(def.x, def.y, def.width, def.height);
    g.lineStyle(2, hexToNumber(p.muted), 0.35);
    g.lineBetween(def.x, def.y, def.x, def.y + def.height);
    g.lineBetween(def.x + def.width, def.y, def.x + def.width, def.y + def.height);

    this.emitter = scene.add
      .particles(0, 0, TEX.gust, {
        x: { min: def.x + 10, max: def.x + def.width - 10 },
        y: { min: def.y + def.height - 60, max: def.y + def.height },
        lifespan: { min: 800, max: 1300 },
        speedY: { min: -260, max: -170 },
        scale: { min: 0.6, max: 1.1 },
        alpha: { start: 0.7, end: 0 },
        color: [hexToNumber(p.muted), hexToNumber(p.shade)],
        frequency: tuning.wind.emitEveryMs,
        quantity: 1,
        maxAliveParticles: tuning.wind.maxPerZone,
      })
      .setDepth(-4);
  }

  applyQuality(q: QualityProfile): void {
    this.emitter.maxAliveParticles = Math.max(
      1,
      Math.round(tuning.wind.maxPerZone * q.particleScale),
    );
    this.emitter.setFrequency(tuning.wind.emitEveryMs / q.particleScale, 1);
  }

  /** Вимикає випуск смужок поза екраном. */
  setNear(near: boolean): void {
    this.emitter.emitting = near;
  }
}
