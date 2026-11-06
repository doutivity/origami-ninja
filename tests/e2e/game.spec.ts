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
  // Чекаємо на умови, а не на секунди: на повільному CI ігровий час тече повільніше за стіновий
  await expect.poll(async () => (await pos()).state, { timeout: 15_000 }).toBe("idle");
  const start = await pos();
  await page.keyboard.down("ArrowRight");
  await expect.poll(async () => (await pos()).x, { timeout: 15_000 }).toBeGreaterThan(start.x + 80);
  expect((await pos()).state).toBe("run");
  await page.keyboard.up("ArrowRight");

  // Спершу гравець зупиняється на землі, потім стрибає
  await expect.poll(async () => (await pos()).state, { timeout: 15_000 }).toBe("idle");
  const ground = await pos();
  await page.keyboard.down("Space");
  await expect.poll(async () => (await pos()).y, { timeout: 15_000 }).toBeLessThan(ground.y - 20);
  await page.keyboard.up("Space");
});

test("fire hurts, a death overlay appears and R respawns", async ({ page, isMobile }) => {
  test.skip(isMobile, "keyboard flow is covered on desktop");
  // Вогонь вбиває за ≈3 с ігрового часу; на повільному CI це може тривати помітно довше
  test.setTimeout(120_000);
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
    { timeout: 60_000 },
  );
  // Оверлей кілька сотень мс ігнорує вхід (захист від випадкового пропуску), тож натискаємо R,
  // поки гра не відродиться: на повільному CI «кілька сотень мс» ігрового часу можуть бути секундами
  const respawned = () =>
    page.evaluate(() => {
      const g = window.__origami.scene.getScene("GameScene") as unknown as {
        registry: { get(k: string): unknown };
        player?: { health: { hp: number } };
      };
      return g.registry.get("overlay") === null && g.player?.health.hp === 100;
    });
  await expect
    .poll(
      async () => {
        await page.keyboard.down("r");
        await page.waitForTimeout(80);
        await page.keyboard.up("r");
        return respawned();
      },
      { timeout: 60_000, intervals: [300] },
    )
    .toBe(true);
});

test("Bamboo River: the boat climbs out of the water onto the bank", async ({ page, isMobile }) => {
  test.skip(isMobile, "keyboard flow is covered on desktop");
  test.setTimeout(90_000);
  await page.goto("play/?debug=1");
  await waitForGame(page);

  type Scene = {
    scene: { restart(): void };
    registry: { set(k: string, v: unknown): void };
    player?: {
      x: number;
      y: number;
      inWater: boolean;
      body: { blocked: { down: boolean } };
      setPosition(x: number, y: number): void;
    };
  };
  const state = () =>
    page.evaluate(() => {
      const p = (window.__origami.scene.getScene("GameScene") as unknown as Scene).player;
      return p ? { x: p.x, y: p.y, inWater: p.inWater, grounded: p.body.blocked.down } : null;
    });

  // Перемикаємося на рівень 2 і чекаємо, поки сцена створить гравця заново
  await page.evaluate(() => {
    const g = window.__origami.scene.getScene("GameScene") as unknown as Scene;
    g.registry.set("levelId", "bamboo-river");
    g.registry.set("checkpoint", -1);
    g.scene.restart();
  });

  // Кидаємо гравця в першу протоку (вода 680…1220, поверхня y=450) біля лівого берега
  await expect
    .poll(
      async () => {
        await page.evaluate(() => {
          const g = window.__origami.scene.getScene("GameScene") as unknown as Scene;
          if (g.player && g.player.x < 600) g.player.setPosition(740, 400);
        });
        return (await state())?.inWater ?? false;
      },
      { timeout: 30_000, intervals: [200] },
    )
    .toBe(true);

  // Пливемо ліворуч: човник упирається в берег і має вилізти на нього сам
  await page.keyboard.down("ArrowLeft");
  await expect
    .poll(
      async () => {
        const s = await state();
        return !!s && !s.inWater && s.grounded && s.x < 680 && s.y < 450;
      },
      { timeout: 45_000, intervals: [200] },
    )
    .toBe(true);
  await page.keyboard.up("ArrowLeft");
});

test("Burning Pagoda: the frog leap reaches a high ledge and the fire wall climbs", async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, "keyboard flow is covered on desktop");
  test.setTimeout(120_000);
  await page.goto("play/?debug=1");
  await waitForGame(page);

  type Scene = {
    scene: { restart(): void };
    registry: { set(k: string, v: unknown): void };
    rise?: { topY: number };
    player?: {
      x: number;
      y: number;
      charge: number;
      machine: { name: string };
      body: { blocked: { down: boolean } };
      setPosition(x: number, y: number): void;
    };
  };
  const snap = () =>
    page.evaluate(() => {
      const g = window.__origami.scene.getScene("GameScene") as unknown as Scene;
      const p = g.player;
      return p
        ? {
            x: p.x,
            y: p.y,
            charge: p.charge,
            state: p.machine.name,
            grounded: p.body.blocked.down,
            wall: g.rise?.topY ?? null,
          }
        : null;
    });

  await page.evaluate(() => {
    const g = window.__origami.scene.getScene("GameScene") as unknown as Scene;
    g.registry.set("levelId", "burning-pagoda");
    g.registry.set("checkpoint", -1);
    g.scene.restart();
  });
  // Стіна вогню існує на цьому рівні й стоїть нижче за гравця
  await expect.poll(async () => (await snap())?.wall ?? null, { timeout: 30_000 }).not.toBeNull();
  await page.screenshot({ path: "test-results/pagoda-start.png" });

  // Телепортуємо на карниз біля чекпоінта (верх 1700) просто під високим карнизом (верх 1480)
  const standOnLedge = async () => {
    await page.evaluate(() => {
      const g = window.__origami.scene.getScene("GameScene") as unknown as Scene;
      g.player?.setPosition(700, 1700 - 40);
    });
  };
  await expect
    .poll(
      async () => {
        const s = await snap();
        if (s && !(s.grounded && s.y > 1600 && s.y < 1700)) await standOnLedge();
        return !!s && s.grounded && Math.abs(s.y - (1700 - 36)) < 12;
      },
      { timeout: 30_000, intervals: [200] },
    )
    .toBe(true);

  // Заряджаємо стрибок до максимуму, далі стрибаємо вліво на карниз 220 px вище (звичайний стрибок — лише ~136)
  await page.keyboard.down("Space");
  await expect
    .poll(async () => (await snap())?.charge ?? 0, { timeout: 30_000, intervals: [100] })
    .toBeGreaterThan(0.95);
  await page.screenshot({ path: "test-results/pagoda-charge.png" });
  await page.keyboard.down("ArrowLeft");
  await page.keyboard.up("Space");
  await expect
    .poll(
      async () => {
        const s = await snap();
        return !!s && s.grounded && s.y < 1500 && s.y > 1400 && s.x > 400 && s.x < 660;
      },
      { timeout: 30_000, intervals: [100] },
    )
    .toBe(true);
  await page.keyboard.up("ArrowLeft");
  await page.screenshot({ path: "test-results/pagoda-ledge.png" });

  // Стіна вогню піднімається (після затримки)
  const wall0 = (await snap())?.wall ?? 0;
  await expect
    .poll(async () => (await snap())?.wall ?? wall0, { timeout: 60_000, intervals: [500] })
    .toBeLessThan(wall0 - 5);
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
