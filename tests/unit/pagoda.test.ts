import { describe, expect, it } from "vitest";
import { archerSees } from "../../src/game/enemies/archer-vision.ts";
import { initialBeam, stepBeam } from "../../src/game/hazards/beam-cycle.ts";
import { riseTop } from "../../src/game/hazards/rise.ts";
import { emptyInput, type InputState } from "../../src/game/input/input-state.ts";
import { burningPagoda } from "../../src/game/level/burning-pagoda.ts";
import { getLevel, LEVELS, nextLevel } from "../../src/game/level/index.ts";
import { canReach, jumpHeight, reachableSet } from "../../src/game/level/reach.ts";
import type { LevelDef } from "../../src/game/level/types.ts";
import { validateLevel } from "../../src/game/level/validate.ts";
import type { PlayerContext, StateName } from "../../src/game/player/context.ts";
import { chargeFraction, leapVelocity } from "../../src/game/player/frog-model.ts";
import { StateMachine } from "../../src/game/player/state-machine.ts";
import { ChargeState } from "../../src/game/player/states/charge.ts";
import { DeadState } from "../../src/game/player/states/dead.ts";
import { FallState } from "../../src/game/player/states/fall.ts";
import { GlideState } from "../../src/game/player/states/glide.ts";
import { HurtState } from "../../src/game/player/states/hurt.ts";
import { IdleState } from "../../src/game/player/states/idle.ts";
import { JumpState } from "../../src/game/player/states/jump.ts";
import { RunState } from "../../src/game/player/states/run.ts";
import { tuning } from "../../src/game/tuning.ts";

const input = (o: Partial<InputState> = {}): InputState => ({ ...emptyInput(), ...o });
const ctx = (o: Partial<PlayerContext> = {}): PlayerContext => ({
  input: input(),
  dt: 1 / 60,
  onGround: true,
  vx: 0,
  vy: 0,
  coyoteMs: 0,
  jumpBufferMs: Number.POSITIVE_INFINITY,
  inWind: false,
  facing: 1,
  frogEnabled: true,
  groundHeldMs: 0,
  ...o,
});
const machine = (initial: StateName) =>
  new StateMachine(
    [
      new IdleState(),
      new RunState(),
      new JumpState(),
      new FallState(),
      new GlideState(),
      new ChargeState(),
      new HurtState(),
      new DeadState(),
    ],
    initial,
  );

describe("level registry", () => {
  it("lists the pagoda after the bamboo river", () => {
    expect(LEVELS.map((l) => l.id).slice(0, 3)).toEqual([
      "mountain",
      "bamboo-river",
      "burning-pagoda",
    ]);
    expect(nextLevel("bamboo-river")?.id).toBe("burning-pagoda");
    expect(nextLevel("burning-pagoda")?.id).toBe("midnight-canyon");
    expect(getLevel("burning-pagoda")).toBe(burningPagoda);
  });
});

describe("burning pagoda level", () => {
  it("is valid", () => {
    expect(validateLevel(burningPagoda)).toEqual([]);
  });

  it("is vertical, taller than the screen, with the finish above the spawn", () => {
    expect(burningPagoda.vertical).toBe(true);
    expect(burningPagoda.height).toBeGreaterThan(tuning.view.height * 2);
    expect(burningPagoda.finish.y).toBeLessThan(burningPagoda.spawn.y);
  });

  it("the finish needs the frog: unreachable by plain jumps, reachable with the leap", () => {
    const l = burningPagoda;
    const at = (x: number, y: number) =>
      l.platforms.find((p) => x >= p.x && x <= p.x + p.width && p.y === y);
    const start = at(l.spawn.x, l.spawn.y);
    const goal = at(l.finish.x, l.finish.y);
    if (!start || !goal) throw new Error("spawn or finish platform missing");
    expect(reachableSet(l.platforms, start, tuning.player.jumpVelocity).has(goal)).toBe(false);
    expect(reachableSet(l.platforms, start, tuning.frog.maxLeap).has(goal)).toBe(true);
  });

  it("every beam lands on a platform and every archer stands on one", () => {
    expect(validateLevel(burningPagoda).filter((e) => /beam|archer/.test(e))).toEqual([]);
    expect(burningPagoda.beams?.length).toBeGreaterThan(0);
    expect(burningPagoda.archers?.length).toBeGreaterThan(0);
  });

  it("validation catches a pagoda the frog cannot finish", () => {
    const broken: LevelDef = {
      ...burningPagoda,
      platforms: burningPagoda.platforms.map((p) => (p.y === 170 ? { ...p, y: 20 } : p)),
      finish: { ...burningPagoda.finish, y: 20 },
    };
    expect(validateLevel(broken).join()).toContain("unreachable");
  });

  it("validation catches a beam without a landing platform", () => {
    const broken: LevelDef = {
      ...burningPagoda,
      beams: [{ x: 5, topY: 100, landY: 300, intervalMs: 1000, offsetMs: 0 }],
    };
    expect(validateLevel(broken).join()).toContain("does not land on a platform");
  });
});

describe("jump reach geometry", () => {
  const pl = (x: number, y: number, w = 100) => ({ x, y, width: w, height: 22 });
  it("a plain jump clears ~100 px but not 220 px", () => {
    expect(canReach(pl(0, 500), pl(0, 400), tuning.player.jumpVelocity)).toBe(true);
    expect(canReach(pl(0, 500), pl(0, 280), tuning.player.jumpVelocity)).toBe(false);
  });
  it("the max frog leap clears 260 px", () => {
    expect(canReach(pl(0, 500), pl(0, 240), tuning.frog.maxLeap)).toBe(true);
    expect(jumpHeight(tuning.frog.maxLeap)).toBeGreaterThan(260);
  });
  it("a too-wide gap is not crossable", () => {
    expect(canReach(pl(0, 500), pl(600, 500), tuning.player.jumpVelocity)).toBe(false);
  });
});

describe("frog leap model", () => {
  it("charge fraction is clamped to 0…1", () => {
    expect(chargeFraction(-10)).toBe(0);
    expect(chargeFraction(tuning.frog.chargeMs / 2)).toBeCloseTo(0.5);
    expect(chargeFraction(99999)).toBe(1);
  });
  it("leap velocity grows from min to max with the charge", () => {
    expect(leapVelocity(0)).toBe(tuning.frog.minLeap);
    expect(leapVelocity(1)).toBe(tuning.frog.maxLeap);
    expect(leapVelocity(0.5)).toBeGreaterThan(tuning.frog.minLeap);
  });
});

describe("frog states", () => {
  it("a long hold on the ground starts the charge", () => {
    const m = machine("idle");
    m.update(ctx({ input: input({ jumpHeld: true }), groundHeldMs: tuning.frog.chargeStartMs }));
    expect(m.name).toBe("charge");
  });

  it("a short hold does not charge yet", () => {
    const m = machine("idle");
    m.update(ctx({ input: input({ jumpHeld: true }), groundHeldMs: 40 }));
    expect(m.name).toBe("idle");
  });

  it("a tap jumps on release, with the usual jump velocity", () => {
    const m = machine("idle");
    const c = ctx({ jumpTap: true });
    m.update(c);
    expect(m.name).toBe("jump");
    expect(c.vy).toBe(-tuning.player.jumpVelocity);
  });

  it("a tap jump keeps its full height even though Jump is already released", () => {
    const m = machine("idle");
    const c = ctx({ jumpTap: true });
    m.update(c); // → jump
    c.onGround = false;
    c.jumpTap = false;
    m.update(c);
    expect(c.vy).toBe(-tuning.player.jumpVelocity);
  });

  it("releasing Jump in the charge leaps; a full charge beats a short one", () => {
    const leap = (frames: number): number => {
      const m = machine("charge");
      const c = ctx({ input: input({ jumpHeld: true }) });
      for (let i = 0; i < frames; i++) m.update(c);
      c.input = input();
      m.update(c);
      expect(m.name).toBe("jump");
      return c.vy;
    };
    const short = leap(5);
    const full = leap(60);
    expect(full).toBeLessThan(short); // більш від'ємне — швидше вгору
    expect(full).toBeCloseTo(-tuning.frog.maxLeap, 0);
  });

  it("the leap is not cut when Jump is already released", () => {
    const m = machine("charge");
    const c = ctx({ input: input({ jumpHeld: true }) });
    for (let i = 0; i < 60; i++) m.update(c);
    c.input = input();
    m.update(c); // → jump
    const vy = c.vy;
    c.onGround = false;
    m.update(c);
    expect(c.vy).toBe(vy);
  });

  it("without the frog ability a press jumps immediately, as before", () => {
    const m = machine("idle");
    const c = ctx({ frogEnabled: false, jumpBufferMs: 0 });
    m.update(c);
    expect(m.name).toBe("jump");
  });

  it("the charge holds position: horizontal speed decays to zero", () => {
    const m = machine("charge");
    const c = ctx({ vx: 200, input: input({ jumpHeld: true }) });
    for (let i = 0; i < 40; i++) m.update(c);
    expect(c.vx).toBe(0);
  });
});

describe("beam cycle", () => {
  const prm = { topY: 0, landY: 200, height: 24, speed: 600, warnMs: 500, intervalMs: 3000 };
  it("goes wait → warn → fall → impact → wait", () => {
    let s = initialBeam(100);
    let impacts = 0;
    const phases: string[] = [s.phase];
    for (let i = 0; i < 400; i++) {
      const r = stepBeam(s, 16, prm);
      s = r.state;
      if (r.impact) impacts++;
      if (phases.at(-1) !== s.phase) phases.push(s.phase);
    }
    expect(phases.slice(0, 4)).toEqual(["wait", "warn", "fall", "wait"]);
    expect(impacts).toBeGreaterThanOrEqual(1);
  });
  it("waits the interval between impacts", () => {
    let s = initialBeam(0);
    let last = -1;
    const gaps: number[] = [];
    for (let i = 0; i < 1000; i++) {
      const r = stepBeam(s, 16, prm);
      s = r.state;
      if (r.impact) {
        if (last >= 0) gaps.push((i - last) * 16);
        last = i;
      }
    }
    expect(gaps.length).toBeGreaterThan(0);
    for (const g of gaps) expect(g).toBeGreaterThanOrEqual(prm.intervalMs + prm.warnMs);
  });
});

describe("rising fire", () => {
  it("stays put during the delay, then climbs at the tuned speed", () => {
    expect(riseTop(1000, 0)).toBe(1000);
    expect(riseTop(1000, tuning.rise.delayMs)).toBe(1000);
    expect(riseTop(1000, tuning.rise.delayMs + 1000)).toBeCloseTo(1000 - tuning.rise.speed);
  });
  it("is slower than the player's average climb, so the level is winnable", () => {
    // Підйом ~100 px за ≈1 с: стіна (34 px/с) відстає, якщо не зупинятись надовго
    expect(tuning.rise.speed).toBeLessThan(100);
  });
});

describe("archer", () => {
  it("sees a target in range and not too far above or below", () => {
    expect(archerSees(300, 10)).toBe(true);
    expect(archerSees(-300, -20)).toBe(true);
    expect(archerSees(tuning.archer.range + 1, 0)).toBe(false);
    expect(archerSees(100, tuning.archer.reachY + 1)).toBe(false);
  });
});
