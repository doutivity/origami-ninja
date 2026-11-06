// Паперове море: хвилі, риби-стрибуни, вітрило проти течії й дані рівня.
import { describe, expect, it } from "vitest";
import { fishPose } from "../../src/game/enemies/fish-model.ts";
import { LEVELS, nextLevel } from "../../src/game/level/index.ts";
import { paperSea } from "../../src/game/level/paper-sea.ts";
import type { LevelDef, WaterDef } from "../../src/game/level/types.ts";
import { validateLevel } from "../../src/game/level/validate.ts";
import { tuning } from "../../src/game/tuning.ts";
import { type BoatStepIn, stepBoat } from "../../src/game/water/boat-motion.ts";
import { crestRise, surfaceAngle, surfaceY } from "../../src/game/water/wave-model.ts";

const wave = { amp: 20, length: 300, speed: 2 };
const sea: WaterDef = {
  x: 0,
  y: 450,
  width: 800,
  height: 90,
  wave,
};
const flat: WaterDef = { x: 0, y: 450, width: 800, height: 90 };

describe("paper sea level", () => {
  it("is valid and registered", () => {
    expect(validateLevel(paperSea)).toEqual([]);
    expect(LEVELS).toContain(paperSea);
    expect(nextLevel("kirigami-workshop")).toBe(paperSea);
    expect(nextLevel("paper-sea")?.id).toBe("quiet-fold");
  });

  it("has waves, fish and the sail", () => {
    expect(paperSea.sail).toBe(true);
    expect(paperSea.waters?.every((w) => w.wave)).toBe(true);
    expect(paperSea.fishes?.length).toBeGreaterThan(0);
  });

  it("every fish jumps above a sea", () => {
    for (const f of paperSea.fishes ?? [])
      expect(paperSea.waters?.some((w) => f.x >= w.x && f.x <= w.x + w.width)).toBe(true);
  });

  it("the second sea runs against the boat: stronger than rowing, weaker than the sail", () => {
    const second = paperSea.waters?.[1];
    const against = Math.abs(second?.currentSpeed ?? 0);
    expect(second?.currentSpeed).toBeLessThan(0);
    expect(against).toBeGreaterThan(tuning.boat.speed);
    expect(against).toBeLessThan(tuning.boat.sailSpeed - 60);
  });

  it("the first sea is gentle: rowing alone makes headway", () => {
    expect(paperSea.waters?.[0]?.currentSpeed ?? 0).toBeGreaterThanOrEqual(0);
  });
});

describe("waves", () => {
  it("a flat water stays at its level and has no slope", () => {
    expect(surfaceY(flat, 123, 5000)).toBe(450);
    expect(surfaceAngle(flat, 123, 5000)).toBe(0);
    expect(crestRise(flat)).toBe(0);
  });

  it("the surface stays within ±amp and really moves", () => {
    const ys: number[] = [];
    for (let t = 0; t < 4000; t += 50) ys.push(surfaceY(sea, 100, t));
    expect(Math.max(...ys)).toBeLessThanOrEqual(450 + 20 + 1e-9);
    expect(Math.min(...ys)).toBeGreaterThanOrEqual(450 - 20 - 1e-9);
    expect(Math.max(...ys) - Math.min(...ys)).toBeGreaterThan(30);
  });

  it("is periodic in x with the wavelength, and travels in time", () => {
    expect(surfaceY(sea, 70, 1234)).toBeCloseTo(surfaceY(sea, 370, 1234), 6);
    expect(surfaceY(sea, 70, 0)).not.toBeCloseTo(surfaceY(sea, 70, 400), 1);
  });

  it("the slope is the derivative: zero at crests, steepest between", () => {
    // sin(k x) має екстремум там, де cos = 0
    const k = (Math.PI * 2) / wave.length;
    const xPeak = Math.PI / 2 / k;
    expect(surfaceAngle(sea, xPeak, 0)).toBeCloseTo(0, 6);
    expect(Math.abs(surfaceAngle(sea, 0, 0))).toBeGreaterThan(0.2);
  });

  it("the boat spring keeps up with the wave", () => {
    // Максимальна вертикальна швидкість хвилі має бути помітно меншою, ніж може дати пружина човника
    const w = wave;
    expect(w.amp * w.speed).toBeLessThan(tuning.boat.speed);
    for (const water of paperSea.waters ?? []) {
      const ww = water.wave ?? wave;
      // Пружина vy = (target - y) * 8: відставання = vy_хвилі / 8, має бути в межах пари пікселів
      expect((ww.amp * ww.speed) / 8).toBeLessThan(10);
    }
  });
});

describe("jumping fish", () => {
  const f = tuning.fish;

  it("hides under the water most of the time and leaps once per period", () => {
    let air = 0;
    let steps = 0;
    for (let t = 0; t < f.periodMs; t += 20) {
      steps++;
      if (fishPose(t, 100, 450, 0).airborne) air++;
    }
    expect(air / steps).toBeCloseTo(f.leapMs / f.periodMs, 1);
  });

  it("the arc peaks in the middle at the configured height and starts and ends at the surface", () => {
    expect(fishPose(f.leapMs / 2, 100, 450, 0).y).toBeCloseTo(450 - f.height, 5);
    expect(fishPose(1, 100, 450, 0).y).toBeCloseTo(450, -1);
    expect(fishPose(f.leapMs - 1, 100, 450, 0).y).toBeCloseTo(450, -1);
  });

  it("is below the surface when not leaping and drifts in its direction", () => {
    expect(fishPose(f.leapMs + 100, 100, 450, 0).y).toBeGreaterThan(450);
    const early = fishPose(100, 100, 450, 0, 1).x;
    const late = fishPose(f.leapMs - 100, 100, 450, 0, 1).x;
    expect(late).toBeGreaterThan(early);
    expect(fishPose(f.leapMs - 100, 100, 450, 0, -1).x).toBeLessThan(
      fishPose(100, 100, 450, 0, -1).x,
    );
  });

  it("offsets desynchronise fish", () => {
    expect(fishPose(0, 100, 450, 0).airborne).toBe(true);
    expect(fishPose(0, 100, 450, 1500).airborne).toBe(false);
  });
});

describe("sail", () => {
  const base = (over: Partial<BoatStepIn> = {}): BoatStepIn => ({
    input: { left: false, right: true, jumpPressed: false },
    blockedLeft: false,
    blockedRight: false,
    vx: 0,
    bodyY: 100,
    targetY: 100,
    waterSpeed: -230,
    dt: 1 / 60,
    ...over,
  });
  const settle = (over: Partial<BoatStepIn>) => {
    let vx = 0;
    for (let i = 0; i < 180; i++) vx = stepBoat(base({ ...over, vx })).vx;
    return vx;
  };

  it("without the sail the headwind wins: the boat drifts backwards", () => {
    expect(settle({})).toBeLessThan(0);
  });

  it("with the sail the boat makes headway against the same current", () => {
    expect(settle({ sail: true })).toBeGreaterThan(40);
  });

  it("with no steering the sail drives the boat in the facing direction", () => {
    const idle = { left: false, right: false, jumpPressed: false };
    expect(settle({ input: idle, sail: true, facing: 1, waterSpeed: 0 })).toBeGreaterThan(300);
    expect(settle({ input: idle, sail: true, facing: -1, waterSpeed: 0 })).toBeLessThan(-300);
    expect(settle({ input: idle, sail: false, facing: 1, waterSpeed: 0 })).toBeCloseTo(0, 3);
  });

  it("leaves the exit mechanics alone", () => {
    const r = stepBoat(
      base({ sail: true, input: { left: false, right: false, jumpPressed: true } }),
    );
    expect(r.exit).toBe(true);
  });
});

describe("validator: sea mistakes", () => {
  const clone = (): LevelDef => structuredClone(paperSea);

  it("fish above dry land", () => {
    const l = clone();
    l.fishes?.push({ x: 100 });
    expect(validateLevel(l).some((m) => m.includes("not above a water zone"))).toBe(true);
  });

  it("a broken wave and a sail without water", () => {
    const l = clone();
    const w = l.waters?.[0];
    if (w?.wave) w.wave.length = 0;
    expect(validateLevel(l).some((m) => m.includes("bad wave"))).toBe(true);
    const dry = clone();
    dry.waters = [];
    dry.fishes = [];
    expect(validateLevel(dry)).toContain("sail on a level without water");
  });
});
