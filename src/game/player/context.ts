import type { InputState } from "../input/input-state.ts";

/** Імена станів гравця. Нові стани (glide) додаються разом зі своїми механіками. */
export type StateName = "idle" | "run" | "jump" | "fall" | "glide" | "hurt" | "dead";

/**
 * Контекст кадру для станів. Не залежить від Phaser, тому state machine тестується окремо.
 * Стани читають вхідні поля й записують у vx/vy; контролер застосовує їх до фізичного тіла.
 */
export interface PlayerContext {
  input: InputState;
  /** Тривалість кадру, секунди */
  dt: number;
  onGround: boolean;
  vx: number;
  vy: number;
  /** Скільки мс минуло після сходу з землі (0 на землі, Infinity після стрибка) */
  coyoteMs: number;
  /** Скільки мс минуло після натиску Jump (Infinity, якщо натиск уже використано) */
  jumpBufferMs: number;
  /** Чи стоїть гравець у зоні висхідного вітру (піднімає лише планер) */
  inWind: boolean;
  /** Напрямок погляду: -1 ліворуч, 1 праворуч */
  facing: -1 | 1;
}
