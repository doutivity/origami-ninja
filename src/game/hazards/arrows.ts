import type Phaser from "phaser";
import { type Box, boxesOverlap } from "../combat/geometry.ts";
import { TEX } from "../scenes/BootScene.ts";
import { tuning } from "../tuning.ts";

interface Arrow {
  sprite: Phaser.GameObjects.Image;
  active: boolean;
  vx: number;
  lifeMs: number;
}

/** Пул вогняних стрік: фіксований розмір, без створення об'єктів під час гри. */
export class ArrowPool {
  private readonly arrows: Arrow[] = [];

  constructor(scene: Phaser.Scene) {
    for (let i = 0; i < tuning.archer.maxArrows; i++) {
      const sprite = scene.add.image(0, 0, TEX.arrow).setDepth(11).setVisible(false);
      this.arrows.push({ sprite, active: false, vx: 0, lifeMs: 0 });
    }
  }

  /** Випускає стрілу; якщо пул вичерпано, постріл ігнорується. */
  fire(x: number, y: number, dir: -1 | 1): void {
    const a = this.arrows.find((r) => !r.active);
    if (!a) return;
    a.active = true;
    a.vx = dir * tuning.archer.arrowSpeed;
    a.lifeMs = tuning.archer.arrowLifeMs;
    a.sprite
      .setPosition(x + dir * 30, y)
      .setFlipX(dir < 0)
      .setVisible(true);
  }

  private boxOf(a: Arrow): Box {
    const { width, height } = tuning.archer.arrowSize;
    return { x: a.sprite.x - width / 2, y: a.sprite.y - height / 2, width, height };
  }

  /** Рухає стріли; влучання в гравця викликає onHit, платформи гасять стрілу. */
  update(dtMs: number, solids: readonly Box[], player: Box, onHit: (x: number) => void): void {
    for (const a of this.arrows) {
      if (!a.active) continue;
      a.sprite.x += (a.vx * dtMs) / 1000;
      a.lifeMs -= dtMs;
      const box = this.boxOf(a);
      if (a.lifeMs <= 0 || solids.some((s) => boxesOverlap(box, s))) {
        this.kill(a);
      } else if (boxesOverlap(box, player)) {
        onHit(a.sprite.x);
        this.kill(a);
      }
    }
  }

  /** Меч збиває стріли, що потрапили в його хітбокс. */
  deflect(sword: Box): void {
    for (const a of this.arrows) if (a.active && boxesOverlap(this.boxOf(a), sword)) this.kill(a);
  }

  private kill(a: Arrow): void {
    a.active = false;
    a.sprite.setVisible(false);
  }
}
