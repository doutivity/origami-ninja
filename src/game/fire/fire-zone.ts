import type Phaser from "phaser";
import type { Box } from "../combat/geometry.ts";
import type { FireDef } from "../level/types.ts";
import type { QualityProfile } from "../quality.ts";
import { TEX } from "../scenes/BootScene.ts";
import { tuning } from "../tuning.ts";

/** Вогняна зона: полум'я, іскри (емітер із жорстким лімітом) і область шкоди. */
export class FireZone {
  readonly box: Box;
  private readonly emitter: Phaser.GameObjects.Particles.ParticleEmitter;

  constructor(scene: Phaser.Scene, def: FireDef, emberColors: number[]) {
    this.box = { x: def.x, y: def.y, width: def.width, height: def.height };
    const baseY = def.y + def.height;

    // Полум'я: ряд кущів, кожен мляво «дихає» власним ритмом
    const count = Math.max(1, Math.round(def.width / tuning.fire.flameSpacing));
    const scale = (def.height * 1.2) / 130;
    for (let i = 0; i < count; i++) {
      const x = def.x + ((i + 0.5) * def.width) / count;
      const flame = scene.add
        .image(x, baseY + 4, TEX.flame)
        .setOrigin(0.5, 1)
        .setScale(scale * 0.5)
        .setDepth(8);
      scene.tweens.add({
        targets: flame,
        scaleY: scale * 0.5 * 1.1,
        scaleX: scale * 0.5 * 0.94,
        duration: 520 + ((i * 130) % 380),
        delay: (i * 170) % 500,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });
    }

    // Іскри: пул обмежений maxAliveParticles з tuning.ts
    this.emitter = scene.add
      .particles(0, 0, TEX.ember, {
        x: { min: def.x + 8, max: def.x + def.width - 8 },
        y: baseY - 14,
        lifespan: { min: 650, max: 1100 },
        speedY: { min: -190, max: -100 },
        speedX: { min: -28, max: 28 },
        scale: { start: 0.9, end: 0 },
        alpha: { start: 1, end: 0 },
        rotate: { min: 0, max: 360 },
        color: emberColors,
        frequency: tuning.particles.emitEveryMs,
        quantity: 1,
        maxAliveParticles: tuning.particles.maxPerFire,
      })
      .setDepth(9);
  }

  /** Менше частинок на низькій якості (жорсткий ліміт + рідша емісія). */
  applyQuality(q: QualityProfile): void {
    this.emitter.maxAliveParticles = Math.max(
      1,
      Math.round(tuning.particles.maxPerFire * q.particleScale),
    );
    this.emitter.setFrequency(tuning.particles.emitEveryMs / q.particleScale, 1);
  }

  /** Вимикає випуск іскор поза екраном (економія CPU/GPU). */
  setNear(near: boolean): void {
    this.emitter.emitting = near;
  }
}
