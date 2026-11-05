import type Phaser from "phaser";
import type { Box } from "../combat/geometry.ts";
import type { CheckpointDef } from "../level/types.ts";
import { TEX } from "../scenes/BootScene.ts";

/** Чекпоінт-прапорець: активується дотиком і стає точкою респавну. */
export class Checkpoint {
  readonly box: Box;
  readonly def: CheckpointDef;
  private readonly image: Phaser.GameObjects.Image;
  active = false;

  constructor(scene: Phaser.Scene, def: CheckpointDef, active: boolean) {
    this.def = def;
    this.box = { x: def.x - 30, y: def.y - 100, width: 60, height: 100 };
    this.image = scene.add
      .image(def.x, def.y, TEX.checkpoint(active))
      .setOrigin(0.5, 1)
      .setScale(0.5)
      .setDepth(5);
    this.active = active;
  }

  activate(): void {
    this.active = true;
    this.image.setTexture(TEX.checkpoint(true));
  }
}
