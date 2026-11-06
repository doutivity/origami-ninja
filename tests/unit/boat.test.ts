import { describe, expect, it } from "vitest";
import { tuning } from "../../src/game/tuning.ts";
import { type BoatStepIn, stepBoat } from "../../src/game/water/boat-motion.ts";

const base = (over: Partial<BoatStepIn> = {}): BoatStepIn => ({
  input: { left: false, right: false, jumpPressed: false },
  blockedLeft: false,
  blockedRight: false,
  vx: 0,
  bodyY: 100,
  targetY: 100,
  waterSpeed: 0,
  dt: 1 / 60,
  ...over,
});
const jumpVy = -tuning.player.jumpVelocity * 0.95;

describe("stepBoat", () => {
  it("floats: no exit, spring pulls toward the surface", () => {
    const r = stepBoat(base({ bodyY: 90, targetY: 100 }));
    expect(r.exit).toBe(false);
    expect(r.vy).toBeGreaterThan(0);
  });

  it("is carried by the current when idle", () => {
    const r = stepBoat(base({ waterSpeed: 90 }));
    expect(r.vx).toBeGreaterThan(0);
  });

  it("jump button exits the water", () => {
    const r = stepBoat(base({ input: { left: false, right: false, jumpPressed: true } }));
    expect(r.exit).toBe(true);
    expect(r.vy).toBe(jumpVy);
  });

  it("auto-climbs when pushing into a bank on the right", () => {
    const r = stepBoat(
      base({ input: { left: false, right: true, jumpPressed: false }, blockedRight: true }),
    );
    expect(r.exit).toBe(true);
    expect(r.vy).toBe(jumpVy);
    expect(r.vx).toBe(tuning.boat.speed);
  });

  it("auto-climbs when pushing into a bank on the left", () => {
    const r = stepBoat(
      base({ input: { left: true, right: false, jumpPressed: false }, blockedLeft: true }),
    );
    expect(r.exit).toBe(true);
    expect(r.vx).toBe(-tuning.boat.speed);
  });

  it("does not climb when touching a wall without pushing into it", () => {
    expect(stepBoat(base({ blockedRight: true })).exit).toBe(false);
    const r = stepBoat(
      base({ input: { left: true, right: false, jumpPressed: false }, blockedRight: true }),
    );
    expect(r.exit).toBe(false);
  });
});
