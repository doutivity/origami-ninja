import { beforeEach, describe, expect, it } from "vitest";
import {
  getGovernor,
  getQuality,
  initQuality,
  isQualityForced,
  parseQualityParam,
  QualityGovernor,
  qualityProfile,
  setQuality,
} from "../../src/game/quality.ts";
import { tuning } from "../../src/game/tuning.ts";

const q = tuning.quality;

/** Подає кадри заданої тривалості, поки не мине ms; повертає перший результат "downgrade". */
function run(g: QualityGovernor, frameMs: number, totalMs: number): "downgrade" | null {
  for (let t = 0; t < totalMs; t += frameMs) {
    if (g.update(frameMs) === "downgrade") return "downgrade";
  }
  return null;
}

describe("quality selection", () => {
  beforeEach(() => initQuality(""));

  it("defaults to high with automatic switching", () => {
    expect(getQuality()).toBe("high");
    expect(isQualityForced()).toBe(false);
  });

  it("?quality=low forces low", () => {
    initQuality("?quality=low");
    expect(getQuality()).toBe("low");
    expect(isQualityForced()).toBe(true);
  });

  it("?quality=high forces high", () => {
    initQuality("?debug=1&quality=high");
    expect(getQuality()).toBe("high");
    expect(isQualityForced()).toBe(true);
  });

  it("ignores unknown values", () => {
    expect(parseQualityParam("?quality=ultra")).toBeNull();
    expect(parseQualityParam("")).toBeNull();
    expect(parseQualityParam("?quality=low")).toBe("low");
  });

  it("low reduces particles, render scale and effects", () => {
    const hi = qualityProfile("high");
    const lo = qualityProfile("low");
    expect(lo.particleScale).toBeLessThan(hi.particleScale);
    expect(lo.renderScaleMax).toBeLessThan(hi.renderScaleMax);
    expect(lo.shadows).toBe(false);
    expect(hi.shadows).toBe(true);
    expect(lo.burnFilters).toBe(false);
  });

  it("render scale on high is capped at 2", () => {
    expect(qualityProfile("high").renderScaleMax).toBeLessThanOrEqual(2);
  });

  it("setQuality switches the profile in use", () => {
    setQuality("low");
    expect(qualityProfile().shadows).toBe(false);
  });

  it("the governor is shared between scene restarts", () => {
    initQuality("");
    expect(getGovernor()).toBe(getGovernor());
    const old = getGovernor();
    initQuality("");
    expect(getGovernor()).not.toBe(old);
  });
});

describe("QualityGovernor", () => {
  it("downgrades when the average FPS stays under the threshold for the window", () => {
    const g = new QualityGovernor("high", true);
    // ~40 FPS
    expect(run(g, 25, q.warmupMs + q.windowMs + 500)).toBe("downgrade");
    expect(g.lastFps).toBeLessThan(q.fpsThreshold);
  });

  it("keeps high at a steady 60 FPS", () => {
    const g = new QualityGovernor("high", true);
    expect(run(g, 1000 / 60, 20_000)).toBeNull();
  });

  it("does not judge during the warm-up", () => {
    const g = new QualityGovernor("high", true);
    expect(run(g, 40, q.warmupMs - 100)).toBeNull();
  });

  it("needs a full window before it decides", () => {
    const g = new QualityGovernor("high", true);
    run(g, 40, q.warmupMs);
    expect(run(g, 40, q.windowMs - 200)).toBeNull();
  });

  it("ignores very long frames (pauses, tab switches) and restarts the window", () => {
    const g = new QualityGovernor("high", true);
    run(g, 1000 / 60, q.warmupMs + 1000);
    expect(g.update(q.maxFrameMs + 1)).toBeNull();
    expect(run(g, 1000 / 60, q.windowMs * 3)).toBeNull();
  });

  it("never downgrades when quality is forced (auto = false)", () => {
    const g = new QualityGovernor("high", false);
    expect(run(g, 50, 20_000)).toBeNull();
  });

  it("does nothing once on low", () => {
    const g = new QualityGovernor("low", true);
    expect(run(g, 50, 20_000)).toBeNull();
  });

  it("downgrades only once", () => {
    const g = new QualityGovernor("high", true);
    expect(run(g, 40, 10_000)).toBe("downgrade");
    expect(run(g, 40, 10_000)).toBeNull();
  });

  it("threshold is 55 FPS over a 2 second window", () => {
    expect(q.fpsThreshold).toBe(55);
    expect(q.windowMs).toBe(2000);
  });
});
