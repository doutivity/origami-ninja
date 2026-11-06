import type Phaser from "phaser";
import { type Box, boxesOverlap } from "../combat/geometry.ts";
import type { VaneDef } from "../level/types.ts";
import { TEX } from "../scenes/BootScene.ts";
import { tuning } from "../tuning.ts";

/** Флюгер-перемикач: один удар мечем відкриває вітрові тунелі з відповідним gate. */
export class Vane {
  readonly id: string;
  /** Зона, у яку має влучити меч (навколо «голови» флюгера) */
  readonly box: Box;
  private readonly image: Phaser.GameObjects.Image;
  private readonly scene: Phaser.Scene;
  opened = false;

  constructor(scene: Phaser.Scene, def: VaneDef) {
    this.scene = scene;
    this.id = def.id;
    const half = tuning.vane.hitSize;
    const headY = def.y - tuning.vane.poleHeight;
    this.box = { x: def.x - half, y: headY - half, width: half * 2, height: half * 2 };
    this.image = scene.add
      .image(def.x, def.y, TEX.vane(false))
      .setOrigin(0.5, 1)
      .setScale(0.5)
      .setDepth(4);
  }

  /** Повертає true, якщо цей удар відкрив флюгер уперше. */
  strike(sword: Box): boolean {
    if (this.opened || !boxesOverlap(sword, this.box)) return false;
    this.opened = true;
    this.image.setTexture(TEX.vane(true));
    // Флюгер крутнувся: короткий похитування навколо основи
    this.scene.tweens.add({
      targets: this.image,
      angle: { from: -14, to: 0 },
      duration: 420,
      ease: "Back.easeOut",
    });
    return true;
  }
}
