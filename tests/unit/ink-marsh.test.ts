// Чорнильна заплава: дані рівня, сповільнення чорнилом і панцир черепахи.
import { describe, expect, it } from "vitest";
import { groundRunSpeed, inkBox, jumpSpeed } from "../../src/game/ink/ink-model.ts";
import { emptyInput } from "../../src/game/input/input-state.ts";
import { LEVELS, nextLevel } from "../../src/game/level/index.ts";
import { inkMarsh } from "../../src/game/level/ink-marsh.ts";
import type { LevelDef } from "../../src/game/level/types.ts";
import { validateLevel } from "../../src/game/level/validate.ts";
import type { PlayerContext } from "../../src/game/player/context.ts";
import { ShellGuard, shellWanted } from "../../src/game/player/shell-model.ts";
import { IdleState } from "../../src/game/player/states/idle.ts";
import { RunState } from "../../src/game/player/states/run.ts";
import { ShellState } from "../../src/game/player/states/shell.ts";
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

describe("ink marsh level", () => {
  it("is valid and registered after the canyon", () => {
    expect(validateLevel(inkMarsh)).toEqual([]);
    expect(LEVELS).toContain(inkMarsh);
    expect(nextLevel("midnight-canyon")).toBe(inkMarsh);
    expect(nextLevel("ink-marsh")).toBeNull();
  });

  it("has ink, the shell form, archers and enemies", () => {
    expect(inkMarsh.shell).toBe(true);
    expect(inkMarsh.inks?.length).toBeGreaterThan(0);
    expect(inkMarsh.archers?.length).toBeGreaterThan(0);
    expect(inkMarsh.enemies.length).toBeGreaterThan(0);
  });

  it("every ink pool lies on one platform", () => {
    for (const k of inkMarsh.inks ?? []) {
      const lies = inkMarsh.platforms.some(
        (p) => p.y === k.y && k.x >= p.x && k.x + k.width <= p.x + p.width,
      );
      expect(lies).toBe(true);
    }
  });

  it("validator catches ink floating over a gap", () => {
    const l: LevelDef = structuredClone(inkMarsh);
    l.inks = [{ x: 1180, y: 440, width: 200 }];
    expect(validateLevel(l).some((m) => m.includes("not lying on one platform"))).toBe(true);
  });
});

describe("ink slows the ninja", () => {
  it("runs and jumps worse in ink", () => {
    expect(groundRunSpeed(true)).toBeLessThan(groundRunSpeed(false) / 2);
    expect(jumpSpeed(true)).toBeLessThan(jumpSpeed(false));
  });

  it("the ink band hugs the ground, not the air above it", () => {
    const b = inkBox({ x: 100, y: 440, width: 200 });
    expect(b.y).toBeGreaterThan(440 - 40);
    expect(b.y + b.height).toBeGreaterThan(440);
  });

  it("crossing the first pool takes much longer than dry ground", () => {
    const pool = inkMarsh.inks?.[0];
    expect(pool).toBeDefined();
    if (!pool) return;
    const dry = pool.width / groundRunSpeed(false);
    const wet = pool.width / groundRunSpeed(true);
    expect(wet).toBeGreaterThan(dry * 2.5);
  });

  it("simulated: running through ink covers far less ground than running on dry land", () => {
    const run = (startX: number) =>
      simulate(inkMarsh, startX, 440, { hold: () => false }, 60 * 3).final.x - startX;
    // 600…1160 — чорнило; 0…300 — суха земля
    const wet = run(640);
    const dry = run(40);
    expect(wet).toBeLessThan(dry * 0.6);
  });

  it("simulated: a jump from ink is much lower than from dry ground", () => {
    const apex = (startX: number, takeoff: number) => {
      const r = simulate(
        inkMarsh,
        startX,
        440,
        { jumpAt: (s) => s.x >= takeoff && s.onGround, hold: () => false },
        60 * 2,
      );
      return 440 - r.apex;
    };
    expect(apex(640, 700)).toBeLessThan(apex(100, 200) * 0.6);
  });
});

describe("shell form", () => {
  it("is requested only when enabled, ready, grounded and held long enough", () => {
    const base = { enabled: true, ready: true, onGround: true, attackHeldMs: tuning.shell.holdMs };
    expect(shellWanted(base)).toBe(true);
    expect(shellWanted({ ...base, enabled: false })).toBe(false);
    expect(shellWanted({ ...base, ready: false })).toBe(false);
    expect(shellWanted({ ...base, onGround: false })).toBe(false);
    expect(shellWanted({ ...base, attackHeldMs: tuning.shell.holdMs - 1 })).toBe(false);
  });

  it("idle and run fold into the shell when requested", () => {
    const ctx = ctxOf({ shellRequested: true });
    expect(new IdleState().update(ctx)).toBe("shell");
    expect(new RunState().update(ctxOf({ shellRequested: true }))).toBe("shell");
    expect(new IdleState().update(ctxOf())).toBeNull();
  });

  it("the shell walks at a constant speed, ignoring ink, and cannot jump", () => {
    const state = new ShellState();
    const ctx = ctxOf({
      inInk: true,
      input: { ...emptyInput(), right: true, attackHeld: true, jumpHeld: true, jumpPressed: true },
    });
    for (let i = 0; i < 60; i++) expect(state.update(ctx)).toBeNull();
    expect(ctx.vx).toBeCloseTo(tuning.shell.speed, 0);
    expect(ctx.vy).toBe(0);
    // У чорнилі панцир швидший за звичайний біг
    expect(tuning.shell.speed).toBeGreaterThan(groundRunSpeed(true));
  });

  it("unfolds when Attack is released, the shell cracks or the ground is lost", () => {
    const s = new ShellState();
    expect(s.update(ctxOf({ input: { ...emptyInput(), attackHeld: false } }))).toBe("idle");
    expect(
      s.update(
        ctxOf({ input: { ...emptyInput(), attackHeld: true, right: true }, shellReady: false }),
      ),
    ).toBe("run");
    expect(s.update(ctxOf({ onGround: false, input: { ...emptyInput(), attackHeld: true } }))).toBe(
      "fall",
    );
  });

  it("the guard blocks exactly one hit, then cracks for the cooldown", () => {
    const g = new ShellGuard();
    expect(g.ready).toBe(true);
    expect(g.block()).toBe(true);
    expect(g.ready).toBe(false);
    expect(g.block()).toBe(false);
    g.update(tuning.shell.cooldownMs - 1);
    expect(g.ready).toBe(false);
    g.update(2);
    expect(g.ready).toBe(true);
    g.block();
    g.reset();
    expect(g.ready).toBe(true);
  });
});
