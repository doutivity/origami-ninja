import { describe, expect, it } from "vitest";
import { glideStep, glideTarget, type Tilt, tiltOf } from "../../src/game/player/glide-model.ts";
import { tuning } from "../../src/game/tuning.ts";

const flight = (tilt: Tilt) => {
  let vx = 0;
  let vy = 0;
  let x = 0;
  let y = 0;
  let t = 0;
  const dt = 1 / 60;
  while (y < 300 && t < 60) {
    ({ vx, vy } = glideStep(vx, vy, 1, tilt, false, dt));
    x += vx * dt;
    y += vy * dt;
    t += dt;
  }
  return { t, x };
};

describe("glide tilt", () => {
  it("↑ is up, ↓ is down, none or both is neutral", () => {
    expect(tiltOf({ up: true, down: false })).toBe("up");
    expect(tiltOf({ up: false, down: true })).toBe("down");
    expect(tiltOf({ up: false, down: false })).toBe("neutral");
    expect(tiltOf({ up: true, down: true })).toBe("neutral");
  });

  it("down: faster and lower; up: slower", () => {
    expect(glideTarget("down").fall).toBeGreaterThan(glideTarget("neutral").fall);
    expect(glideTarget("down").speed).toBeGreaterThan(glideTarget("neutral").speed);
    expect(glideTarget("up").fall).toBeLessThan(glideTarget("neutral").fall);
    expect(glideTarget("up").speed).toBeLessThan(glideTarget("neutral").speed);
  });

  it("nose up stays in the air longest, nose down the shortest", () => {
    const up = flight("up");
    const neutral = flight("neutral");
    const down = flight("down");
    expect(up.t).toBeGreaterThan(neutral.t);
    expect(neutral.t).toBeGreaterThan(down.t);
  });
});

describe("glide physics", () => {
  it("speeds approach the targets and stop there", () => {
    expect(
      glideStep(tuning.glide.speed.neutral, tuning.glide.fall.neutral, 1, "neutral", false, 1),
    ).toEqual({
      vx: tuning.glide.speed.neutral,
      vy: tuning.glide.fall.neutral,
    });
  });

  it("flies left when facing left", () => {
    expect(glideStep(0, 0, -1, "neutral", false, 1).vx).toBeLessThan(0);
  });

  it("an updraft turns falling into rising", () => {
    expect(glideStep(0, 100, 1, "neutral", true, 0.5).vy).toBeLessThan(0);
  });

  it("an updraft never exceeds windLift", () => {
    let vy = 0;
    for (let i = 0; i < 300; i++) vy = glideStep(0, vy, 1, "neutral", true, 1 / 60).vy;
    expect(vy).toBe(-tuning.glide.windLift);
  });

  it("the level gap cannot be jumped but is crossed by gliding", () => {
    const airtime = (2 * tuning.player.jumpVelocity) / tuning.player.gravity;
    const plainJump = tuning.player.runSpeed * airtime;
    expect(plainJump).toBeLessThan(340);
  });
});
