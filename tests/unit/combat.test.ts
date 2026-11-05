import { describe, expect, it } from "vitest";
import { AttackTimer } from "../../src/game/combat/attack.ts";
import {
  burnAfter,
  burnedPolygon,
  burnStep,
  emberPolygon,
  ragged,
} from "../../src/game/combat/burn.ts";
import { boxesOverlap, swordHitbox } from "../../src/game/combat/geometry.ts";
import { blinkVisible, Health } from "../../src/game/combat/health.ts";
import { patrolDirection } from "../../src/game/enemies/patrol.ts";
import { tuning } from "../../src/game/tuning.ts";

describe("Health", () => {
  it("starts full at 100 HP", () => {
    expect(new Health().hp).toBe(100);
  });

  it("takes damage and grants invulnerability", () => {
    const h = new Health();
    expect(h.damage(20)).toBe(true);
    expect(h.hp).toBe(80);
    expect(h.invulnerableMs).toBe(tuning.health.invulnerableMs);
  });

  it("ignores hits during invulnerability", () => {
    const h = new Health();
    h.damage(20);
    expect(h.damage(20)).toBe(false);
    expect(h.hp).toBe(80);
  });

  it("invulnerability lasts one second", () => {
    const h = new Health();
    h.damage(20);
    h.update(999);
    expect(h.invulnerable).toBe(true);
    h.update(2);
    expect(h.invulnerable).toBe(false);
    expect(h.damage(20)).toBe(true);
  });

  it("clamps at 0 and reports dead", () => {
    const h = new Health();
    h.damage(500);
    expect(h.hp).toBe(0);
    expect(h.dead).toBe(true);
    expect(h.damage(1)).toBe(false);
  });

  it("drain (fire) ignores invulnerability and does not start it", () => {
    const h = new Health();
    h.damage(20);
    h.drain(10);
    expect(h.hp).toBe(70);
    const fresh = new Health();
    fresh.drain(10);
    expect(fresh.invulnerable).toBe(false);
  });

  it("fire kills from full health in about three seconds", () => {
    const seconds = 100 / tuning.fire.damagePerSecond;
    expect(seconds).toBeGreaterThan(2.5);
    expect(seconds).toBeLessThan(3.2);
  });

  it("reset restores health", () => {
    const h = new Health();
    h.damage(60);
    h.reset();
    expect(h.hp).toBe(100);
    expect(h.invulnerable).toBe(false);
  });

  it("blinks only while invulnerable", () => {
    expect(blinkVisible(0)).toBe(true);
    const states = new Set([1000, 940, 880, 820, 760].map((ms) => blinkVisible(ms)));
    expect(states.size).toBe(2);
  });
});

describe("AttackTimer", () => {
  const { windupMs, activeMs, recoverMs } = tuning.attack;

  it("goes windup → active → recover → idle", () => {
    const a = new AttackTimer();
    expect(a.start()).toBe(true);
    expect(a.phase).toBe("windup");
    a.update(windupMs);
    expect(a.phase).toBe("active");
    a.update(activeMs);
    expect(a.phase).toBe("recover");
    a.update(recoverMs);
    expect(a.phase).toBe("idle");
  });

  it("only the active phase has a hitbox", () => {
    const a = new AttackTimer();
    a.start();
    expect(a.active).toBe(false);
    a.update(windupMs);
    expect(a.active).toBe(true);
  });

  it("cannot restart in the middle of a swing", () => {
    const a = new AttackTimer();
    a.start();
    expect(a.start()).toBe(false);
  });

  it("every swing gets a new number", () => {
    const a = new AttackTimer();
    a.start();
    const first = a.swing;
    a.update(windupMs + activeMs + recoverMs);
    a.start();
    expect(a.swing).toBe(first + 1);
  });

  it("phaseProgress goes from 0 to 1 within the phase", () => {
    const a = new AttackTimer();
    a.start();
    a.update(windupMs);
    a.update(activeMs / 2);
    expect(a.phaseProgress).toBeCloseTo(0.5);
  });
});

describe("sword hitbox", () => {
  const body = { x: 100, y: 100, width: 20, height: 60 };

  it("extends in front of the player (right)", () => {
    const h = swordHitbox(body, 1);
    expect(h.x).toBeGreaterThan(body.x + body.width - 20);
    expect(h.x + h.width).toBeGreaterThan(body.x + body.width + 50);
  });

  it("mirrors to the left", () => {
    const h = swordHitbox(body, -1);
    expect(h.x).toBeLessThan(body.x - 50);
    expect(h.x + h.width).toBeLessThan(body.x + body.width);
  });

  it("is vertically centred on the body", () => {
    const h = swordHitbox(body, 1);
    expect(Math.abs(h.y + h.height / 2 - (body.y + body.height / 2))).toBeLessThan(10);
  });

  it("hits an enemy in reach but not one out of reach", () => {
    const h = swordHitbox(body, 1);
    expect(boxesOverlap(h, { x: 170, y: 110, width: 40, height: 40 })).toBe(true);
    expect(boxesOverlap(h, { x: 400, y: 110, width: 40, height: 40 })).toBe(false);
  });

  it("boxesOverlap is false for touching edges", () => {
    expect(
      boxesOverlap({ x: 0, y: 0, width: 10, height: 10 }, { x: 10, y: 0, width: 10, height: 10 }),
    ).toBe(false);
  });
});

describe("enemy patrol", () => {
  it("turns at the right and left ends", () => {
    expect(patrolDirection(600, 100, 600, 1)).toBe(-1);
    expect(patrolDirection(100, 100, 600, -1)).toBe(1);
  });

  it("keeps going inside the range", () => {
    expect(patrolDirection(300, 100, 600, 1)).toBe(1);
    expect(patrolDirection(300, 100, 600, -1)).toBe(-1);
  });

  it("an enemy dies after exactly two hits", () => {
    expect(tuning.enemy.hp).toBe(2);
    expect(tuning.enemy.contactDamage).toBe(20);
  });
});

describe("burning", () => {
  it("grows with damage relative to max HP", () => {
    expect(burnAfter(0, 35, 100)).toBeCloseTo(0.35);
    expect(burnAfter(0.35, 35, 100)).toBeCloseTo(0.7);
  });

  it("is capped at 1 and never decreases", () => {
    expect(burnAfter(0.9, 50, 100)).toBe(1);
    expect(burnAfter(0.4, 0, 100)).toBe(0.4);
  });

  it("mask step: 0 when unburnt, at least 1 for the tiniest burn, max at full", () => {
    expect(burnStep(0)).toBe(0);
    expect(burnStep(0.001)).toBe(1);
    expect(burnStep(1)).toBe(tuning.burn.steps);
  });

  it("mask step is monotonic", () => {
    const steps = Array.from({ length: 101 }, (_, i) => burnStep(i / 100));
    for (let i = 1; i < steps.length; i++)
      expect(steps[i]).toBeGreaterThanOrEqual(steps[i - 1] as number);
  });

  it("the burnt edge creeps upwards with the step", () => {
    const y = (step: number) => (ragged(step, 16)[8] as [number, number])[1];
    expect(y(14)).toBeLessThan(y(2));
  });

  it("masks are deterministic and closed polygons", () => {
    expect(burnedPolygon(5, 16)).toBe(burnedPolygon(5, 16));
    expect(burnedPolygon(3, 16).startsWith("0,128")).toBe(true);
    expect(burnedPolygon(3, 16).endsWith("128,128")).toBe(true);
    expect(emberPolygon(5, 16).split(" ").length).toBeGreaterThan(10);
  });

  it("particle pools have hard limits in tuning", () => {
    expect(tuning.particles.maxPerFire).toBeGreaterThan(0);
    expect(tuning.particles.maxPerFire).toBeLessThanOrEqual(40);
    expect(tuning.particles.maxOnPlayer).toBeLessThanOrEqual(40);
    expect(tuning.wind.maxPerZone).toBeLessThanOrEqual(40);
  });
});
