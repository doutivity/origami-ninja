// Кірігамі-майстерня: дані рівня, ривок-сюрікен, паперові стіни й прірви, які без ривка не взяти.
import { describe, expect, it } from "vitest";
import { emptyInput } from "../../src/game/input/input-state.ts";
import { LEVELS, nextLevel } from "../../src/game/level/index.ts";
import { kirigamiWorkshop as L } from "../../src/game/level/kirigami-workshop.ts";
import type { LevelDef } from "../../src/game/level/types.ts";
import { validateLevel } from "../../src/game/level/validate.ts";
import type { PlayerContext } from "../../src/game/player/context.ts";
import { DashController, dashDistance } from "../../src/game/player/dash-model.ts";
import { DashState } from "../../src/game/player/states/dash.ts";
import { FallState } from "../../src/game/player/states/fall.ts";
import { tuning } from "../../src/game/tuning.ts";
import { simulate } from "./helpers/sim.ts";

const ctxOf = (over: Partial<PlayerContext> = {}): PlayerContext => ({
  input: emptyInput(),
  dt: 1 / 60,
  onGround: true,
  vx: 0,
  vy: 0,
  coyoteMs: 0,
  jumpBufferMs: Number.POSITIVE_INFINITY,
  inWind: false,
  facing: 1,
  ...over,
});

type Move = "plain" | "dash";

/** Куди приземляється стрибок із розбігу; dash — ривок на вершині стрибка (24 кадри після відриву). */
function landing(level: LevelDef, takeoff: number, move: Move, startX: number): number | null {
  let take = -1;
  const r = simulate(
    level,
    startX,
    440,
    {
      jumpAt: (s) => s.x >= takeoff && s.onGround,
      // Jump утримується лише під час підйому: повна висота без випадкового планера
      hold: (s) => !s.onGround && s.vy < 0 && s.state !== "dash",
      swordCuts: true,
      dashAt:
        move === "dash"
          ? (s) => {
              if (take < 0 && !s.onGround && s.x > takeoff - 5) take = s.frame;
              return take >= 0 && s.frame - take >= 24;
            }
          : undefined,
    },
    60 * 10,
  );
  let air = false;
  for (const s of r.trace) {
    if (!air && !s.onGround && s.x >= takeoff) air = true;
    if (air && s.onGround) return s.x;
  }
  return null;
}

/** Скільки px останньої ділянки перед краєм дають перелітання на інший бік (крок 10 px). */
function window(level: LevelDef, g: Gap, move: Move): number {
  let n = 0;
  for (let t = g.edge - 80; t <= g.edge; t += 10) {
    const x = landing(level, t, move, g.start);
    if (x !== null && x > g.far - 5) n += 10;
  }
  return n;
}

/** edge/far — край платформи й початок наступної; start — звідки починається розбіг (за стінами) */
interface Gap {
  edge: number;
  far: number;
  start: number;
}
const gap1: Gap = { edge: 700, far: 1000, start: 400 };
const gap2: Gap = { edge: 1840, far: 2140, start: 1700 };

describe("kirigami workshop level", () => {
  it("is valid and registered after the ink marsh", () => {
    expect(validateLevel(L)).toEqual([]);
    expect(LEVELS).toContain(L);
    expect(nextLevel("ink-marsh")).toBe(L);
    expect(nextLevel("kirigami-workshop")?.id).toBe("paper-sea");
  });

  it("has the dash, no glider, soft and tough walls, archer and enemies", () => {
    expect(L.dash).toBe(true);
    expect(L.noGlide).toBe(true);
    expect(L.cuts?.some((c) => c.tough)).toBe(true);
    expect(L.cuts?.some((c) => !c.tough)).toBe(true);
    expect(L.archers?.length).toBeGreaterThan(0);
    expect(L.enemies.length).toBeGreaterThan(0);
  });

  it("the gaps are wider than a plain jump but within reach of jump + dash", () => {
    const plain = (2 * tuning.player.jumpVelocity * tuning.player.runSpeed) / tuning.player.gravity;
    for (const g of [gap1, gap2]) {
      const width = g.far - g.edge;
      expect(width).toBeGreaterThan(plain);
      expect(width).toBeLessThan(plain + dashDistance() + 80);
    }
  });
});

describe("the gaps", () => {
  it.each([
    ["first", gap1],
    ["second", gap2],
  ])("%s gap: a plain jump never crosses it", (_n, g) => {
    expect(window(L, g, "plain")).toBe(0);
  });

  it.each([
    ["first", gap1],
    ["second", gap2],
  ])("%s gap: jump + dash crosses with a forgiving takeoff window", (_n, g) => {
    expect(window(L, g, "dash")).toBeGreaterThanOrEqual(60);
  });

  it("holding Jump to glide does not help: the glider is off in the workshop", () => {
    const r = simulate(
      L,
      400,
      440,
      { jumpAt: (s) => s.x >= 690 && s.onGround, hold: () => true, swordCuts: true },
      60 * 8,
    );
    expect(r.trace.some((s) => s.state === "glide")).toBe(false);
    expect(r.fell).toBe(true);
  });
});

describe("paper walls", () => {
  const soft = L.cuts?.find((c) => !c.tough);
  const tough = L.cuts?.find((c) => c.tough);

  it("a soft wall blocks the ninja until it is cut with the sword", () => {
    expect(soft).toBeDefined();
    if (!soft) return;
    const blocked = simulate(L, 300, 440, { hold: () => false }, 60 * 4);
    expect(blocked.final.x).toBeLessThan(soft.x);
    const cut = simulate(L, 300, 440, { hold: () => false, swordCuts: true }, 60 * 4);
    expect(cut.final.x).toBeGreaterThan(soft.x + soft.width);
  });

  it("a tough wall ignores the sword and falls only to the dash", () => {
    expect(tough).toBeDefined();
    if (!tough) return;
    const start = tough.x - 300;
    const sword = simulate(L, start, 440, { hold: () => false, swordCuts: true }, 60 * 4);
    expect(sword.final.x).toBeLessThan(tough.x);
    const dash = simulate(
      L,
      start,
      440,
      { hold: () => false, swordCuts: true, dashAt: (s) => s.x >= tough.x - 60 },
      60 * 4,
    );
    expect(dash.final.x).toBeGreaterThan(tough.x + tough.width);
  });

  it("validator catches a floating wall and a tough wall without the dash", () => {
    const l: LevelDef = structuredClone(L);
    l.cuts?.push({ x: 800, y: 300, width: 20, height: 100 });
    expect(validateLevel(l).some((m) => m.includes("cut") && m.includes("not standing"))).toBe(
      true,
    );
    const noDash: LevelDef = structuredClone(L);
    noDash.dash = false;
    expect(validateLevel(noDash).some((m) => m.includes("without the dash"))).toBe(true);
  });
});

describe("dash controller", () => {
  it("fires on the second tap inside the window, not on a single tap", () => {
    const c = new DashController();
    expect(c.press(true)).toBe(false);
    c.update(tuning.dash.doubleTapMs - 10, true);
    expect(c.press(true)).toBe(true);
  });

  it("two taps too far apart do not dash", () => {
    const c = new DashController();
    c.press(true);
    c.update(tuning.dash.doubleTapMs + 10, true);
    expect(c.press(true)).toBe(false);
  });

  it("has a cooldown, and the next double tap needs two fresh taps", () => {
    const c = new DashController();
    c.press(true);
    expect(c.press(true)).toBe(true);
    // Третій тап одразу не рахується як початок нового подвійного
    expect(c.press(true)).toBe(false);
    expect(c.press(true)).toBe(false);
    c.update(tuning.dash.cooldownMs + 1, true);
    c.press(true);
    expect(c.press(true)).toBe(true);
  });

  it("allows one dash per airtime and refreshes on landing", () => {
    const c = new DashController();
    c.press(false);
    expect(c.press(false)).toBe(true);
    c.update(tuning.dash.cooldownMs + 1, false);
    c.press(false);
    expect(c.press(false)).toBe(false);
    c.update(16, true);
    c.update(tuning.dash.cooldownMs + 1, true);
    c.press(true);
    expect(c.press(true)).toBe(true);
  });
});

describe("dash state", () => {
  it("flies horizontally at dash speed without falling, in the pressed direction", () => {
    const s = new DashState();
    const ctx = ctxOf({
      onGround: false,
      vy: 300,
      facing: 1,
      input: { ...emptyInput(), left: true },
    });
    s.enter(ctx);
    expect(ctx.facing).toBe(-1);
    expect(ctx.vx).toBe(-tuning.dash.speed);
    expect(ctx.vy).toBe(0);
    ctx.vy = 500;
    s.update(ctx);
    expect(ctx.vy).toBe(0);
  });

  it("ends after its duration: fall in the air, idle or run on the ground", () => {
    const run = (ctx: PlayerContext) => {
      const s = new DashState();
      s.enter(ctx);
      let next: string | null = null;
      for (let i = 0; i < 60 && next === null; i++) next = s.update(ctx);
      return next;
    };
    expect(run(ctxOf({ onGround: false }))).toBe("fall");
    expect(run(ctxOf())).toBe("idle");
    expect(run(ctxOf({ input: { ...emptyInput(), right: true } }))).toBe("run");
  });

  it("covers the advertised distance", () => {
    expect(dashDistance()).toBeCloseTo((tuning.dash.speed * tuning.dash.durationMs) / 1000, 5);
    expect(dashDistance()).toBeGreaterThan(100);
  });
});

describe("glider switch", () => {
  it("falling with Jump held folds into the glider unless the level disables it", () => {
    const hold = { ...emptyInput(), jumpHeld: true };
    const run = (glideDisabled: boolean) => {
      const s = new FallState();
      const ctx = ctxOf({ onGround: false, vy: 300, input: hold, glideDisabled });
      s.enter();
      let next: string | null = null;
      for (let i = 0; i < 30 && next === null; i++) next = s.update(ctx);
      return next;
    };
    expect(run(false)).toBe("glide");
    expect(run(true)).toBeNull();
  });
});
