// Перевірка даних рівня: повертає список помилок (порожній — рівень коректний).
import { tuning } from "../tuning.ts";
import { reachableSet } from "./reach.ts";
import type { LevelDef, PlatformDef } from "./types.ts";

const t = tuning.player;

/** Максимальна дальність стрибка без планера на місці виконання розбігу, px (з запасом). */
export const maxPlainJumpDistance = (): number => {
  const airtime = (2 * t.jumpVelocity) / t.gravity;
  return t.runSpeed * airtime;
};

const topOf = (pl: PlatformDef) => pl.y;
const under = (platforms: PlatformDef[], x: number, y: number): PlatformDef | undefined =>
  platforms.find((p) => x >= p.x && x <= p.x + p.width && Math.abs(topOf(p) - y) < 1);

export function validateLevel(level: LevelDef): string[] {
  const errors: string[] = [];
  const inWorld = (x: number, y: number) =>
    x >= 0 && x <= level.width && y >= 0 && y <= level.height;
  const err = (m: string) => errors.push(m);

  if (level.platforms.length === 0) err("no platforms");
  level.platforms.forEach((p, i) => {
    if (p.width <= 0 || p.height <= 0) err(`platform ${i}: non-positive size`);
    if (p.x < 0 || p.x + p.width > level.width)
      err(`platform ${i}: outside the world horizontally`);
  });
  if (!under(level.platforms, level.spawn.x, level.spawn.y))
    err("spawn is not standing on a platform");

  level.enemies.forEach((e, i) => {
    const pl = under(level.platforms, e.x, e.y);
    if (!pl) {
      err(`enemy ${i}: not standing on a platform`);
      return;
    }
    if (e.patrolLeft >= e.patrolRight) err(`enemy ${i}: patrol range is empty`);
    if (e.patrolLeft < pl.x || e.patrolRight > pl.x + pl.width)
      err(`enemy ${i}: patrol leaves its platform`);
    if (e.x < e.patrolLeft || e.x > e.patrolRight)
      err(`enemy ${i}: starts outside its patrol range`);
  });

  level.fires.forEach((f, i) => {
    if (f.width <= 0 || f.height <= 0) err(`fire ${i}: non-positive size`);
    if (!under(level.platforms, f.x + f.width / 2, f.y + f.height))
      err(`fire ${i}: not standing on a platform`);
  });
  level.winds.forEach((w, i) => {
    if (w.width <= 0 || w.height <= 0) err(`wind ${i}: non-positive size`);
    if (!inWorld(w.x, w.y)) err(`wind ${i}: outside the world`);
  });
  const vaneIds = new Set((level.vanes ?? []).map((v) => v.id));
  level.winds.forEach((w, i) => {
    if (w.dir && w.dir.x === 0 && w.dir.y === 0) err(`wind ${i}: zero direction`);
    if (w.gate !== undefined && !vaneIds.has(w.gate))
      err(`wind ${i}: gate "${w.gate}" has no weathervane`);
  });
  level.vanes?.forEach((v, i) => {
    if (!under(level.platforms, v.x, v.y)) err(`vane ${i}: not standing on a platform`);
    if (!level.winds.some((w) => w.gate === v.id)) err(`vane ${i}: opens nothing`);
    if ((level.vanes ?? []).findIndex((o) => o.id === v.id) !== i)
      err(`vane ${i}: duplicate id "${v.id}"`);
  });
  level.cranes?.forEach((c, i) => {
    if (c.range <= 0) err(`crane ${i}: non-positive range`);
    if (!inWorld(c.x - c.range, c.y) || !inWorld(c.x + c.range, c.y))
      err(`crane ${i}: outside the world`);
  });
  level.waters?.forEach((w, i) => {
    if (w.width <= 0 || w.height <= 0) err(`water ${i}: non-positive size`);
    if (!inWorld(w.x, w.y)) err(`water ${i}: outside the world`);
  });
  level.checkpoints.forEach((c, i) => {
    if (!under(level.platforms, c.x, c.y)) err(`checkpoint ${i}: not standing on a platform`);
  });
  if (level.checkpoints.length === 0) err("no checkpoints");
  if (!under(level.platforms, level.finish.x, level.finish.y))
    err("finish is not standing on a platform");
  level.archers?.forEach((a, i) => {
    if (!under(level.platforms, a.x, a.y)) err(`archer ${i}: not standing on a platform`);
  });
  level.beams?.forEach((b, i) => {
    if (b.landY <= b.topY) err(`beam ${i}: lands above where it starts`);
    if (!under(level.platforms, b.x, b.landY)) err(`beam ${i}: does not land on a platform`);
    if (b.intervalMs <= 0 || b.offsetMs < 0) err(`beam ${i}: bad timing`);
  });

  if (level.vertical) {
    errors.push(...validateVertical(level));
    return errors;
  }
  if (level.finish.x < level.spawn.x) err("finish is left of the spawn");

  // Хоча б одна прірва, яку без планера не пройти
  const sorted = [...level.platforms].sort((a, b) => a.x - b.x);
  let widest = 0;
  let reach = sorted[0] ? sorted[0].x + sorted[0].width : 0;
  for (const p of sorted.slice(1)) {
    widest = Math.max(widest, p.x - reach);
    reach = Math.max(reach, p.x + p.width);
  }
  if (widest <= maxPlainJumpDistance()) err("level has no gap that requires the glider");
  return errors;
}

/** Вертикальний рівень: фініш угорі, досяжний із жабкою й недосяжний без неї. */
function validateVertical(level: LevelDef): string[] {
  const errors: string[] = [];
  if (level.finish.y >= level.spawn.y) errors.push("finish is not above the spawn");
  const at = (x: number, y: number) =>
    level.platforms.find((p) => x >= p.x && x <= p.x + p.width && Math.abs(p.y - y) < 1);
  const start = at(level.spawn.x, level.spawn.y);
  const goal = at(level.finish.x, level.finish.y);
  if (!start || !goal) return errors;
  const plain = reachableSet(level.platforms, start, tuning.player.jumpVelocity);
  const withFrog = reachableSet(level.platforms, start, tuning.frog.maxLeap);
  if (!withFrog.has(goal)) errors.push("finish is unreachable even with the frog leap");
  if (level.frog && plain.has(goal)) errors.push("finish is reachable without the frog leap");
  level.checkpoints.forEach((c, i) => {
    const pl = at(c.x, c.y);
    if (pl && !withFrog.has(pl)) errors.push(`checkpoint ${i}: unreachable`);
  });
  // Кожен карниз має бути досяжним: інакше він «мертвий» і зайвий
  level.platforms.forEach((pl, i) => {
    if (!withFrog.has(pl)) errors.push(`platform ${i}: unreachable`);
  });
  return errors;
}
