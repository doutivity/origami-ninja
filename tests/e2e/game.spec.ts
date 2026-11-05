import { expect, test } from "@playwright/test";
import { collectErrors, preDecline, waitForGame } from "./helpers.ts";

type Origami = { scene: { getScene(k: string): Record<string, unknown> } };
declare global {
  interface Window {
    __origami: Origami;
    __sceneHistory?: string[];
  }
}

test.beforeEach(async ({ page }) => {
  await preDecline(page);
});

test("the game starts: canvas appears and BootScene hands over to GameScene", async ({ page }) => {
  const errors = collectErrors(page);
  await page.addInitScript(() => {
    const history: string[] = [];
    window.__sceneHistory = history;
    document.addEventListener("DOMContentLoaded", () => {
      const el = document.getElementById("game");
      if (!el) return;
      new MutationObserver(() => {
        const s = el.dataset.scene;
        if (s && history.at(-1) !== s) history.push(s);
      }).observe(el, { attributes: true, attributeFilter: ["data-scene"] });
    });
  });
  await page.goto("play/?debug=1");
  await expect(page.locator("#game canvas")).toBeVisible();
  await waitForGame(page);
  const history = (await page.evaluate(() => window.__sceneHistory)) ?? [];
  expect(history).toContain("BootScene");
  expect(history).toContain("GameScene");
  expect(history.indexOf("BootScene")).toBeLessThan(history.indexOf("GameScene"));
  expect(errors).toEqual([]);
});

test("the keyboard moves the ninja and Space jumps", async ({ page, isMobile }) => {
  test.skip(isMobile, "keyboard controls are covered on desktop");
  await page.goto("play/?debug=1");
  await waitForGame(page);
  const pos = () =>
    page.evaluate(() => {
      const p = (
        window.__origami.scene.getScene("GameScene") as {
          player: { x: number; y: number; machine: { name: string } };
        }
      ).player;
      return { x: p.x, y: p.y, state: p.machine.name };
    });
  await page.waitForTimeout(400);
  const start = await pos();
  await page.keyboard.down("ArrowRight");
  await page.waitForTimeout(600);
  const running = await pos();
  await page.keyboard.up("ArrowRight");
  expect(running.x).toBeGreaterThan(start.x + 80);
  expect(running.state).toBe("run");

  await page.waitForTimeout(500);
  const ground = await pos();
  await page.keyboard.down("Space");
  await page.waitForTimeout(250);
  const air = await pos();
  await page.keyboard.up("Space");
  expect(air.y).toBeLessThan(ground.y - 20);
});

test("fire hurts, a death overlay appears and R respawns", async ({ page, isMobile }) => {
  test.skip(isMobile, "keyboard flow is covered on desktop");
  await page.goto("play/?debug=1");
  await waitForGame(page);
  await page.evaluate(() => {
    const g = window.__origami.scene.getScene("GameScene") as {
      player: { setPosition(x: number, y: number): void };
    };
    g.player.setPosition(1540, 403);
  });
  await page.waitForFunction(
    () =>
      (
        window.__origami.scene.getScene("GameScene") as unknown as {
          registry: { get(k: string): unknown };
        }
      ).registry.get("overlay") !== null,
    undefined,
    { timeout: 8000 },
  );
  await page.waitForTimeout(600);
  await page.keyboard.down("r");
  await page.waitForTimeout(80);
  await page.keyboard.up("r");
  await page.waitForFunction(
    () => {
      const g = window.__origami.scene.getScene("GameScene") as unknown as {
        registry: { get(k: string): unknown };
        player?: { health: { hp: number } };
      };
      return g.registry.get("overlay") === null && g.player?.health.hp === 100;
    },
    undefined,
    { timeout: 8000 },
  );
});

test.describe("mobile", () => {
  test.skip(({ isMobile }) => !isMobile, "touch controls need a phone profile");

  test("shows the Rotate hint in portrait and hides it in landscape", async ({ page }) => {
    await page.goto("play/");
    await expect(page.locator(".rotate-hint")).toBeVisible();
    await page.setViewportSize({ width: 915, height: 412 });
    await expect(page.locator(".rotate-hint")).toBeHidden();
  });

  test("the four touch buttons are present", async ({ page }) => {
    await page.setViewportSize({ width: 915, height: 412 });
    await page.goto("play/?debug=1");
    await waitForGame(page);
    const ids = await page.evaluate(() => {
      const ui = window.__origami.scene.getScene("UIScene") as unknown as {
        buttons: { id: string; label: string }[];
      };
      return ui.buttons.map((b) => b.label);
    });
    expect(ids.sort()).toEqual(["Attack", "Jump", "←", "→"].sort());
  });

  test("multi-touch: run, jump and attack at the same time", async ({ page, context }) => {
    await page.setViewportSize({ width: 915, height: 412 });
    await page.goto("play/?debug=1");
    await waitForGame(page);
    await page.waitForTimeout(500);
    const rect = await page.evaluate(() => {
      const r = (
        document.querySelector("#game canvas") as HTMLCanvasElement
      ).getBoundingClientRect();
      return { x: r.x, y: r.y, w: r.width, h: r.height };
    });
    const at = (lx: number, ly: number, id: number) => ({
      x: rect.x + (lx / 960) * rect.w,
      y: rect.y + (ly / 540) * rect.h,
      id,
    });
    const cdp = await context.newCDPSession(page);
    const RIGHT = [188, 464] as const;
    const JUMP = [884, 464] as const;
    const ATTACK = [772, 464] as const;
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [at(...RIGHT, 1), at(...JUMP, 2), at(...ATTACK, 3)],
    });
    await page.waitForTimeout(250);
    const touch = await page.evaluate(() => {
      const g = window.__origami.scene.getScene("GameScene") as unknown as {
        hub: { touch: Record<string, boolean> };
        player: { x: number; machine: { name: string } };
      };
      return { buttons: { ...g.hub.touch }, x: g.player.x, state: g.player.machine.name };
    });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    expect(touch.buttons.right).toBe(true);
    expect(touch.buttons.jump).toBe(true);
    expect(touch.buttons.attack).toBe(true);
    expect(touch.x).toBeGreaterThan(95);
    await page.waitForTimeout(300);
    const released = await page.evaluate(
      () =>
        (
          window.__origami.scene.getScene("GameScene") as unknown as {
            hub: { touch: Record<string, boolean> };
          }
        ).hub.touch,
    );
    expect(Object.values(released).every((v) => v === false)).toBe(true);
  });
});
