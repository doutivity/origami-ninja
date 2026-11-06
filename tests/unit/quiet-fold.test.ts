// Тихий згин: підсумковий рівень, де кожна форма має свій м'який відрізок, а кінець збігається зі стартом першого рівня.
import { describe, expect, it } from "vitest";
import { LEVELS, nextLevel } from "../../src/game/level/index.ts";
import { mountain } from "../../src/game/level/mountain.ts";
import { quietFold as L } from "../../src/game/level/quiet-fold.ts";
import type { LevelDef } from "../../src/game/level/types.ts";
import { maxPlainJumpDistance, validateLevel } from "../../src/game/level/validate.ts";
import { tuning } from "../../src/game/tuning.ts";
import { simulate } from "./helpers/sim.ts";

const plat = (x: number) => L.platforms.find((p) => p.x === x);

describe("quiet fold level", () => {
  it("is valid and the last level so far", () => {
    expect(validateLevel(L)).toEqual([]);
    expect(LEVELS.at(-1)).toBe(L);
    expect(nextLevel("paper-sea")).toBe(L);
    expect(nextLevel("quiet-fold")).toBeNull();
  });

  it("switches on every form the ninja has learned", () => {
    expect(L.frog).toBe(true);
    expect(L.shell).toBe(true);
    expect(L.dash).toBe(true);
    expect(L.sail).toBe(true);
    expect(L.winds.length).toBeGreaterThan(0);
    expect(L.waters?.length).toBeGreaterThan(0);
    expect(L.inks?.length).toBeGreaterThan(0);
    expect(L.cuts?.some((c) => c.tough)).toBe(true);
  });

  it("is calm: no archers, cranes or fish, one slow enemy and no fire", () => {
    expect(L.archers ?? []).toHaveLength(0);
    expect(L.cranes ?? []).toHaveLength(0);
    expect(L.fishes ?? []).toHaveLength(0);
    expect(L.fires).toHaveLength(0);
    expect(L.enemies.length).toBeLessThanOrEqual(1);
  });
});

describe("the frog ledge", () => {
  it("is higher than a plain jump but within even the weakest frog leap", () => {
    const ground = plat(0);
    const ledge = plat(700);
    expect(ground && ledge).toBeTruthy();
    if (!ground || !ledge) return;
    const rise = ground.y - ledge.y;
    const plainApex = tuning.player.jumpVelocity ** 2 / (2 * tuning.player.gravity);
    const minFrogApex = tuning.frog.minLeap ** 2 / (2 * tuning.player.gravity);
    expect(rise).toBeGreaterThan(plainApex);
    expect(rise).toBeLessThan(minFrogApex);
  });
});

describe("the glider gap", () => {
  /** Де приземляється політ після стрибка з краю високого уступу (ноги на y=290). */
  const landing = (level: LevelDef, takeoff: number, glide: boolean): number | null => {
    const r = simulate(
      level,
      800,
      290,
      {
        jumpAt: (s) => s.x >= takeoff && s.onGround,
        hold: (s) => glide && s.x >= takeoff,
      },
      60 * 12,
    );
    let air = false;
    for (const s of r.trace) {
      if (!air && !s.onGround && s.x >= takeoff) air = true;
      if (air && s.onGround) return s.x;
    }
    return null;
  };
  const island = 1760;
  const crossed = (level: LevelDef, glide: boolean) => {
    let n = 0;
    for (let t = 900; t <= 1000; t += 10) {
      const x = landing(level, t, glide);
      if (x !== null && x >= island) n += 10;
    }
    return n;
  };

  it("is wider than a plain jump, so the glider is required", () => {
    expect(island - 1000).toBeGreaterThan(maxPlainJumpDistance());
    expect(crossed(L, false)).toBe(0);
  });

  it("gliding with the updraft crosses from the whole stretch before the edge", () => {
    expect(crossed(L, true)).toBeGreaterThanOrEqual(100);
  });

  it("without the updraft a neutral glide falls short (the wind is part of the lesson)", () => {
    expect(crossed({ ...L, winds: [] }, true)).toBe(0);
  });

  it("the updraft sits over the gap, not over the platforms", () => {
    for (const w of L.winds) {
      expect(w.x).toBeGreaterThan(1000);
      expect(w.x + w.width).toBeLessThan(island);
    }
  });
});

describe("the river", () => {
  it("fills the whole gap between the island and the last bank, wider than a jump", () => {
    const water = L.waters?.[0];
    const island = plat(1760);
    const bank = plat(2900);
    expect(water && island && bank).toBeTruthy();
    if (!water || !island || !bank) return;
    expect(water.x).toBeLessThanOrEqual(island.x + island.width);
    expect(water.x + water.width).toBeGreaterThanOrEqual(bank.x);
    expect(water.width).toBeGreaterThan(maxPlainJumpDistance());
    // Тиха річка: течія слабша за веслування, тож човник завжди може пливти вперед
    expect(Math.abs(water.currentSpeed ?? 0)).toBeLessThan(tuning.boat.speed);
    expect(water.wave).toBeUndefined();
  });
});

describe("the tough wall", () => {
  const wall = L.cuts?.find((c) => c.tough);

  it("stops the ninja and the sword, but not the dash", () => {
    expect(wall).toBeDefined();
    if (!wall) return;
    // Стартуємо за чорнилом (воно сповільнює), за 50 px до стіни
    const start = wall.x - 50;
    const sword = simulate(L, start, 440, { hold: () => false, swordCuts: true }, 60 * 3);
    expect(sword.final.x).toBeLessThan(wall.x);
    const dash = simulate(
      L,
      start,
      440,
      { hold: () => false, swordCuts: true, dashAt: (s) => s.x >= start + 5 },
      60 * 3,
    );
    expect(dash.final.x).toBeGreaterThan(wall.x + wall.width);
  });

  it("stands after the ink pool, so the dash lesson is not made harder by the ink", () => {
    const ink = L.inks?.[0];
    expect(ink && wall).toBeTruthy();
    if (ink && wall) expect(wall.x).toBeGreaterThan(ink.x + ink.width + 40);
  });
});

describe("the seamless exit into the first level", () => {
  it("shares the backdrop with the first level", () => {
    expect(L.bg ?? "mountains").toBe(mountain.bg ?? "mountains");
  });

  it("ends on flat ground at the same height the first level starts on", () => {
    const first = mountain.platforms.find((p) => p.x === 0);
    expect(first).toBeDefined();
    expect(L.finish.y).toBe(mountain.spawn.y);
    expect(L.finish.y).toBe(first?.y);
    const last = L.platforms.reduce((a, b) => (b.x + b.width > a.x + a.width ? b : a));
    // Фінішний берег доходить до краю світу, тож за ним початок гір першого рівня продовжує землю
    expect(last.x + last.width).toBe(L.width);
    expect(last.y).toBe(first?.y);
  });

  it("starts exactly where the first level starts, so the loop is gapless", () => {
    expect(L.spawn.y).toBe(mountain.spawn.y);
    expect(L.spawn.x).toBe(mountain.spawn.x);
  });
});
