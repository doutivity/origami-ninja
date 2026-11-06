import { describe, expect, it } from "vitest";
import { bambooRiver } from "../../src/game/level/bamboo-river.ts";
import { mountain } from "../../src/game/level/mountain.ts";
import type { LevelDef } from "../../src/game/level/types.ts";
import { maxPlainJumpDistance, validateLevel } from "../../src/game/level/validate.ts";

const clone = (): LevelDef => structuredClone(mountain);

describe("mountain level", () => {
  it("is valid", () => {
    expect(validateLevel(mountain)).toEqual([]);
  });

  it("is two to three screens wide", () => {
    expect(mountain.width / 960).toBeGreaterThanOrEqual(2);
    expect(mountain.width / 960).toBeLessThanOrEqual(3);
  });

  it("has every required element", () => {
    expect(mountain.enemies.length).toBeGreaterThan(0);
    expect(mountain.fires.length).toBeGreaterThan(0);
    expect(mountain.winds.length).toBeGreaterThan(0);
    expect(mountain.checkpoints.length).toBeGreaterThan(0);
    expect(mountain.finish.x).toBeGreaterThan(mountain.spawn.x);
  });

  it("has a gap wider than a plain jump", () => {
    const sorted = [...mountain.platforms].sort((a, b) => a.x - b.x);
    let widest = 0;
    let reach = 0;
    for (const p of sorted) {
      widest = Math.max(widest, p.x - reach);
      reach = Math.max(reach, p.x + p.width);
    }
    expect(widest).toBeGreaterThan(maxPlainJumpDistance());
  });
});

describe("bamboo river level", () => {
  it("is valid", () => {
    expect(validateLevel(bambooRiver)).toEqual([]);
  });

  it("has water zones and water speed", () => {
    expect(bambooRiver.waters?.length).toBeGreaterThan(0);
    expect(bambooRiver.waters?.[0]?.currentSpeed).toBeGreaterThan(0);
  });

  it("has a gap wider than a plain jump", () => {
    const sorted = [...bambooRiver.platforms].sort((a, b) => a.x - b.x);
    let widest = 0;
    let reach = 0;
    for (const p of sorted) {
      widest = Math.max(widest, p.x - reach);
      reach = Math.max(reach, p.x + p.width);
    }
    expect(widest).toBeGreaterThan(maxPlainJumpDistance());
  });
});

describe("validateLevel catches mistakes", () => {
  it("spawn not on a platform", () => {
    const l = clone();
    l.spawn.y -= 50;
    expect(validateLevel(l)).toContain("spawn is not standing on a platform");
  });

  it("platform outside the world", () => {
    const l = clone();
    l.platforms[0] = { x: -10, y: 440, width: 100, height: 50 };
    expect(validateLevel(l).some((e) => e.includes("outside the world"))).toBe(true);
  });

  it("enemy patrol leaving its platform", () => {
    const l = clone();
    const e = l.enemies[0];
    if (e) e.patrolRight = 99999;
    expect(validateLevel(l).some((m) => m.includes("patrol leaves its platform"))).toBe(true);
  });

  it("enemy hovering in the air", () => {
    const l = clone();
    const e = l.enemies[0];
    if (e) e.y -= 100;
    expect(validateLevel(l).some((m) => m.includes("not standing on a platform"))).toBe(true);
  });

  it("empty patrol range", () => {
    const l = clone();
    const e = l.enemies[0];
    if (e) e.patrolRight = e.patrolLeft;
    expect(validateLevel(l).some((m) => m.includes("patrol range is empty"))).toBe(true);
  });

  it("fire floating over a gap", () => {
    const l = clone();
    l.fires.push({ x: 1800, y: 350, width: 100, height: 90 });
    expect(validateLevel(l).some((m) => m.includes("fire") && m.includes("not standing"))).toBe(
      true,
    );
  });

  it("checkpoint in the void", () => {
    const l = clone();
    l.checkpoints.push({ x: 1850, y: 440 });
    expect(validateLevel(l).some((m) => m.includes("checkpoint"))).toBe(true);
  });

  it("no checkpoints", () => {
    const l = clone();
    l.checkpoints = [];
    expect(validateLevel(l)).toContain("no checkpoints");
  });

  it("finish left of the spawn", () => {
    const l = clone();
    l.finish.x = 50;
    expect(validateLevel(l).some((m) => m.includes("finish"))).toBe(true);
  });

  it("level without a glider-only gap", () => {
    const l = clone();
    l.platforms = l.platforms.filter((p) => !(p.x === 1000 || p.x === 2040));
    l.platforms.push({ x: 900, y: 440, width: 1980, height: 100 });
    l.enemies = [];
    l.fires = [];
    l.checkpoints = [{ x: 1000, y: 440 }];
    expect(validateLevel(l)).toContain("level has no gap that requires the glider");
  });

  it("no platforms at all", () => {
    const l = clone();
    l.platforms = [];
    expect(validateLevel(l)).toContain("no platforms");
  });
});
