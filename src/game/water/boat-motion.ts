import { tuning } from "../tuning.ts";

export interface BoatInput {
  left: boolean;
  right: boolean;
  jumpPressed: boolean;
}

export interface BoatStepIn {
  input: BoatInput;
  /** Вітрило розгорнуте (утримання Attack на рівні з вітрилом) */
  sail?: boolean;
  /** Куди дивиться човник: із вітрилом без ←/→ він іде вперед */
  facing?: -1 | 1;
  /** Тіло впирається в стіну зліва/справа (берег, пліт) */
  blockedLeft: boolean;
  blockedRight: boolean;
  vx: number;
  /** Верхня координата тіла й цільова, до якої човник «пружинить» */
  bodyY: number;
  targetY: number;
  /** Швидкість течії, px/с */
  waterSpeed: number;
  dt: number;
}

export interface BoatStepOut {
  vx: number;
  vy: number;
  /** -1/1 — новий напрямок погляду, 0 — без змін */
  facing: -1 | 0 | 1;
  /** true — гравець вилазить із води (стрибок або автопідйом) */
  exit: boolean;
}

/** Один крок руху човника: плавання, стрибок із води й автопідйом на берег. Чиста функція. */
export function stepBoat(s: BoatStepIn): BoatStepOut {
  const dir = s.input.left ? -1 : s.input.right ? 1 : 0;
  const bumpsBank = (dir < 0 && s.blockedLeft) || (dir > 0 && s.blockedRight);
  if (s.input.jumpPressed || bumpsBank) {
    return {
      // Під час автопідйому тримаємо рух до берега, щоб приземлитися на нього
      vx: bumpsBank ? dir * tuning.boat.speed : s.vx,
      vy: -tuning.player.jumpVelocity * 0.95,
      facing: dir,
      exit: true,
    };
  }
  // Вітрило: вищий потолок швидкості, а без ←/→ човен іде в бік погляду
  const heading = dir !== 0 ? dir : s.sail ? (s.facing ?? 1) : 0;
  const speed = s.sail ? tuning.boat.sailSpeed : tuning.boat.speed;
  const targetVx = heading * speed + s.waterSpeed;
  return {
    vx: s.vx + (targetVx - s.vx) * Math.min(1, s.dt * 6),
    vy: (s.targetY - s.bodyY) * 8,
    facing: dir,
    exit: false,
  };
}
