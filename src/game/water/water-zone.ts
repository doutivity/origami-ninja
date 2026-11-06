import type Phaser from "phaser";
import type { Palette } from "../../gfx/palette.ts";
import type { Box } from "../combat/geometry.ts";
import { hexToNumber } from "../env.ts";
import type { WaterDef } from "../level/types.ts";
import type { QualityProfile } from "../quality.ts";
import { TEX } from "../scenes/BootScene.ts";

/** Водна зона: річкова протока або озеро з геометричною орігамі-поверхнею та течією. */
export class WaterZone {
  readonly box: Box;
  readonly surfaceY: number;
  readonly currentSpeed: number;
  private readonly waterGfx: Phaser.GameObjects.Graphics;
  private readonly tiles: Phaser.GameObjects.TileSprite;

  constructor(scene: Phaser.Scene, def: WaterDef, p: Palette) {
    this.box = { x: def.x, y: def.y, width: def.width, height: def.height };
    this.surfaceY = def.y;
    this.currentSpeed = def.currentSpeed ?? 0;

    // Глибина води (напівпрозоре тіло)
    this.waterGfx = scene.add.graphics().setDepth(2);
    this.waterGfx.fillStyle(hexToNumber(p.shade), 0.72);
    this.waterGfx.fillRect(def.x, def.y + 6, def.width, def.height - 6);

    // Поверхня води з хвилями (плитка 120×60)
    this.tiles = scene.add
      .tileSprite(def.x, def.y, def.width, 24, TEX.water)
      .setOrigin(0, 0)
      .setDepth(3)
      .setAlpha(0.9);
  }

  update(dtSec: number): void {
    // Хвилі плавно рухаються за течією (або легке погойдування)
    const speed = this.currentSpeed !== 0 ? this.currentSpeed * 0.4 : 18;
    this.tiles.tilePositionX += speed * dtSec;
  }

  applyQuality(_q: QualityProfile): void {
    // Водна поверхня легка для рендеру через статичний tileSprite
  }

  destroy(): void {
    this.waterGfx.destroy();
    this.tiles.destroy();
  }
}
