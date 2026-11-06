import type Phaser from "phaser";
import type { FishDef } from "../level/types.ts";
import { TEX } from "../scenes/BootScene.ts";
import { tuning } from "../tuning.ts";
import { Enemy } from "./enemy.ts";
import { fishPose } from "./fish-model.ts";

/** Паперова риба: сидить під водою, раз на період вистрибує по дузі. Небезпечна лише над водою. */
export class Fish extends Enemy {
  private clock = 0;
  private readonly x0: number;
  private readonly baseY: number;
  private readonly offsetMs: number;
  private readonly dirX: -1 | 1;

  constructor(scene: Phaser.Scene, def: FishDef, baseY: number) {
    super(scene, { x: def.x, y: baseY, patrolLeft: def.x - 1, patrolRight: def.x + 1 });
    this.hp = tuning.fish.hp;
    this.x0 = def.x;
    this.baseY = baseY;
    this.offsetMs = def.offsetMs ?? 0;
    this.dirX = def.dir ?? 1;
    this.setTexture(TEX.fish);
    this.setScale(tuning.fish.spriteScale);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);
    body.setSize(tuning.fish.body.width, tuning.fish.body.height, false);
    body.setOffset(tuning.fish.body.offsetX, tuning.fish.body.offsetY);
    this.setDepth(6);
    this.apply(fishPose(this.offsetMs, this.x0, this.baseY, 0, this.dirX));
  }

  override tick(deltaMs: number): void {
    if (this.dead) return;
    this.clock += deltaMs;
    this.apply(fishPose(this.clock, this.x0, this.baseY, this.offsetMs, this.dirX));
  }

  private apply(pose: ReturnType<typeof fishPose>): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    this.setPosition(pose.x, pose.y);
    body.reset(pose.x, pose.y);
    // Під водою риби не видно й вони не зачіпають гравця
    this.setVisible(pose.airborne);
    body.enable = pose.airborne;
    this.setFlipX(pose.facing < 0);
    // Дуга: ніс угору на підйомі й униз на спуску
    const rise = this.baseY - pose.y;
    this.setAngle(pose.airborne ? pose.facing * (rise > tuning.fish.height * 0.5 ? -25 : 25) : 0);
  }

  override hit(fromDir: -1 | 1): boolean {
    // Підводну рибу вдарити неможливо
    if (!this.visible) return false;
    return super.hit(fromDir);
  }
}
