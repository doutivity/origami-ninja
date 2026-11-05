// Баланс рівня, виміряний безголовою симуляцією (той самий state machine і tuning, що в грі).
import { describe, expect, it } from "vitest";
import { mountain } from "../../src/game/level/mountain.ts";
import type { LevelDef } from "../../src/game/level/types.ts";
import { simulate } from "./helpers/sim.ts";

type Policy = "plain" | "neutral" | "up" | "down";

/** Де приземлюється перший політ після стрибка з позиції takeoff (null — упав у прірву). */
function firstLanding(level: LevelDef, takeoff: number, policy: Policy): number | null {
  const r = simulate(
    level,
    1100,
    440,
    {
      jumpAt: (s) => s.x >= takeoff && s.onGround,
      hold: (s) => policy !== "plain" && s.x >= takeoff,
      up: () => policy === "up",
      down: () => policy === "down",
    },
    60 * 12,
  );
  let airborne = false;
  for (const s of r.trace) {
    if (!airborne && !s.onGround && s.x >= takeoff) airborne = true;
    if (airborne && s.feet > level.height + 20) return null;
    if (airborne && s.onGround) return s.x;
  }
  return null;
}

/** Довжина діапазону точок відриву (px), з яких політ долітає за край прірви. */
function crossingWindow(level: LevelDef, policy: Policy): number {
  const ok: number[] = [];
  for (let takeoff = 1400; takeoff <= 1700; takeoff += 4) {
    const landed = firstLanding(level, takeoff, policy);
    if (landed !== null && landed > 2040) ok.push(takeoff);
  }
  return ok.length === 0 ? 0 : (ok.at(-1) as number) - (ok[0] as number) + 4;
}

const noWind: LevelDef = { ...mountain, winds: [] };

describe("the glider gap", () => {
  it("cannot be crossed with a plain jump from anywhere", () => {
    expect(crossingWindow(mountain, "plain")).toBe(0);
  });

  it("can be crossed by gliding without tilting (the only option on a phone)", () => {
    expect(crossingWindow(mountain, "neutral")).toBeGreaterThanOrEqual(100);
  });

  it("is crossed from the very edge of the platform", () => {
    expect(firstLanding(mountain, 1696, "neutral")).toBeGreaterThan(2040);
  });

  it("nose up is the most forgiving tilt, nose down the least", () => {
    const up = crossingWindow(mountain, "up");
    const neutral = crossingWindow(mountain, "neutral");
    const down = crossingWindow(mountain, "down");
    expect(up).toBeGreaterThanOrEqual(neutral);
    expect(neutral).toBeGreaterThan(down);
  });

  it("the updraft helps but is not a free pass: without it the neutral window is much tighter", () => {
    const withWind = crossingWindow(mountain, "neutral");
    const without = crossingWindow(noWind, "neutral");
    expect(without).toBeLessThan(withWind / 2);
    expect(without).toBeGreaterThan(0);
  });

  it("falling short means falling in: a glider that drops below the updraft is lost", () => {
    expect(firstLanding(mountain, 1450, "down")).toBeNull();
  });
});

describe("the rest of the level", () => {
  it("every platform step is reachable with a plain jump", () => {
    const jumpHeight = 640 ** 2 / (2 * 1500);
    const tops = [...mountain.platforms].sort((a, b) => a.x - b.x);
    for (const p of tops) {
      const below = tops.filter(
        (q) => q !== p && q.x <= p.x + p.width && q.x + q.width >= p.x - 200 && q.y > p.y,
      );
      if (below.length === 0) continue;
      const nearest = Math.min(...below.map((q) => q.y - p.y));
      expect(nearest).toBeLessThan(jumpHeight);
    }
  });

  it("the fire pits can be jumped over without a glider", () => {
    for (const f of mountain.fires) expect(f.width).toBeLessThan(230);
  });
});
