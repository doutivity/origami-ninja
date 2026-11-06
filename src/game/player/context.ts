import type { InputState } from "../input/input-state.ts";
import type { WindEffect } from "./glide-model.ts";

/** Імена станів гравця. Нові стани (glide) додаються разом зі своїми механіками. */
export type StateName =
  | "idle"
  | "run"
  | "jump"
  | "fall"
  | "glide"
  | "charge"
  | "shell"
  | "dash"
  | "hurt"
  | "dead";

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
  /** Який саме вітер діє (якщо inWind); за замовчуванням — висхідний */
  wind?: WindEffect | null;
  /** Напрямок погляду: -1 ліворуч, 1 праворуч */
  facing: -1 | 1;
  /** Планер вимкнено на рівні */
  glideDisabled?: boolean;
  /** Гравець стоїть у чорнилі (сповільнює біг і стрибок, крім форми панцира) */
  inInk?: boolean;
  /** Утримання Attack достатнє, щоб скластись у панцир (рахує Player) */
  shellRequested?: boolean;
  /** Панцир ще цілий (не тріснув після удару) */
  shellReady?: boolean;
  /** Форма жабки доступна на цьому рівні (за замовчуванням ні) */
  frogEnabled?: boolean;
  /** Скільки мс поспіль Jump утримується на землі */
  groundHeldMs?: number;
  /** Jump відпущено в цьому кадрі після короткого тапу на землі (звичайний стрибок із відкладенням) */
  jumpTap?: boolean;
  /** Наступний стан jump не обрізає стрибок при відпусканні Jump (стрибок жабки) */
  skipJumpCut?: boolean;
}
