import type Phaser from "phaser";
import type { Box } from "../combat/geometry.ts";
import { riseTop } from "../hazards/rise.ts";
import type { QualityProfile } from "../quality.ts";
import { TEX } from "../scenes/BootScene.ts";
import { tuning } from "../tuning.ts";

/** Стіна вогню, що піднімається знизу («лінія згину»): повзе вгору зі сталою швидкістю. */
export class RisingFire {
  private readonly startTop: number;
  private readonly speedScale: number;
  private readonly width: number;
  private readonly body: Phaser.GameObjects.Rectangle;
  private readonly flames: Phaser.GameObjects.Image[] = [];
  private readonly emitter: Phaser.GameObjects.Particles.ParticleEmitter;
  private top: number;

  constructor(
    scene: Phaser.Scene,
    width: number,
    startTop: number,
    speedScale: number,
    colors: number[],
    fireColor: number,
  ) {
    this.width = width;
    this.startTop = startTop;
    this.speedScale = speedScale;
    this.top = startTop;
    // Тіло стіни: напівпрозора заливка під краєм (достатньо висока для будь-якого рівня)
    this.body = scene.add
      .rectangle(0, startTop + 12, width, 6000, fireColor, 0.55)
      .setOrigin(0, 0)
      .setDepth(8);
    const count = Math.ceil(width / tuning.fire.flameSpacing);
    const scale = (110 * 1.2) / 130;
    for (let i = 0; i < count; i++) {
      const flame = scene.add
        .image(((i + 0.5) * width) / count, startTop + 16, TEX.flame)
        .setOrigin(0.5, 1)
        .setScale(scale * 0.5)
        .setDepth(8);
      scene.tweens.add({
        targets: flame,
        scaleY: scale * 0.5 * 1.12,
        scaleX: scale * 0.5 * 0.92,
        duration: 480 + ((i * 130) % 360),
        delay: (i * 170) % 500,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });
      this.flames.push(flame);
    }
    this.emitter = scene.add
      .particles(0, startTop, TEX.ember, {
        x: { min: 8, max: width - 8 },
        y: 0,
        lifespan: { min: 700, max: 1200 },
        speedY: { min: -220, max: -110 },
        speedX: { min: -30, max: 30 },
        scale: { start: 1, end: 0 },
        alpha: { start: 1, end: 0 },
        rotate: { min: 0, max: 360 },
        color: colors,
        frequency: 70,
        maxAliveParticles: tuning.particles.maxPerRise,
      })
      .setDepth(9);
  }

  /** Область шкоди: від краю стіни вниз. */
  get box(): Box {
    return { x: 0, y: this.top + 14, width: this.width, height: 6000 };
  }

  get topY(): number {
    return this.top;
  }

  update(elapsedMs: number): void {
    this.top = riseTop(this.startTop, elapsedMs, this.speedScale);
    this.body.setY(this.top + 12);
    for (const f of this.flames) f.setY(this.top + 16);
    this.emitter.setPosition(0, this.top);
  }

  applyQuality(q: QualityProfile): void {
    this.emitter.maxAliveParticles = Math.max(
      1,
      Math.round(tuning.particles.maxPerRise * q.particleScale),
    );
    this.emitter.setFrequency(70 / q.particleScale, 1);
  }
}
