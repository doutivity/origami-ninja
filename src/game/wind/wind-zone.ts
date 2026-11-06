import type Phaser from "phaser";
import type { Palette } from "../../gfx/palette.ts";
import type { Box } from "../combat/geometry.ts";
import { hexToNumber } from "../env.ts";
import type { WindDef, WindKind } from "../level/types.ts";
import { ringDirection, type WindEffect } from "../player/glide-model.ts";
import type { QualityProfile } from "../quality.ts";
import { TEX } from "../scenes/BootScene.ts";
import { tuning } from "../tuning.ts";

/** Колір і вертикальний напрямок часток за видом вітру. */
const lookOf = (kind: WindKind) =>
  kind === "down"
    ? { speedY: { min: 170, max: 260 }, fromTop: true }
    : { speedY: { min: -260, max: -170 }, fromTop: false };

/**
 * Зона вітру: напівпрозорий стовп і смужки (lift/down) або пульсуюче кільце зі шевронами (ring).
 * Зона із gate неактивна, доки флюгер не відкриє її. Шкоди не завдає.
 */
export class WindZone {
  readonly box: Box;
  readonly kind: WindKind;
  readonly gate?: string;
  /** Діючий вітер зони (для планера) */
  readonly effect: WindEffect;
  private open: boolean;
  private readonly scene: Phaser.Scene;
  private readonly body: Phaser.GameObjects.Graphics;
  private readonly emitter: Phaser.GameObjects.Particles.ParticleEmitter;
  private near = true;

  constructor(scene: Phaser.Scene, def: WindDef, p: Palette) {
    this.scene = scene;
    this.box = { x: def.x, y: def.y, width: def.width, height: def.height };
    this.kind = def.kind ?? "lift";
    this.gate = def.gate;
    this.open = def.gate === undefined;
    const dir = ringDirection(def.dir);
    this.effect = { kind: this.kind, dx: dir.dx, dy: dir.dy };

    // Стовп намальований один раз (статична графіка); alpha керує станом gate
    const tone = this.kind === "down" ? p.ink : p.paper;
    const g = scene.add.graphics().setDepth(-5);
    g.fillStyle(hexToNumber(tone), this.kind === "down" ? 0.22 : 0.45);
    if (this.kind === "ring") {
      const cx = def.x + def.width / 2;
      const cy = def.y + def.height / 2;
      g.lineStyle(5, hexToNumber(p.accent), 0.9).strokeEllipse(cx, cy, def.width, def.height);
      g.lineStyle(2, hexToNumber(p.paper), 0.8).strokeEllipse(
        cx,
        cy,
        def.width - 10,
        def.height - 10,
      );
    } else {
      g.fillRect(def.x, def.y, def.width, def.height);
      g.lineStyle(2, hexToNumber(p.muted), 0.35);
      g.lineBetween(def.x, def.y, def.x, def.y + def.height);
      g.lineBetween(def.x + def.width, def.y, def.x + def.width, def.y + def.height);
    }
    this.body = g;

    const look = lookOf(this.kind);
    const ring = this.kind === "ring";
    this.emitter = scene.add
      .particles(0, 0, ring ? TEX.ring : TEX.gust, {
        x: ring
          ? { min: def.x + def.width * 0.3, max: def.x + def.width * 0.7 }
          : { min: def.x + 10, max: def.x + def.width - 10 },
        y: ring
          ? { min: def.y + def.height * 0.25, max: def.y + def.height * 0.75 }
          : look.fromTop
            ? { min: def.y, max: def.y + 60 }
            : { min: def.y + def.height - 60, max: def.y + def.height },
        lifespan: { min: 800, max: 1300 },
        ...(ring
          ? {
              speedX: { min: 120 * dir.dx - 20, max: 200 * dir.dx + 20 },
              speedY: { min: 120 * dir.dy - 20, max: 200 * dir.dy + 20 },
              rotate: (Math.atan2(dir.dy, dir.dx) * 180) / Math.PI,
            }
          : { speedY: look.speedY }),
        scale: { min: 0.6, max: 1.1 },
        alpha: { start: 0.7, end: 0 },
        color: [hexToNumber(this.kind === "down" ? p.ink : p.muted), hexToNumber(p.shade)],
        frequency: tuning.wind.emitEveryMs,
        quantity: 1,
        maxAliveParticles: tuning.wind.maxPerZone,
      })
      .setDepth(-4);
    this.applyOpen();
  }

  /** Чи діє зона зараз (без gate — завжди). */
  get active(): boolean {
    return this.open;
  }

  /** Відкриває зону (удар по флюгеру) з коротким спалахом. */
  unlock(): void {
    if (this.open) return;
    this.open = true;
    this.applyOpen();
    this.body.setAlpha(0);
    this.scene.tweens.add({ targets: this.body, alpha: 1, duration: 350 });
  }

  private applyOpen(): void {
    // Закрита зона ледь видна: гравець бачить, що тут щось є
    this.body.setAlpha(this.open ? 1 : 0.25);
    this.emitter.emitting = this.open && this.near;
  }

  applyQuality(q: QualityProfile): void {
    this.emitter.maxAliveParticles = Math.max(
      1,
      Math.round(tuning.wind.maxPerZone * q.particleScale),
    );
    this.emitter.setFrequency(tuning.wind.emitEveryMs / q.particleScale, 1);
  }

  /** Вимикає випуск смужок поза екраном і в закритих зонах. */
  setNear(near: boolean): void {
    this.near = near;
    this.emitter.emitting = this.open && near;
  }
}
