import type Phaser from "phaser";
import type { Palette } from "../../gfx/palette.ts";
import type { Box } from "../combat/geometry.ts";
import { hexToNumber } from "../env.ts";
import type { InkDef } from "../level/types.ts";
import { tuning } from "../tuning.ts";
import { inkBox } from "./ink-model.ts";

/** Чорнильна пляма на землі: статична графіка (малюється один раз), шкоди не завдає. */
export class InkZone {
  readonly box: Box;

  constructor(scene: Phaser.Scene, def: InkDef, p: Palette) {
    this.box = inkBox(def);
    const h = tuning.ink.height;
    const g = scene.add.graphics().setDepth(1);
    // Основна калюжа з нерівним краєм, світліший блік зверху й краплі, що тягнуться вгору
    g.fillStyle(hexToNumber(p.ink), 0.9);
    g.fillRect(def.x, def.y - 4, def.width, 8);
    for (let x = def.x; x < def.x + def.width; x += 36) {
      const k = Math.floor((x - def.x) / 36);
      const bump = 4 + ((k * 7) % 9);
      g.fillEllipse(x + 18, def.y - 3, 40, bump * 2);
    }
    g.fillStyle(hexToNumber(p.muted), 0.5);
    for (let x = def.x + 10; x < def.x + def.width - 20; x += 72)
      g.fillRect(x, def.y - h / 3, 22, 2);
    // Ліва й права кромки: ледь помітні ямки, щоб зона читалась, коли ніндзя ще не в ній
    g.fillStyle(hexToNumber(p.ink), 0.35);
    g.fillRect(def.x - 6, def.y - 2, 6, 3);
    g.fillRect(def.x + def.width, def.y - 2, 6, 3);
  }
}
