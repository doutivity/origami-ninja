import { describe, expect, it } from "vitest";
import { pressedButtons, touchLayout } from "../../src/game/input/touch.ts";
import { tuning } from "../../src/game/tuning.ts";

const layout = touchLayout();
const centre = (id: string) => {
  const b = layout.find((x) => x.id === id);
  if (!b) throw new Error(id);
  return { x: b.x + b.w / 2, y: b.y + b.h / 2 };
};

describe("touch layout", () => {
  it("has the four buttons: ←, →, Jump, Attack", () => {
    expect(layout.map((b) => b.label).sort()).toEqual(["Attack", "Jump", "←", "→"].sort());
  });

  it("stays inside the 960×540 view", () => {
    for (const b of layout) {
      expect(b.x).toBeGreaterThanOrEqual(0);
      expect(b.y).toBeGreaterThanOrEqual(0);
      expect(b.x + b.w).toBeLessThanOrEqual(tuning.view.width);
      expect(b.y + b.h).toBeLessThanOrEqual(tuning.view.height);
    }
  });

  it("move buttons are on the left, action buttons on the right", () => {
    const x = (id: string) => centre(id).x;
    expect(x("left")).toBeLessThan(x("right"));
    expect(x("right")).toBeLessThan(480);
    expect(x("attack")).toBeGreaterThan(480);
    expect(x("jump")).toBeGreaterThan(x("attack"));
  });

  it("buttons do not overlap each other", () => {
    for (const a of layout) {
      for (const b of layout) {
        if (a === b) continue;
        const overlap = a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
        expect(overlap).toBe(false);
      }
    }
  });
});

describe("pressedButtons (multi-touch)", () => {
  it("no touches, nothing pressed", () => {
    expect(pressedButtons(layout, []).size).toBe(0);
  });

  it("run + jump + attack at once with three fingers", () => {
    const p = pressedButtons(layout, [centre("right"), centre("jump"), centre("attack")]);
    expect([...p].sort()).toEqual(["attack", "jump", "right"]);
  });

  it("one finger presses only one button", () => {
    const l = centre("left");
    const r = centre("right");
    const between = { x: (l.x + r.x) / 2 + 3, y: l.y };
    expect(pressedButtons(layout, [between]).size).toBe(1);
  });

  it("two fingers on the same button count once", () => {
    expect([...pressedButtons(layout, [centre("jump"), centre("jump")])]).toEqual(["jump"]);
  });

  it("the hit area is a little larger than the drawn button", () => {
    const b = layout.find((x) => x.id === "jump");
    if (!b) throw new Error("jump");
    const justOutside = { x: b.x + b.w + tuning.touch.hitPadding - 1, y: b.y + b.h / 2 };
    expect(pressedButtons(layout, [justOutside]).has("jump")).toBe(true);
    const farOutside = { x: b.x + b.w + tuning.touch.hitPadding + 40, y: b.y - 200 };
    expect(pressedButtons(layout, [farOutside]).size).toBe(0);
  });

  it("a finger sliding from one button to another changes the pressed one", () => {
    expect([...pressedButtons(layout, [centre("left")])]).toEqual(["left"]);
    expect([...pressedButtons(layout, [centre("right")])]).toEqual(["right"]);
  });
});
