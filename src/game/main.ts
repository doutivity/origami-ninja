// Точка входу гри: вантажить шрифти, створює Phaser.Game. Phaser підключається лише на /play/.
import Phaser from "phaser";
import { wireAnalytics } from "./analytics.ts";
import { currentPalette, debugMode, hexToNumber, renderScale } from "./env.ts";
import { initQuality } from "./quality.ts";
import { BootScene } from "./scenes/BootScene.ts";
import { GameScene } from "./scenes/GameScene.ts";
import { UIScene } from "./scenes/UIScene.ts";
import { tuning } from "./tuning.ts";

async function start(): Promise<void> {
  // Шрифти завантажуються до старту, щоб текст у Phaser не мигав запасним шрифтом
  try {
    await Promise.all([
      document.fonts.load('700 24px "Shippori Mincho"'),
      document.fonts.load('700 24px "Hanken Grotesk"'),
    ]);
  } catch {
    // без шрифтів гра все одно працює
  }

  initQuality(window.location.search);
  const rs = renderScale();
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: "game",
    width: tuning.view.width * rs,
    height: tuning.view.height * rs,
    backgroundColor: hexToNumber(currentPalette().paper),
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    input: { activePointers: 4 },
    physics: {
      default: "arcade",
      arcade: { gravity: { x: 0, y: tuning.player.gravity }, debug: debugMode },
    },
    scene: [BootScene, GameScene, UIScene],
  });

  wireAnalytics(game);

  // У debug-режимі гра доступна з консолі (також використовується тестами)
  if (debugMode) (window as unknown as { __origami?: Phaser.Game }).__origami = game;

  // Пауза, коли вкладка або вікно втрачають фокус
  const pause = () => game.pause();
  const resume = () => game.resume();
  window.addEventListener("blur", pause);
  window.addEventListener("focus", resume);
  document.addEventListener("visibilitychange", () => (document.hidden ? pause() : resume()));
}

void start();
