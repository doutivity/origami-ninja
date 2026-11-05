// Геометрія сенсорних кнопок і визначення натискань за множиною дотиків (multi-touch).
import { tuning } from "../tuning.ts";

export type TouchButtonId = "left" | "right" | "jump" | "attack";

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface TouchButton extends Rect {
  id: TouchButtonId;
  label: string;
}

/** Розкладка кнопок у базовій роздільності 960×540: ←/→ ліворуч, Attack/Jump праворуч. */
export function touchLayout(): TouchButton[] {
  const { buttonSize: s, margin: m, gap: g } = tuning.touch;
  const { width, height } = tuning.view;
  const y = height - m - s;
  return [
    { id: "left", label: "←", x: m, y, w: s, h: s },
    { id: "right", label: "→", x: m + s + g, y, w: s, h: s },
    { id: "jump", label: "Jump", x: width - m - s, y, w: s, h: s },
    { id: "attack", label: "Attack", x: width - m - 2 * s - g, y, w: s, h: s },
  ];
}

const inside = (r: Rect, px: number, py: number, pad: number) =>
  px >= r.x - pad && px <= r.x + r.w + pad && py >= r.y - pad && py <= r.y + r.h + pad;

export interface Contact {
  x: number;
  y: number;
}

/** Які кнопки зараз утримуються. Один палець може торкатися лише однієї кнопки (найближчої). */
export function pressedButtons(
  buttons: readonly TouchButton[],
  contacts: readonly Contact[],
  pad: number = tuning.touch.hitPadding,
): Set<TouchButtonId> {
  const pressed = new Set<TouchButtonId>();
  for (const c of contacts) {
    let best: TouchButton | undefined;
    let bestDist = Number.POSITIVE_INFINITY;
    for (const b of buttons) {
      if (!inside(b, c.x, c.y, pad)) continue;
      const d = Math.hypot(c.x - (b.x + b.w / 2), c.y - (b.y + b.h / 2));
      if (d < bestDist) {
        best = b;
        bestDist = d;
      }
    }
    if (best) pressed.add(best.id);
  }
  return pressed;
}
