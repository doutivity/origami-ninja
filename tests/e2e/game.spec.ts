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
    riseMs: number;
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

  // На повільному CI стіна вогню встигає дійти до ніндзя, поки тест чекає: стіна рахується від
  // респавну, тож скидаємо її таймер після телепорту (далі перевіряємо, що вона все одно лізе вгору)
  await page.evaluate(() => {
    const g = window.__origami.scene.getScene("GameScene") as unknown as Scene;
    g.riseMs = 0;
  });

  // Заряджаємо стрибок до максимуму, далі стрибаємо вліво на карниз 220 px вище (звичайний стрибок — лише ~136)
  await page.keyboard.down("Space");
  await expect
    .poll(async () => (await snap())?.charge ?? 0, { timeout: 30_000, intervals: [100] })
    .toBeGreaterThan(0.95);
  await page.screenshot({ path: "test-results/pagoda-charge.png" });
  // Стрибок приземляє ніндзя біля лівого краю карниза (400…660), тож утримання ← до кінця
  // скидає його вниз, якщо тест запізнюється. Відпускаємо ← у самій грі, щойно ніндзя проминув x=600:
  // решта інерції лишає його на карнизі незалежно від частоти кадрів.
  await page.evaluate(() => {
    const g = window.__origami.scene.getScene("GameScene") as unknown as Scene & {
      events: { on(e: string, fn: () => void): void };
    };
    let released = false;
    g.events.on("update", () => {
      if (released || !g.player || g.player.x >= 600) return;
      released = true;
      window.dispatchEvent(
        new KeyboardEvent("keyup", { code: "ArrowLeft", key: "ArrowLeft", keyCode: 37 }),
      );
    });
  });
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

test("Midnight Canyon: a sword hit on the weathervane wakes the wind tunnel", async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, "keyboard flow is covered on desktop");
  test.setTimeout(90_000);
  const errors = collectErrors(page);
  await page.goto("play/?debug=1");
  await waitForGame(page);

  type Scene = {
    scene: { restart(): void };
    registry: { set(k: string, v: unknown): void };
    winds: { gate?: string; active: boolean }[];
    enemies: { texture: { key: string } }[];
    player?: {
      x: number;
      y: number;
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
            grounded: p.body.blocked.down,
            gated: g.winds.filter((w) => w.gate !== undefined).map((w) => w.active),
            cranes: g.enemies.filter((e) => e.texture.key.startsWith("crane")).length,
          }
        : null;
    });

  await page.evaluate(() => {
    const g = window.__origami.scene.getScene("GameScene") as unknown as Scene;
    g.registry.set("levelId", "midnight-canyon");
    g.registry.set("checkpoint", -1);
    g.scene.restart();
  });
  // Рівень завантажився: є журавлики, а gated-тунель ще закритий
  await expect
    .poll(async () => (await snap())?.cranes ?? 0, { timeout: 30_000 })
    .toBeGreaterThan(0);
  expect((await snap())?.gated).toEqual([false]);
  await page.screenshot({ path: "test-results/canyon-start.png" });

  // Ставимо ніндзя на уступ із флюгером (верх 340, флюгер на x=1830) і б'ємо мечем
  const standByVane = async () => {
    await page.evaluate(() => {
      const g = window.__origami.scene.getScene("GameScene") as unknown as Scene;
      g.player?.setPosition(1800, 340 - 40);
    });
  };
  await expect
    .poll(
      async () => {
        const s = await snap();
        if (s && !(s.grounded && s.x > 1750 && s.x < 1900)) await standByVane();
        return !!s && s.grounded && s.x > 1750 && s.x < 1900;
      },
      { timeout: 30_000, intervals: [200] },
    )
    .toBe(true);
  // Ніндзя за замовчуванням дивиться праворуч; тримаємо J кілька кадрів, щоб Phaser побачив натиск
  await page.keyboard.down("KeyJ");
  await page.waitForTimeout(120);
  await page.keyboard.up("KeyJ");
  await expect
    .poll(async () => (await snap())?.gated, { timeout: 15_000, intervals: [150] })
    .toEqual([true]);
  await page.screenshot({ path: "test-results/canyon-vane.png" });
  expect(errors).toEqual([]);
});

test("Ink Marsh: holding Attack folds into a shell that survives one hit", async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, "keyboard flow is covered on desktop");
  test.setTimeout(90_000);
  const errors = collectErrors(page);
  await page.goto("play/?debug=1");
  await waitForGame(page);

  type Scene = {
    scene: { restart(): void };
    registry: { set(k: string, v: unknown): void };
    player?: {
      x: number;
      y: number;
      inInk: boolean;
      stateName: string;
      health: { hp: number; invulnerableMs: number };
      shellGuard: { ready: boolean };
      body: { blocked: { down: boolean } };
      setPosition(x: number, y: number): void;
      takeDamage(n: number, fromX: number): boolean;
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
            state: p.stateName,
            grounded: p.body.blocked.down,
            inInk: p.inInk,
            hp: p.health.hp,
            shellReady: p.shellGuard.ready,
          }
        : null;
    });

  await page.evaluate(() => {
    const g = window.__origami.scene.getScene("GameScene") as unknown as Scene;
    g.registry.set("levelId", "ink-marsh");
    g.registry.set("checkpoint", -1);
    g.scene.restart();
  });
  await expect.poll(async () => (await snap())?.grounded ?? false, { timeout: 30_000 }).toBe(true);
  await page.screenshot({ path: "test-results/marsh-start.png" });

  // Ставимо ніндзя в чорнило (пляма 600…1160, верх 440) далеко від ворогів і лучника
  const standInInk = async () => {
    await page.evaluate(() => {
      const g = window.__origami.scene.getScene("GameScene") as unknown as Scene;
      g.player?.setPosition(700, 440 - 40);
    });
  };
  await expect
    .poll(
      async () => {
        const s = await snap();
        if (s && !(s.grounded && s.x > 640 && s.x < 760)) await standInInk();
        return !!s && s.grounded && s.inInk;
      },
      { timeout: 30_000, intervals: [200] },
    )
    .toBe(true);

  // Утримуємо Attack: ніндзя складається в панцир
  await page.keyboard.down("KeyJ");
  await expect
    .poll(async () => (await snap())?.state, { timeout: 15_000, intervals: [100] })
    .toBe("shell");
  await page.screenshot({ path: "test-results/marsh-shell.png" });

  // Удар у панцир: шкоди немає, панцир тріскає
  const hpBefore = (await snap())?.hp ?? 0;
  await page.evaluate(() => {
    const g = window.__origami.scene.getScene("GameScene") as unknown as Scene;
    g.player?.takeDamage(20, 0);
  });
  await expect.poll(async () => (await snap())?.shellReady, { timeout: 5_000 }).toBe(false);
  expect((await snap())?.hp).toBe(hpBefore);
  await page.keyboard.up("KeyJ");
  expect(errors).toEqual([]);
});

test("Kirigami Workshop: a double-tap on Attack dashes through a tough paper wall", async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, "keyboard flow is covered on desktop");
  test.setTimeout(90_000);
  const errors = collectErrors(page);
  await page.goto("play/?debug=1");
  await waitForGame(page);

  type Scene = {
    scene: { restart(): void };
    registry: { set(k: string, v: unknown): void };
    cuts: { tough: boolean; cut: boolean }[];
    player?: {
      x: number;
      y: number;
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
            grounded: p.body.blocked.down,
            tough: g.cuts.filter((c) => c.tough).map((c) => c.cut),
          }
        : null;
    });

  await page.evaluate(() => {
    const g = window.__origami.scene.getScene("GameScene") as unknown as Scene;
    g.registry.set("levelId", "kirigami-workshop");
    g.registry.set("checkpoint", -1);
    g.scene.restart();
  });
  await expect
    .poll(async () => (await snap())?.tough.length ?? 0, { timeout: 30_000 })
    .toBeGreaterThan(0);
  expect((await snap())?.tough).toEqual([false, false]);
  await page.screenshot({ path: "test-results/workshop-start.png" });

  // Ставимо ніндзя за 60 px до товстої стіни (x=1620) і двічі тапаємо Attack
  const standBeforeWall = async () => {
    await page.evaluate(() => {
      const g = window.__origami.scene.getScene("GameScene") as unknown as Scene;
      g.player?.setPosition(1560, 440 - 40);
    });
  };
  await expect
    .poll(
      async () => {
        const s = await snap();
        if (s && !(s.grounded && s.x > 1500 && s.x < 1600)) await standBeforeWall();
        return !!s && s.grounded && s.x > 1500 && s.x < 1600;
      },
      { timeout: 30_000, intervals: [200] },
    )
    .toBe(true);
  for (let i = 0; i < 2; i++) {
    await page.keyboard.down("KeyJ");
    await page.waitForTimeout(60);
    await page.keyboard.up("KeyJ");
    await page.waitForTimeout(60);
  }
  await expect
    .poll(async () => (await snap())?.tough, { timeout: 15_000, intervals: [100] })
    .toEqual([true, false]);
  await page.screenshot({ path: "test-results/workshop-dash.png" });
  expect(errors).toEqual([]);
});

test("Paper Sea Storm: waves move the boat and the sail beats the headwind", async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, "keyboard flow is covered on desktop");
  test.setTimeout(90_000);
  const errors = collectErrors(page);
  await page.goto("play/?debug=1");
  await waitForGame(page);

  type Scene = {
    scene: { restart(): void };
    registry: { set(k: string, v: unknown): void };
    enemies: { texture: { key: string } }[];
    player?: {
      x: number;
      y: number;
      inWater: boolean;
      waterSurfaceY: number;
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
            inWater: p.inWater,
            surface: p.waterSurfaceY,
            fish: g.enemies.filter((e) => e.texture.key === "fish").length,
          }
        : null;
    });
  const dropInto = async (x: number) => {
    await page.evaluate((px) => {
      const g = window.__origami.scene.getScene("GameScene") as unknown as Scene;
      g.player?.setPosition(px, 400);
    }, x);
  };

  await page.evaluate(() => {
    const g = window.__origami.scene.getScene("GameScene") as unknown as Scene;
    g.registry.set("levelId", "paper-sea");
    g.registry.set("checkpoint", -1);
    g.scene.restart();
  });
  await expect.poll(async () => (await snap())?.fish ?? 0, { timeout: 30_000 }).toBeGreaterThan(0);
  await page.screenshot({ path: "test-results/sea-start.png" });

  // Перше море: човник пливе, а поверхня під ним справді рухається (хвиля)
  await expect
    .poll(
      async () => {
        const s = await snap();
        if (s && !s.inWater) await dropInto(1000);
        return !!s && s.inWater;
      },
      { timeout: 30_000, intervals: [200] },
    )
    .toBe(true);
  const surfaces = new Set<number>();
  for (let i = 0; i < 10; i++) {
    surfaces.add(Math.round((await snap())?.surface ?? 0));
    await page.waitForTimeout(150);
  }
  expect(surfaces.size).toBeGreaterThan(3);

  // Друге море: зустрічна течія. З вітрилом (утримання Attack) човник просувається вперед
  await expect
    .poll(
      async () => {
        const s = await snap();
        if (s && !(s.inWater && s.x > 1900 && s.x < 2200)) await dropInto(2000);
        return !!s && s.inWater && s.x > 1900 && s.x < 2200;
      },
      { timeout: 30_000, intervals: [200] },
    )
    .toBe(true);
  const x0 = (await snap())?.x ?? 0;
  await page.keyboard.down("ArrowRight");
  await page.keyboard.down("KeyJ");
  await expect
    .poll(async () => ((await snap())?.x ?? 0) - x0, { timeout: 20_000, intervals: [200] })
    .toBeGreaterThan(60);
  await page.screenshot({ path: "test-results/sea-sail.png" });
  await page.keyboard.up("KeyJ");
  await page.keyboard.up("ArrowRight");
  expect(errors).toEqual([]);
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
