import type Phaser from "phaser";
import type { Palette } from "../../gfx/palette.ts";
import type { Box } from "../combat/geometry.ts";
import { hexToNumber } from "../env.ts";
import type { WaterDef } from "../level/types.ts";
import type { QualityProfile } from "../quality.ts";
import { TEX } from "../scenes/BootScene.ts";
import { crestRise, surfaceAngle, surfaceY } from "./wave-model.ts";

/** Ширина одного сегмента хвилястої поверхні, px: вузькі сегменти дають плавну лінію без сходинок */
const SEGMENT = 40;

/** Водна зона: річка, озеро або штормове море. Поверхня пласка або хвиляста, з течією. */
export class WaterZone {
  readonly box: Box;
  /** Середня лінія води (для хвилі — рівень спокою) */
  readonly surfaceBase: number;
  readonly currentSpeed: number;
  private readonly def: WaterDef;
  private readonly waterGfx: Phaser.GameObjects.Graphics;
  private readonly tiles?: Phaser.GameObjects.TileSprite;
  private readonly segments: Phaser.GameObjects.Image[] = [];
  private timeMs = 0;

  constructor(scene: Phaser.Scene, def: WaterDef, p: Palette) {
    this.def = def;
    const rise = crestRise(def);
    // Зона починається від найвищого гребеня, щоб човник на гребені теж був «у воді»
    this.box = { x: def.x, y: def.y - rise, width: def.width, height: def.height + rise };
    this.surfaceBase = def.y;
    this.currentSpeed = def.currentSpeed ?? 0;

    // Глибина води (напівпрозоре тіло) починається нижче найглибшої западини хвилі
    this.waterGfx = scene.add.graphics().setDepth(2);
    this.waterGfx.fillStyle(hexToNumber(p.shade), 0.72);
    this.waterGfx.fillRect(def.x, def.y + rise + 6, def.width, def.height - rise - 6);

    if (def.wave) {
      // Хвиляста поверхня: ряд сегментів, що гойдаються на висоті хвилі (оновлюється щокадру без Graphics)
      const n = Math.ceil(def.width / SEGMENT);
      for (let i = 0; i < n; i++) {
        this.segments.push(
          scene.add
            .image(def.x + i * SEGMENT + SEGMENT / 2, def.y, TEX.water)
            .setOrigin(0.5, 0.2)
            .setDisplaySize(SEGMENT + 6, 44)
            .setDepth(3)
            .setAlpha(0.92),
        );
      }
      this.syncSegments();
    } else {
      // Поверхня води з хвилями (плитка 120×60)
      this.tiles = scene.add
        .tileSprite(def.x, def.y, def.width, 24, TEX.water)
        .setOrigin(0, 0)
        .setDepth(3)
        .setAlpha(0.9);
    }
  }

  /** Y поверхні в точці x зараз (для хвилі змінюється з часом). */
  surfaceAt(x: number): number {
    return surfaceY(this.def, x, this.timeMs);
  }

  /** Нахил поверхні в точці x, градуси. */
  slopeDegAt(x: number): number {
    return (surfaceAngle(this.def, x, this.timeMs) * 180) / Math.PI;
  }

  update(dtSec: number): void {
    this.timeMs += dtSec * 1000;
    if (this.tiles) {
      // Хвилі плавно рухаються за течією (або легке погойдування)
      const speed = this.currentSpeed !== 0 ? this.currentSpeed * 0.4 : 18;
      this.tiles.tilePositionX += speed * dtSec;
    } else {
      this.syncSegments();
    }
  }

  private syncSegments(): void {
    this.segments.forEach((s, i) => {
      const cx = this.def.x + i * SEGMENT + SEGMENT / 2;
      s.setPosition(cx, this.surfaceAt(cx));
      s.setRotation(surfaceAngle(this.def, cx, this.timeMs));
    });
  }

  applyQuality(_q: QualityProfile): void {
    // Водна поверхня легка для рендеру: сегменти й tileSprite без частинок
  }

  destroy(): void {
    this.waterGfx.destroy();
    this.tiles?.destroy();
    for (const s of this.segments) s.destroy();
  }
}
