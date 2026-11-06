// Чорнильні плями (чиста логіка): зона сповільнення над землею.
import type { Box } from "../combat/geometry.ts";
import type { InkDef } from "../level/types.ts";
import { tuning } from "../tuning.ts";

/** Зона, у якій гравець вважається в чорнилі: смуга над землею, а не весь стовп повітря. */
export function inkBox(def: InkDef): Box {
  const h = tuning.ink.height;
  return { x: def.x, y: def.y - h, width: def.width, height: h + 4 };
}

/** Швидкість бігу на землі: у чорнилі помітно менша. */
export const groundRunSpeed = (inInk: boolean): number =>
  tuning.player.runSpeed * (inInk ? tuning.ink.runScale : 1);

/** Початкова швидкість стрибка: у чорнилі стрибок обмежений. */
export const jumpSpeed = (inInk: boolean): number =>
  tuning.player.jumpVelocity * (inInk ? tuning.ink.jumpScale : 1);
