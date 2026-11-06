/** Зліпок вводу за кадр: однаковий для клавіатури й дотику. */
export interface InputState {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  /** Jump утримується */
  jumpHeld: boolean;
  /** Jump натиснуто саме в цьому кадрі */
  jumpPressed: boolean;
  attackPressed: boolean;
  /** Attack утримується (для панцира) */
  attackHeld: boolean;
  restartPressed: boolean;
}

export const emptyInput = (): InputState => ({
  left: false,
  right: false,
  up: false,
  down: false,
  jumpHeld: false,
  jumpPressed: false,
  attackPressed: false,
  attackHeld: false,
  restartPressed: false,
});

/** Напрямок руху: -1, 0 або 1. Якщо натиснуто обидва боки — 0. */
export const axisX = (i: Pick<InputState, "left" | "right">): -1 | 0 | 1 =>
  i.left === i.right ? 0 : i.left ? -1 : 1;
