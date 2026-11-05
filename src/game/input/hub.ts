// Об'єднує клавіатуру й дотик у один InputState. Клавіатуру читає GameScene, дотик заповнює UIScene.
import Phaser from "phaser";
import { emptyInput, type InputState } from "./input-state.ts";
import type { TouchButtonId } from "./touch.ts";

type Keys = Record<string, Phaser.Input.Keyboard.Key>;

export class InputHub {
  /** Стан сенсорних кнопок: його оновлює UIScene щокадру. */
  readonly touch: Record<TouchButtonId, boolean> = {
    left: false,
    right: false,
    jump: false,
    attack: false,
  };

  private readonly keys: Keys;
  private prevJump = false;
  private prevAttack = false;

  constructor(scene: Phaser.Scene) {
    const kb = scene.input.keyboard;
    if (!kb) throw new Error("Keyboard input is not available");
    this.keys = kb.addKeys("LEFT,RIGHT,UP,DOWN,A,D,W,S,SPACE,J,R") as Keys;
    // Не даємо сторінці прокручуватись стрілками й пробілом під час гри
    kb.addCapture("LEFT,RIGHT,UP,DOWN,SPACE");
  }

  private down(...names: string[]): boolean {
    return names.some((n) => this.keys[n]?.isDown === true);
  }

  /** JustDown не губить швидкі тапи, які почались і закінчились між двома кадрами. */
  private justDown(name: string): boolean {
    const key = this.keys[name];
    return key ? Phaser.Input.Keyboard.JustDown(key) : false;
  }

  poll(): InputState {
    const k = (...n: string[]) => this.down(...n);
    const jumpTouchEdge = this.touch.jump && !this.prevJump;
    const attackTouchEdge = this.touch.attack && !this.prevAttack;
    const jumpDown = this.justDown("SPACE");
    const attackDown = this.justDown("J");
    const restartDown = this.justDown("R");
    const state: InputState = {
      ...emptyInput(),
      left: k("LEFT", "A") || this.touch.left,
      right: k("RIGHT", "D") || this.touch.right,
      up: k("UP", "W"),
      down: k("DOWN", "S"),
      jumpHeld: k("SPACE") || this.touch.jump,
      jumpPressed: jumpDown || jumpTouchEdge,
      attackPressed: attackDown || attackTouchEdge,
      restartPressed: restartDown,
    };
    this.prevJump = this.touch.jump;
    this.prevAttack = this.touch.attack;
    return state;
  }
}
