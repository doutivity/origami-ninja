// Ігрові події → аналітика. Через track(): без згоди (або без модуля згоди) нічого не відбувається.
import type Phaser from "phaser";
import { track } from "../consent/track.ts";
import { GAME_EVENTS } from "./events.ts";

export function wireAnalytics(game: Phaser.Game): void {
  const on = (event: string, fn: (data: Record<string, unknown>) => void) =>
    game.events.on(event, (data: Record<string, unknown> = {}) => fn(data));
  on(GAME_EVENTS.levelStart, (d) => track("level_start", { level: d.level }));
  on(GAME_EVENTS.death, (d) => track("death", { cause: d.cause }));
  on(GAME_EVENTS.checkpoint, (d) => track("checkpoint", { index: d.index }));
  on(GAME_EVENTS.levelComplete, (d) => track("level_complete", { time_ms: d.ms }));
  on(GAME_EVENTS.qualityDowngrade, (d) => track("quality_downgrade", { fps: d.fps }));
}
