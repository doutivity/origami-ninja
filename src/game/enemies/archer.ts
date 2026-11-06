import type Phaser from "phaser";
import type { ArcherDef } from "../level/types.ts";
import { TEX } from "../scenes/BootScene.ts";
import { tuning } from "../tuning.ts";
import { archerSees } from "./archer-vision.ts";
import { Enemy } from "./enemy.ts";

/** Фаза лучника: чекає → натягує тятиву (попередження) → стріляє. */
export type ArcherPhase = "idle" | "draw";

/** Паперовий лучник: стоїть на місці, повертається до гравця й стріляє вогняними стрілами. */
export class Archer extends Enemy {
  private phase: ArcherPhase = "idle";
  private timerMs = 700;

  constructor(
    scene: Phaser.Scene,
    def: ArcherDef,
    private readonly shoot: (x: number, y: number, dir: -1 | 1) => void,
    private readonly target: () => { x: number; y: number } | null,
  ) {
    super(scene, { x: def.x, y: def.y, patrolLeft: def.x - 1, patrolRight: def.x + 1 });
    this.hp = tuning.archer.hp;
    this.setTexture(TEX.archer(0));
    // Текстура лучника ширша за онi на 16 px з кожного боку: зсуваємо тіло, щоб збігалось із фігурою
    (this.body as Phaser.Physics.Arcade.Body).setOffset(
      tuning.enemy.body.offsetX + 16,
      tuning.enemy.body.offsetY,
    );
  }

  override tick(deltaMs: number): void {
    if (this.dead) return;
    const body = this.body as Phaser.Physics.Arcade.Body;
    if (this.stunMs > 0) {
      this.stunMs -= deltaMs;
      this.phase = "idle";
      this.setTexture(TEX.archer(0));
      body.setVelocityX(body.velocity.x * 0.9);
      return;
    }
    body.setVelocityX(0);
    const t = this.target();
    const dx = t ? t.x - this.x : 0;
    const dy = t ? t.y - this.y : 0;
    const sees = t !== null && archerSees(dx, dy);
    if (sees) this.setFlipX(dx < 0);
    this.timerMs -= deltaMs;
    if (this.phase === "idle") {
      if (sees && this.timerMs <= 0) {
        this.phase = "draw";
        this.timerMs = tuning.archer.drawMs;
        this.setTexture(TEX.archer(1));
      }
    } else if (this.timerMs <= 0) {
      this.phase = "idle";
      this.timerMs = tuning.archer.cooldownMs;
      this.setTexture(TEX.archer(0));
      this.shoot(this.x, this.y - 2, this.flipX ? -1 : 1);
    }
  }
}
