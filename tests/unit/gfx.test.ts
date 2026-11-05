import { describe, expect, it } from "vitest";
import { glider, PUPPET_POSES, puppetFigure } from "../../src/gfx/ninja.ts";
import { dark, light } from "../../src/theme/tokens.ts";

describe("puppet poses", () => {
  const names = Object.keys(PUPPET_POSES);

  it("has every frame the game uses", () => {
    for (const n of [
      "idle",
      "idle2",
      "run0",
      "run1",
      "run2",
      "run3",
      "jump",
      "fall",
      "attack",
      "fold",
      "hurt",
    ]) {
      expect(names).toContain(n);
    }
  });

  it("the run cycle has four frames with different leg angles", () => {
    const legs = ["run0", "run1", "run2", "run3"].map(
      (n) => `${PUPPET_POSES[n as "run0"].backLeg}/${PUPPET_POSES[n as "run0"].frontLeg}`,
    );
    expect(new Set(legs).size).toBe(4);
  });

  it("every pose renders valid, palette-coloured SVG in both themes", () => {
    for (const p of [light, dark]) {
      for (const n of names) {
        const svg = puppetFigure(p, PUPPET_POSES[n as keyof typeof PUPPET_POSES]);
        expect(svg).toContain("<polygon");
        expect(svg).toContain(p.accent);
        expect(svg).not.toContain("NaN");
        expect(svg).not.toContain("undefined");
      }
    }
  });

  it("the attack pose swings the sword forward; other poses keep it on the back", () => {
    expect(PUPPET_POSES.attack.swordAngle).toBeGreaterThan(30);
    expect("swordAngle" in PUPPET_POSES.idle).toBe(false);
  });

  it("the glider is a pure shape with the palette accent", () => {
    expect(glider(light)).toContain(light.accent);
    expect(glider(dark)).toContain(dark.ink);
  });
});
