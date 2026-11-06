import Phaser from "phaser";
import type { EnemyDef } from "../level/types.ts";
import { TEX } from "../scenes/BootScene.ts";
import { tuning } from "../tuning.ts";
import { patrolDirection } from "./patrol.ts";

// Відстань від центру спрайта до ніг у пікселях екрана (текстура 96×120, ступні ≈ y=116)
const FEET_BELOW_CENTER = (116 - 60) * tuning.enemy.spriteScale;

/** Паперовий ворог: ходить між двома точками, гине від двох ударів. */
export class Enemy extends Phaser.Physics.Arcade.Sprite {
  hp: number = tuning.enemy.hp;
  dead = false;
  /** Номер удару, який востаннє влучив у ворога (щоб один змах бив один раз) */
  lastHitSwing = -1;
  protected dir: -1 | 1 = 1;
  protected stunMs = 0;
  private walkClock = 0;
  private readonly left: number;
  private readonly right: number;

  constructor(scene: Phaser.Scene, def: EnemyDef) {
    super(scene, def.x, def.y - FEET_BELOW_CENTER, TEX.oni(0));
    scene.add.existing(this);
    scene.physics.add.existing(this);
    const t = tuning.enemy;
    this.setScale(t.spriteScale);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(t.body.width, t.body.height, false);
    body.setOffset(t.body.offsetX, t.body.offsetY);
    this.left = def.patrolLeft;
    this.right = def.patrolRight;
  }

  tick(deltaMs: number): void {
    if (this.dead) return;
    const body = this.body as Phaser.Physics.Arcade.Body;
    if (this.stunMs > 0) {
      this.stunMs -= deltaMs;
      body.setVelocityX(body.velocity.x * 0.9);
      return;
    }
    this.dir = patrolDirection(this.x, this.left, this.right, this.dir);
    body.setVelocityX(this.dir * tuning.enemy.patrolSpeed);
    this.setFlipX(this.dir < 0);
    this.walkClock += (deltaMs / 1000) * 5;
    const key = TEX.oni(Math.floor(this.walkClock) % 2);
    if (this.texture.key !== key) this.setTexture(key);
  }

  /** Удар мечем. Повертає true, якщо ворог загинув. */
  hit(fromDir: -1 | 1): boolean {
    if (this.dead) return false;
    this.hp -= 1;
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(fromDir * tuning.attack.enemyKnockback.x, -tuning.attack.enemyKnockback.y);
    this.stunMs = tuning.enemy.stunMs;
    if (this.hp <= 0) {
      this.die();
      return true;
    }
    // Короткий спалах: ворог на мить зникає й повертається
    this.scene.tweens.add({ targets: this, alpha: 0.35, duration: 60, yoyo: true, repeat: 1 });
    return false;
  }

  protected die(): void {
    this.dead = true;
    (this.body as Phaser.Physics.Arcade.Body).enable = false;
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      scale: this.scale * 1.5,
      angle: this.dir * 40,
      duration: tuning.enemy.deathMs,
      onComplete: () => this.destroy(),
    });
  }
}
