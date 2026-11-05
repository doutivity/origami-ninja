import Phaser from "phaser";
import { burnStep, FIGURE_BOTTOM, FIGURE_TOP, ragged } from "../combat/burn.ts";
import { type FrameName, TEX } from "../scenes/BootScene.ts";
import { tuning } from "../tuning.ts";

/**
 * Обгоряння: поверх гравця малюються обвуглена копія кадру й розжарена кромка. Обидві видимі лише
 * через рвану маску, що піднімається знизу вгору. Маска змінюється лише при зміні кроку (16 кроків),
 * тож щокадру нічого не перемальовується. Без WebGL (немає фільтрів) діє проста обрізка.
 */
export class BurnOverlay {
  private readonly char: Phaser.GameObjects.Image;
  private readonly glow: Phaser.GameObjects.Image;
  private charMask?: Phaser.Filters.Mask;
  private glowMask?: Phaser.Filters.Mask;
  private step = 0;
  private useFilters: boolean;
  private readonly canFilter: boolean;

  constructor(scene: Phaser.Scene, frame: FrameName) {
    this.canFilter = scene.game.renderer.type === Phaser.WEBGL;
    this.useFilters = this.canFilter;
    this.char = scene.add.image(0, 0, TEX.burnt(frame)).setDepth(10.1).setVisible(false);
    this.glow = scene.add.image(0, 0, TEX.glow(frame)).setDepth(10.2).setVisible(false);
    if (this.useFilters) {
      this.char.enableFilters();
      this.glow.enableFilters();
      this.charMask = this.char.filters?.internal.addMask(TEX.burnMask(1));
      this.glowMask = this.glow.filters?.internal.addMask(TEX.burnEdge(1));
    }
  }

  /** Низька якість: без фільтрів-масок, лише проста обрізка (дешевше для GPU). */
  setUseFilters(on: boolean): void {
    const next = on && this.canFilter;
    if (next === this.useFilters) return;
    this.useFilters = next;
    this.step = -1;
    if (!next) {
      this.char.filters?.internal.clear();
      this.glow.filters?.internal.clear();
      this.charMask = undefined;
      this.glowMask = undefined;
    }
  }

  /** Синхронізує накладку з гравцем. level — рівень обгоряння 0…1. */
  sync(player: Phaser.GameObjects.Sprite, level: number, frame: FrameName): void {
    const step = burnStep(level);
    const visible = step > 0;
    this.char.setVisible(visible);
    this.glow.setVisible(visible && this.useFilters);
    if (!visible) {
      this.step = 0;
      return;
    }

    for (const img of [this.char, this.glow]) {
      img
        .setPosition(player.x, player.y)
        .setScale(player.scaleX, player.scaleY)
        .setFlipX(player.flipX);
      img.setAngle(player.angle).setAlpha(player.alpha);
    }
    if (this.char.texture.key !== TEX.burnt(frame)) {
      this.char.setTexture(TEX.burnt(frame));
      this.glow.setTexture(TEX.glow(frame));
    }

    if (step !== this.step) {
      this.step = step;
      if (this.useFilters) {
        this.charMask?.setTexture(TEX.burnMask(step));
        this.glowMask?.setTexture(TEX.burnEdge(step));
      } else {
        // Запасний варіант без фільтрів: пряма межа обрізки за середнім краєм
        const edge = ragged(step, tuning.burn.steps);
        const y = edge.reduce((acc, [, ey]) => acc + ey, 0) / edge.length;
        const top = Math.max(FIGURE_TOP, Math.min(FIGURE_BOTTOM, y));
        this.char.setCrop(0, top, 128, 128 - top);
      }
    }
  }
}
