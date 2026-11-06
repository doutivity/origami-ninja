// Нічний каньйон: валідність даних, проходимість прірв симуляцією, вітер і журавлики.
import { describe, expect, it } from "vitest";
import { craneSees, craneStep, hoverPoint, newCrane } from "../../src/game/enemies/crane-model.ts";
import { LEVELS, nextLevel } from "../../src/game/level/index.ts";
import { midnightCanyon } from "../../src/game/level/midnight-canyon.ts";
import type { LevelDef } from "../../src/game/level/types.ts";
import { validateLevel } from "../../src/game/level/validate.ts";
import { glideStep, ringDirection } from "../../src/game/player/glide-model.ts";
import { tuning } from "../../src/game/tuning.ts";
import { simulate } from "./helpers/sim.ts";

type Policy = "plain" | "neutral";

/** Куди приземляється стрибок із розбігу з точки відриву (null — упав). */
function landing(level: LevelDef, takeoff: number, policy: Policy, openGates: boolean) {
  const r = simulate(
    level,
    takeoff - 260,
    440,
    {
      jumpAt: (s) => s.x >= takeoff && s.onGround,
      hold: (s) => policy === "neutral" && s.x >= takeoff,
      openGates,
    },
    60 * 14,
  );
  let airborne = false;
  for (const s of r.trace) {
    if (!airborne && !s.onGround && s.x >= takeoff) airborne = true;
    if (airborne && s.onGround) return s.x;
  }
  return null;
}

/** Довжина діапазону відривів (кроком 10 px), після яких стрибок долітає за край `farEdge`. */
function window(level: LevelDef, from: number, to: number, policy: Policy, gates: boolean) {
  const ok: number[] = [];
  for (let t = from; t <= to; t += 10) {
    const x = landing(level, t, policy, gates);
    if (x !== null && x > to + 100) ok.push(t);
  }
  return ok.length === 0 ? 0 : (ok.at(-1) as number) - (ok[0] as number) + 10;
}

describe("midnight canyon level", () => {
  it("is valid and registered after the pagoda", () => {
    expect(validateLevel(midnightCanyon)).toEqual([]);
    expect(LEVELS.at(-1)).toBe(midnightCanyon);
    expect(nextLevel("burning-pagoda")).toBe(midnightCanyon);
    expect(nextLevel("midnight-canyon")).toBeNull();
  });

  it("has every new element: ring, down draft, gated lift, vane, cranes", () => {
    const kinds = midnightCanyon.winds.map((w) => w.kind);
    expect(kinds).toContain("ring");
    expect(kinds).toContain("down");
    expect(midnightCanyon.winds.some((w) => w.gate !== undefined)).toBe(true);
    expect(midnightCanyon.vanes?.length).toBeGreaterThan(0);
    expect(midnightCanyon.cranes?.length).toBeGreaterThan(0);
  });

  it("first gap: the rings make the glide possible, a plain jump never does", () => {
    expect(window(midnightCanyon, 560, 700, "plain", false)).toBe(0);
    expect(window(midnightCanyon, 560, 700, "neutral", false)).toBeGreaterThanOrEqual(100);
  });

  it("first gap: without the rings neutral gliding falls short from everywhere", () => {
    const noRings: LevelDef = {
      ...midnightCanyon,
      winds: midnightCanyon.winds.filter((w) => w.kind !== "ring"),
    };
    expect(window(noRings, 560, 700, "neutral", false)).toBe(0);
  });

  it("second gap: closed tunnel means nobody crosses, even gliding", () => {
    expect(window(midnightCanyon, 1840, 1960, "neutral", false)).toBe(0);
    expect(window(midnightCanyon, 1840, 1960, "plain", true)).toBe(0);
  });

  it("second gap: once the weathervane is struck, neutral gliding crosses", () => {
    expect(window(midnightCanyon, 1840, 1960, "neutral", true)).toBeGreaterThanOrEqual(60);
  });

  it("the weathervane stands within sword reach of its ledge", () => {
    const vane = midnightCanyon.vanes?.[0];
    expect(vane).toBeDefined();
    if (!vane) return;
    const half = tuning.vane.hitSize;
    const headY = vane.y - tuning.vane.poleHeight;
    // Гравець стоїть на уступі (ноги на vane.y): голова флюгера має перетинатись зі зростом
    const bodyTop = vane.y - tuning.player.body.height * tuning.player.spriteScale;
    expect(headY + half).toBeGreaterThan(bodyTop);
  });
});

describe("glide model: new winds", () => {
  const step = (kind: "lift" | "down" | "ring", n = 60) => {
    let v = { vx: 190, vy: 95 };
    const wind = { kind, ...ringDirection({ x: 1, y: 0 }) };
    for (let i = 0; i < n; i++) v = glideStep(v.vx, v.vy, 1, "neutral", true, 1 / 60, wind);
    return v;
  };

  it("down draft pushes the glider down harder than still air", () => {
    expect(step("down").vy).toBeGreaterThan(tuning.glide.fall.neutral);
  });

  it("lift pulls up, ring accelerates along its direction", () => {
    expect(step("lift").vy).toBeLessThan(0);
    expect(step("ring").vx).toBeGreaterThan(tuning.glide.speed.down);
  });

  it("the ring boost fades slowly rather than instantly", () => {
    let v: { vx: number; vy: number } = { vx: tuning.glide.ringSpeed, vy: 95 };
    for (let i = 0; i < 30; i++) v = glideStep(v.vx, v.vy, 1, "neutral", false, 1 / 60);
    // За півсекунди надлишок ще відчутний, але падає до звичайної швидкості
    expect(v.vx).toBeGreaterThan(tuning.glide.speed.neutral + 60);
    for (let i = 0; i < 120; i++) v = glideStep(v.vx, v.vy, 1, "neutral", false, 1 / 60);
    expect(v.vx).toBeCloseTo(tuning.glide.speed.neutral, 0);
  });

  it("without a wind effect inWind still means an updraft (level 1 behaviour)", () => {
    expect(glideStep(0, 0, 1, "neutral", true, 0.1).vy).toBeLessThan(0);
  });

  it("ringDirection normalizes and defaults to the right", () => {
    expect(ringDirection({ x: 3, y: 4 })).toEqual({ dx: 0.6, dy: 0.8 });
    expect(ringDirection({ x: 0, y: 0 })).toEqual({ dx: 1, dy: 0 });
    expect(ringDirection()).toEqual({ dx: 1, dy: 0 });
  });
});

describe("crane model", () => {
  const home = { x: 1000, y: 250 };

  it("sees a target below and nearby, not far away or above", () => {
    expect(craneSees(home, { x: 1100, y: 400 })).toBe(true);
    expect(craneSees(home, { x: 1500, y: 400 })).toBe(false);
    expect(craneSees(home, { x: 1050, y: 100 })).toBe(false);
  });

  it("goes hover → warn → dive → recover → hover", () => {
    const c = newCrane(home.x, home.y, 100);
    const pos = { ...home };
    const target = { x: 1080, y: 420 };
    const seen = new Set<string>();
    for (let i = 0; i < 60 * 8; i++) {
      const v = craneStep(c, pos, target, 1000 / 60);
      pos.x += v.x / 60;
      pos.y += v.y / 60;
      seen.add(c.phase);
      if (i > 60 && c.phase === "hover" && seen.has("recover")) break;
    }
    expect([...seen]).toEqual(["hover", "warn", "dive", "recover"]);
    expect(c.phase).toBe("hover");
  });

  it("hovers in place when nobody is around", () => {
    const c = newCrane(home.x, home.y, 100);
    const pos = { ...home };
    for (let i = 0; i < 60 * 5; i++) {
      const v = craneStep(c, pos, null, 1000 / 60);
      pos.x += v.x / 60;
      pos.y += v.y / 60;
      expect(c.phase).toBe("hover");
    }
    const h = hoverPoint(c);
    expect(Math.hypot(h.x - pos.x, h.y - pos.y)).toBeLessThan(40);
  });

  it("dives toward where the target was when the warning ended", () => {
    const c = newCrane(home.x, home.y, 0);
    const pos = { ...home };
    let v = { x: 0, y: 0 };
    for (let i = 0; i < 60 * 3 && c.phase !== "dive"; i++)
      v = craneStep(c, pos, { x: 1100, y: 450 }, 1000 / 60);
    expect(c.phase).toBe("dive");
    v = craneStep(c, pos, { x: 0, y: 0 }, 1000 / 60);
    expect(v.x).toBeGreaterThan(0);
    expect(v.y).toBeGreaterThan(0);
  });
});

describe("validateLevel: canyon mistakes", () => {
  const clone = (): LevelDef => structuredClone(midnightCanyon);

  it("gate without a weathervane", () => {
    const l = clone();
    l.vanes = [];
    expect(validateLevel(l).some((m) => m.includes("has no weathervane"))).toBe(true);
  });

  it("weathervane that opens nothing", () => {
    const l = clone();
    l.vanes?.push({ id: "extra", x: 1700, y: 340 });
    expect(validateLevel(l).some((m) => m.includes("opens nothing"))).toBe(true);
  });

  it("weathervane floating over the gap", () => {
    const l = clone();
    const v = l.vanes?.[0];
    if (v) v.x = 2200;
    expect(validateLevel(l).some((m) => m.includes("vane 0: not standing"))).toBe(true);
  });

  it("crane outside the world and zero ring direction", () => {
    const l = clone();
    l.cranes?.push({ x: 10, y: 200, range: 100 });
    const ring = l.winds.find((w) => w.kind === "ring");
    if (ring) ring.dir = { x: 0, y: 0 };
    const errors = validateLevel(l);
    expect(errors.some((m) => m.includes("crane") && m.includes("outside the world"))).toBe(true);
    expect(errors.some((m) => m.includes("zero direction"))).toBe(true);
  });
});
