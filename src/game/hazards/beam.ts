import type Phaser from "phaser";
import type { Palette } from "../../gfx/palette.ts";
import type { Box } from "../combat/geometry.ts";
import { hexToNumber } from "../env.ts";
import type { BeamDef } from "../level/types.ts";
import type { QualityProfile } from "../quality.ts";
import { TEX } from "../scenes/BootScene.ts";
import { tuning } from "../tuning.ts";
import { type BeamParams, type BeamState, initialBeam, stepBeam } from "./beam-cycle.ts";

/** Палаюча балка: мерехтлива зона попередження, падіння, іскри при ударі. Один об'єкт на балку (пул). */
export class Beam {
  readonly x: number;
  private state: BeamState;
  private readonly params: BeamParams;
  private readonly sprite: Phaser.GameObjects.Image;
  private readonly warn: Phaser.GameObjects.Rectangle;
  private readonly sparks: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly landY: number;

  constructor(scene: Phaser.Scene, def: BeamDef, p: Palette) {
    this.x = def.x;
    this.landY = def.landY;
    this.params = {
      topY: def.topY,
      landY: def.landY,
      height: tuning.beam.height,
      speed: tuning.beam.speed,
      warnMs: tuning.beam.warnMs,
      intervalMs: def.intervalMs,
    };
    this.state = initialBeam(def.offsetMs);
    this.sprite = scene.add
      .image(def.x, def.topY, TEX.beam)
      .setOrigin(0.5, 1)
      .setScale(0.5)
      .setDepth(9)
      .setVisible(false);
    // Смуга попередження від стелі до місця удару
    this.warn = scene.add
      .rectangle(
        def.x,
        (def.topY + def.landY) / 2,
        tuning.beam.width,
        def.landY - def.topY,
        hexToNumber(p.fire),
        0.18,
      )
      .setDepth(3)
      .setVisible(false);
    const colors = [hexToNumber(p.fire), hexToNumber(p.accent), hexToNumber(p.paper)];
    this.sparks = scene.add
      .particles(0, 0, TEX.ember, {
        lifespan: { min: 300, max: 650 },
        speed: { min: 80, max: 240 },
        angle: { min: 200, max: 340 },
        gravityY: 500,
        scale: { start: 0.9, end: 0 },
        alpha: { start: 1, end: 0 },
        color: colors,
        emitting: false,
        maxAliveParticles: tuning.particles.maxPerBeam,
      })
      .setDepth(9);
  }

  /** Хітбокс, поки балка падає; інакше null. */
  get box(): Box | null {
    if (this.state.phase !== "fall") return null;
    return {
      x: this.x - tuning.beam.width / 2,
      y: this.state.y,
      width: tuning.beam.width,
      height: tuning.beam.height,
    };
  }

  update(dtMs: number, nowMs: number): void {
    const step = stepBeam(this.state, dtMs, this.params);
    this.state = step.state;
    const phase = this.state.phase;
    this.warn.setVisible(phase === "warn");
    if (phase === "warn") this.warn.setAlpha(0.22 + 0.3 * (0.5 + 0.5 * Math.sin(nowMs / 55)));
    this.sprite.setVisible(phase === "fall");
    // Низ спрайта збігається з низом балки
    if (phase === "fall") this.sprite.setY(this.state.y + tuning.beam.height);
    if (step.impact) this.sparks.explode(tuning.particles.maxPerBeam, this.x, this.landY - 4);
  }

  applyQuality(q: QualityProfile): void {
    this.sparks.maxAliveParticles = Math.max(
      1,
      Math.round(tuning.particles.maxPerBeam * q.particleScale),
    );
  }
}
