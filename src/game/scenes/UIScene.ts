// UIScene: HUD, оверлеї смерті/перемоги, повідомлення й сенсорні кнопки.
// Працює в базовій роздільності 960×540 незалежно від DPR.
import Phaser from "phaser";
import type { Palette } from "../../gfx/palette.ts";
import { currentPalette, debugMode, hexToNumber, isTouchDevice, renderScale } from "../env.ts";
import { GAME_EVENTS } from "../events.ts";
import type { InputHub } from "../input/hub.ts";
import { pressedButtons, type TouchButton, touchLayout } from "../input/touch.ts";
import { getQuality } from "../quality.ts";
import { tuning } from "../tuning.ts";

interface OverlayData {
  kind: "dead" | "complete";
  cause?: "fire" | "fall" | "enemy" | "water";
  timeMs?: number;
  deaths?: number;
  levelName?: string;
  nextLevelName?: string;
}

const TITLES = {
  fire: "You burned",
  fall: "You fell",
  enemy: "You were caught",
  water: "You drowned",
} as const;

const formatTime = (ms: number): string => {
  const total = Math.floor(ms / 1000);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
};

export class UIScene extends Phaser.Scene {
  private hub?: InputHub;
  private buttons: TouchButton[] = [];
  private shapes = new Map<string, Phaser.GameObjects.Graphics>();
  private fpsText?: Phaser.GameObjects.Text;
  private hpBar?: Phaser.GameObjects.Graphics;
  private overlayLayer?: Phaser.GameObjects.Container;
  private overlayTitle?: Phaser.GameObjects.Text;
  private overlaySub?: Phaser.GameObjects.Text;
  private toast?: Phaser.GameObjects.Text;

  constructor() {
    super("UIScene");
  }

  init(data: { hub?: InputHub }): void {
    this.hub = data.hub;
  }

  create(): void {
    this.applyZoom();
    const p = currentPalette();

    this.createHpBar(p);
    if (isTouchDevice()) this.createTouchButtons(p);
    this.createOverlay(p);
    this.createToast(p);

    if (debugMode) {
      this.fpsText = this.add
        .text(tuning.view.width - 12, 10, "", {
          fontFamily: "monospace",
          fontSize: "16px",
          color: p.ink,
          backgroundColor: p.paper,
        })
        .setOrigin(1, 0)
        .setDepth(100);
    }

    // Якість змінюється під час гри: перераховуємо масштаб камери
    const onQuality = () => this.applyZoom();
    this.game.events.on(GAME_EVENTS.qualityChanged, onQuality);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () =>
      this.game.events.off(GAME_EVENTS.qualityChanged, onQuality),
    );
  }

  private applyZoom(): void {
    const cam = this.cameras.main;
    cam.setZoom(renderScale());
    cam.centerOn(tuning.view.width / 2, tuning.view.height / 2);
  }

  private createTouchButtons(p: Palette): void {
    // Дозволяємо до 4 одночасних дотиків (біг + стрибок + атака)
    this.input.addPointer(3);
    this.buttons = touchLayout();
    for (const b of this.buttons) {
      const g = this.add.graphics();
      g.fillStyle(hexToNumber(p.paper), 1);
      g.fillRoundedRect(b.x, b.y, b.w, b.h, 22);
      g.lineStyle(3, hexToNumber(p.ink), 1);
      g.strokeRoundedRect(b.x, b.y, b.w, b.h, 22);
      g.setAlpha(0.5);
      this.shapes.set(b.id, g);
      this.add
        .text(b.x + b.w / 2, b.y + b.h / 2, b.label, {
          fontFamily: '"Hanken Grotesk", Arial, sans-serif',
          fontStyle: "700",
          fontSize: b.label.length > 2 ? "22px" : "40px",
          color: p.ink,
        })
        .setOrigin(0.5)
        .setAlpha(0.9);
    }
  }

  /** Смужка HP: перемальовується лише при зміні значення (registry). */
  private createHpBar(p: Palette): void {
    this.hpBar = this.add.graphics();
    this.add
      .text(20, 18, "HP", {
        fontFamily: '"Hanken Grotesk", Arial, sans-serif',
        fontStyle: "700",
        fontSize: "20px",
        color: p.ink,
      })
      .setOrigin(0, 0.5);
    const draw = () => {
      const hp = (this.registry.get("hp") as number | undefined) ?? 100;
      const max = (this.registry.get("maxHp") as number | undefined) ?? 100;
      const w = 240;
      const x = 56;
      const y = 8;
      const h = 20;
      const g = this.hpBar;
      if (!g) return;
      g.clear();
      g.fillStyle(hexToNumber(p.paper), 0.85).fillRoundedRect(x, y, w, h, 6);
      g.fillStyle(hexToNumber(hp / max < 0.3 ? p.fire : p.accent), 1).fillRoundedRect(
        x,
        y,
        Math.max(0, (w * hp) / max),
        h,
        6,
      );
      g.lineStyle(3, hexToNumber(p.ink), 1).strokeRoundedRect(x, y, w, h, 6);
    };
    draw();
    this.registry.events.on("changedata-hp", draw);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () =>
      this.registry.events.off("changedata-hp", draw),
    );
  }

  /** Оверлей на весь екран: затемнення, заголовок, підказка. Тап/клік по ньому = дія (респавн/рестарт). */
  private createOverlay(p: Palette): void {
    const { width: w, height: h } = tuning.view;
    const dim = this.add.rectangle(0, 0, w, h, hexToNumber(p.bg), 0.82).setOrigin(0, 0);
    this.overlayTitle = this.add
      .text(w / 2, h / 2 - 36, "", {
        fontFamily: '"Shippori Mincho", Georgia, serif',
        fontStyle: "700",
        fontSize: "72px",
        color: p.ink,
      })
      .setOrigin(0.5);
    this.overlaySub = this.add
      .text(w / 2, h / 2 + 40, "", {
        fontFamily: '"Hanken Grotesk", Arial, sans-serif',
        fontStyle: "600",
        fontSize: "26px",
        color: p.muted,
        align: "center",
      })
      .setOrigin(0.5);
    this.overlayLayer = this.add
      .container(0, 0, [dim, this.overlayTitle, this.overlaySub])
      .setDepth(200)
      .setVisible(false);
    dim.setInteractive();
    dim.on("pointerdown", () => this.game.events.emit(GAME_EVENTS.overlayAction));

    const show = () => {
      const data = this.registry.get("overlay") as OverlayData | null | undefined;
      if (!data) {
        this.overlayLayer?.setVisible(false);
        return;
      }
      const action = isTouchDevice() ? "Tap" : "Press R or tap";
      if (data.kind === "dead") {
        this.overlayTitle?.setText(TITLES[data.cause ?? "enemy"]);
        this.overlaySub?.setText(`${action} to respawn at the checkpoint`);
      } else {
        const nextHint = data.nextLevelName
          ? `\n${action} for ${data.nextLevelName}`
          : `\n${action} to play again`;
        this.overlayTitle?.setText("Level complete");
        this.overlaySub?.setText(
          `Time ${formatTime(data.timeMs ?? 0)} · Deaths ${data.deaths ?? 0}${nextHint}`,
        );
      }
      this.overlayLayer?.setVisible(true);
    };
    this.registry.events.on("changedata-overlay", show);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () =>
      this.registry.events.off("changedata-overlay", show),
    );
    show();
  }

  private createToast(p: Palette): void {
    this.toast = this.add
      .text(tuning.view.width / 2, 70, "", {
        fontFamily: '"Hanken Grotesk", Arial, sans-serif',
        fontStyle: "700",
        fontSize: "26px",
        color: p.ink,
        backgroundColor: p.paper,
        padding: { x: 14, y: 6 },
      })
      .setOrigin(0.5)
      .setAlpha(0);
    const show = (_parent: unknown, value: string) => {
      this.toast?.setText(value).setAlpha(1);
      this.tweens.killTweensOf(this.toast as Phaser.GameObjects.Text);
      this.tweens.add({ targets: this.toast, alpha: 0, delay: 1100, duration: 400 });
    };
    this.registry.events.on("changedata-toast", show);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () =>
      this.registry.events.off("changedata-toast", show),
    );
  }

  update(): void {
    if (this.hub && this.buttons.length > 0) {
      const rs = renderScale();
      // Усі активні дотики в логічних координатах 960×540
      const contacts = this.input.manager.pointers
        .filter((ptr) => ptr.isDown)
        .map((ptr) => ({ x: ptr.x / rs, y: ptr.y / rs }));
      const pressed = pressedButtons(this.buttons, contacts);
      for (const b of this.buttons) {
        const on = pressed.has(b.id);
        this.hub.touch[b.id] = on;
        this.shapes.get(b.id)?.setAlpha(on ? 0.85 : 0.5);
      }
    }
    if (this.fpsText) {
      this.fpsText.setText(`FPS ${Math.round(this.game.loop.actualFps)} · ${getQuality()}`);
    }
  }
}
