import type Phaser from "phaser";
import type { CraneDef } from "../level/types.ts";
import { TEX } from "../scenes/BootScene.ts";
import { tuning } from "../tuning.ts";
import { type CraneState, craneStep, newCrane } from "./crane-model.ts";
import { Enemy } from "./enemy.ts";

/** Паперовий журавлик: висить у повітрі без гравітації, гойдається й пікірує на гравця. */
export class Crane extends Enemy {
  private readonly brain: CraneState;
  private flapClock = 0;

  constructor(
    scene: Phaser.Scene,
    def: CraneDef,
    private readonly target: () => { x: number; y: number } | null,
  ) {
    super(scene, { x: def.x, y: def.y, patrolLeft: def.x - 1, patrolRight: def.x + 1 });
    const t = tuning.crane;
    this.hp = t.hp;
    this.setTexture(TEX.crane(0));
    this.setScale(t.spriteScale);
    this.setPosition(def.x, def.y);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);
    body.setSize(t.body.width, t.body.height, false);
    body.setOffset(t.body.offsetX, t.body.offsetY);
    this.brain = newCrane(def.x, def.y, def.range);
  }

  override tick(deltaMs: number): void {
    if (this.dead) return;
    const body = this.body as Phaser.Physics.Arcade.Body;
    if (this.stunMs > 0) {
      this.stunMs -= deltaMs;
      body.setVelocity(body.velocity.x * 0.9, body.velocity.y * 0.9);
      return;
    }
    const v = craneStep(this.brain, { x: this.x, y: this.y }, this.target(), deltaMs);
    body.setVelocity(v.x, v.y);
    if (Math.abs(v.x) > 8) this.setFlipX(v.x < 0);
    // Змах крил: швидший під час попередження й пікірування
    const fast = this.brain.phase === "warn" || this.brain.phase === "dive";
    this.flapClock += (deltaMs / 1000) * (fast ? 12 : 4);
    const key = TEX.crane(Math.floor(this.flapClock) % 2);
    if (this.texture.key !== key) this.setTexture(key);
  }
}
