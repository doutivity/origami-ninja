import type Phaser from "phaser";
import { TEX } from "../scenes/BootScene.ts";

/** Овальні тіні під персонажами: лише на високій якості («м'які тіні»). */
export class Shadows {
  private readonly items: {
    blob: Phaser.GameObjects.Image;
    target: Phaser.GameObjects.Sprite;
    feetOffset: number;
    width: number;
  }[] = [];
  private enabled = true;

  constructor(private readonly scene: Phaser.Scene) {}

  add(target: Phaser.GameObjects.Sprite, feetOffset: number, width: number): void {
    const blob = this.scene.add.image(0, 0, TEX.shadow).setDepth(4).setVisible(this.enabled);
    this.items.push({ blob, target, feetOffset, width });
  }

  setEnabled(on: boolean): void {
    this.enabled = on;
    for (const i of this.items) i.blob.setVisible(on && i.target.active);
  }

  /** Тінь лежить під ногами лише коли персонаж на землі (grounded). */
  update(grounded: (s: Phaser.GameObjects.Sprite) => boolean): void {
    if (!this.enabled) return;
    for (const i of this.items) {
      const alive = i.target.active;
      const show = alive && grounded(i.target);
      i.blob.setVisible(show);
      if (show) {
        i.blob.setPosition(i.target.x, i.target.y + i.feetOffset);
        i.blob.setScale(i.width / 128);
      }
    }
  }
}
