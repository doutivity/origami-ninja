import { describe, expect, it } from "vitest";
import { emptyInput, type InputState } from "../../src/game/input/input-state.ts";
import type { PlayerContext, StateName } from "../../src/game/player/context.ts";
import { StateMachine } from "../../src/game/player/state-machine.ts";
import { DeadState } from "../../src/game/player/states/dead.ts";
import { FallState } from "../../src/game/player/states/fall.ts";
import { GlideState } from "../../src/game/player/states/glide.ts";
import { HurtState } from "../../src/game/player/states/hurt.ts";
import { IdleState } from "../../src/game/player/states/idle.ts";
import { JumpState } from "../../src/game/player/states/jump.ts";
import { RunState } from "../../src/game/player/states/run.ts";
import { tuning } from "../../src/game/tuning.ts";

const t = tuning.player;
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
      new HurtState(),
      new DeadState(),
    ],
    initial,
  );

describe("ground movement", () => {
  it("idle → run when a direction is held", () => {
    const m = machine("idle");
    m.update(ctx({ input: input({ right: true }) }));
    expect(m.name).toBe("run");
  });

  it("run → idle when the direction is released", () => {
    const m = machine("run");
    m.update(ctx({ vx: 100 }));
    expect(m.name).toBe("idle");
  });

  it("accelerates to runSpeed and no further", () => {
    const m = machine("idle");
    const c = ctx({ input: input({ right: true }) });
    for (let i = 0; i < 60; i++) m.update(c);
    expect(c.vx).toBe(t.runSpeed);
  });

  it("opposite directions cancel out", () => {
    const m = machine("idle");
    const c = ctx({ input: input({ left: true, right: true }) });
    m.update(c);
    expect(m.name).toBe("idle");
    expect(c.vx).toBe(0);
  });

  it("walking off an edge goes to fall", () => {
    const m = machine("run");
    m.update(ctx({ onGround: false, input: input({ right: true }) }));
    expect(m.name).toBe("fall");
  });

  it("turns to face the held direction", () => {
    const m = machine("idle");
    const c = ctx({ input: input({ left: true }) });
    m.update(c);
    expect(c.facing).toBe(-1);
  });
});

describe("jumping", () => {
  it("jumps from the ground when a press is buffered", () => {
    const m = machine("idle");
    const c = ctx({ jumpBufferMs: 0 });
    m.update(c);
    expect(m.name).toBe("jump");
    expect(c.vy).toBe(-t.jumpVelocity);
  });

  it("variable height: releasing Jump cuts the ascent once", () => {
    const m = machine("idle");
    const c = ctx({ jumpBufferMs: 0 });
    m.update(c);
    c.onGround = false;
    c.jumpBufferMs = Number.POSITIVE_INFINITY;
    c.input = input({ jumpHeld: false });
    m.update(c);
    expect(c.vy).toBeCloseTo(-t.jumpVelocity * t.jumpCut);
    const after = c.vy;
    m.update(c);
    expect(c.vy).toBe(after);
  });

  it("holding Jump keeps the full ascent", () => {
    const m = machine("idle");
    const c = ctx({ jumpBufferMs: 0 });
    m.update(c);
    c.onGround = false;
    c.input = input({ jumpHeld: true });
    for (let i = 0; i < 5; i++) m.update(c);
    expect(c.vy).toBe(-t.jumpVelocity);
  });

  it("jump → fall at the apex", () => {
    const m = machine("idle");
    const c = ctx({ jumpBufferMs: 0 });
    m.update(c);
    c.onGround = false;
    c.vy = 10;
    m.update(c);
    expect(m.name).toBe("fall");
  });

  it("no double jump", () => {
    const m = machine("idle");
    const c = ctx({ jumpBufferMs: 0 });
    m.update(c);
    c.onGround = false;
    c.jumpBufferMs = 0;
    c.input = input({ jumpHeld: true });
    m.update(c);
    expect(c.vy).toBe(-t.jumpVelocity);
    expect(m.name).toBe("jump");
  });
});

describe("coyote time and input buffer", () => {
  it("can jump shortly after leaving a ledge", () => {
    const m = machine("fall");
    m.update(ctx({ onGround: false, coyoteMs: t.coyoteMs - 10, jumpBufferMs: 0 }));
    expect(m.name).toBe("jump");
  });

  it("cannot jump after the coyote window", () => {
    const m = machine("fall");
    m.update(ctx({ onGround: false, coyoteMs: t.coyoteMs + 10, jumpBufferMs: 0 }));
    expect(m.name).toBe("fall");
  });

  it("a press just before landing is remembered", () => {
    const m = machine("fall");
    m.update(ctx({ onGround: true, jumpBufferMs: t.jumpBufferMs - 20, vy: 300 }));
    expect(m.name).toBe("jump");
  });

  it("an old press is forgotten", () => {
    const m = machine("fall");
    m.update(ctx({ onGround: true, jumpBufferMs: t.jumpBufferMs + 50, vy: 300 }));
    expect(m.name).toBe("idle");
  });

  it("landing with a direction held goes to run", () => {
    const m = machine("fall");
    m.update(ctx({ input: input({ right: true }), vy: 300 }));
    expect(m.name).toBe("run");
  });

  it("falling speed is clamped", () => {
    const m = machine("fall");
    const c = ctx({ onGround: false, vy: 5000, coyoteMs: 9999 });
    m.update(c);
    expect(c.vy).toBe(t.maxFallSpeed);
  });
});

describe("glide", () => {
  const holdFall = (m: StateMachine, c: PlayerContext, ms: number) => {
    for (let elapsed = 0; elapsed < ms; elapsed += 1000 / 60) m.update(c);
  };

  it("holding Jump while falling folds into a plane after holdMs", () => {
    const m = machine("fall");
    const c = ctx({ onGround: false, vy: 200, coyoteMs: 9999, input: input({ jumpHeld: true }) });
    holdFall(m, c, tuning.glide.holdMs - 30);
    expect(m.name).toBe("fall");
    holdFall(m, c, 60);
    expect(m.name).toBe("glide");
  });

  it("a tap is not enough to glide", () => {
    const m = machine("fall");
    const c = ctx({ onGround: false, vy: 200, coyoteMs: 9999, input: input({ jumpHeld: true }) });
    holdFall(m, c, 50);
    c.input = input({ jumpHeld: false });
    holdFall(m, c, 200);
    expect(m.name).toBe("fall");
  });

  it("does not glide while still rising or falling too slowly", () => {
    const m = machine("fall");
    const c = ctx({
      onGround: false,
      vy: tuning.glide.minFallSpeed - 10,
      coyoteMs: 9999,
      input: input({ jumpHeld: true }),
    });
    holdFall(m, c, 500);
    expect(m.name).toBe("fall");
  });

  it("releasing Jump leaves the glide", () => {
    const m = machine("glide");
    m.update(ctx({ onGround: false, input: input({ jumpHeld: false }) }));
    expect(m.name).toBe("fall");
  });

  it("landing ends the glide", () => {
    const m = machine("glide");
    m.update(ctx({ onGround: true, input: input({ jumpHeld: true }) }));
    expect(m.name).toBe("idle");
  });

  it("flies in the facing direction at the neutral speed", () => {
    const m = machine("glide");
    const c = ctx({ onGround: false, facing: -1, input: input({ jumpHeld: true }) });
    for (let i = 0; i < 120; i++) m.update(c);
    expect(c.vx).toBe(-tuning.glide.speed.neutral);
    expect(c.vy).toBe(tuning.glide.fall.neutral);
  });

  it("updraft lifts the glider", () => {
    const m = machine("glide");
    const c = ctx({ onGround: false, inWind: true, vy: 100, input: input({ jumpHeld: true }) });
    for (let i = 0; i < 60; i++) m.update(c);
    expect(c.vy).toBeLessThan(0);
  });
});

describe("hurt and dead", () => {
  it("hurt lasts stunMs then returns to idle on the ground", () => {
    const m = machine("idle");
    const c = ctx({ vx: 200 });
    m.transition("hurt", c);
    for (let elapsed = 0; elapsed < tuning.health.stunMs - 50; elapsed += 1000 / 60) m.update(c);
    expect(m.name).toBe("hurt");
    for (let i = 0; i < 10; i++) m.update(c);
    expect(m.name).toBe("idle");
  });

  it("hurt ignores player input", () => {
    const m = machine("idle");
    const c = ctx({ input: input({ right: true, jumpHeld: true }), jumpBufferMs: 0 });
    m.transition("hurt", c);
    m.update(c);
    expect(m.name).toBe("hurt");
    expect(c.vy).toBe(0);
  });

  it("hurt in the air returns to fall", () => {
    const m = machine("idle");
    const c = ctx({ onGround: false });
    m.transition("hurt", c);
    for (let i = 0; i < 40; i++) m.update(c);
    expect(m.name).toBe("fall");
  });

  it("dead is terminal and stops horizontal motion", () => {
    const m = machine("idle");
    const c = ctx({ vx: 150, input: input({ right: true, jumpHeld: true }), jumpBufferMs: 0 });
    m.transition("dead", c);
    m.update(c);
    expect(m.name).toBe("dead");
    expect(c.vx).toBe(0);
  });
});

describe("StateMachine", () => {
  it("throws on an unknown state", () => {
    const m = machine("idle");
    expect(() => m.transition("nope" as StateName, ctx())).toThrow(/Unknown state/);
  });

  it("throws on an unknown initial state", () => {
    expect(() => new StateMachine([new IdleState()], "run")).toThrow();
  });
});
