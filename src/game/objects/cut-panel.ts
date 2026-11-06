import type Phaser from "phaser";
import type { Box } from "../combat/geometry.ts";
import type { CutDef } from "../level/types.ts";
import { TEX } from "../scenes/BootScene.ts";

/** Паперова стіна: суцільна, доки її не розріжуть. Звичайну різе меч, «товсту» — лише ривок. */
export class CutPanel {
  readonly box: Box;
  readonly tough: boolean;
  /** Статичне тіло, яке гравець і вороги бачать як стіну (додається до solids) */
  readonly zone: Phaser.GameObjects.Zone;
  cut = false;
  private readonly image: Phaser.GameObjects.Image;
  private readonly scene: Phaser.Scene;

  constructor(scene: Phaser.Scene, def: CutDef, levelId: string, index: number, scale: number) {
    this.scene = scene;
    this.tough = def.tough === true;
    this.box = { x: def.x, y: def.y, width: def.width, height: def.height };
    this.image = scene.add
      .image(def.x, def.y, TEX.cut(levelId, index))
      .setOrigin(0, 0)
      .setScale(1 / scale)
      .setDepth(4);
    this.zone = scene.add.zone(
      def.x + def.width / 2,
      def.y + def.height / 2,
      def.width,
      def.height,
    );
    scene.physics.add.existing(this.zone, true);
  }

  /** Розрізає панель: колізія зникає, папір падає й тане. Повертає true, якщо це перший розріз. */
  slice(): boolean {
    if (this.cut) return false;
    this.cut = true;
    this.scene.physics.world.disableBody(this.zone.body as Phaser.Physics.Arcade.StaticBody);
    this.scene.tweens.add({
      targets: this.image,
      y: this.image.y + 26,
      angle: 14,
      alpha: 0,
      duration: 420,
      ease: "Quad.easeIn",
      onComplete: () => this.image.setVisible(false),
    });
    return true;
  }
}
