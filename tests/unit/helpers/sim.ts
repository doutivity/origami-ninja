// Безголова симуляція гравця для перевірки балансу рівня: той самий state machine і tuning,
// що й у грі, плюс спрощена фізика (гравітація, AABB-зіткнення з платформами, вітер).
import { emptyInput, type InputState } from "../../../src/game/input/input-state.ts";
import type { LevelDef } from "../../../src/game/level/types.ts";
import type { PlayerContext } from "../../../src/game/player/context.ts";
import { ringDirection } from "../../../src/game/player/glide-model.ts";
import { StateMachine } from "../../../src/game/player/state-machine.ts";
import { DeadState } from "../../../src/game/player/states/dead.ts";
import { FallState } from "../../../src/game/player/states/fall.ts";
import { GlideState } from "../../../src/game/player/states/glide.ts";
import { HurtState } from "../../../src/game/player/states/hurt.ts";
import { IdleState } from "../../../src/game/player/states/idle.ts";
import { JumpState } from "../../../src/game/player/states/jump.ts";
import { RunState } from "../../../src/game/player/states/run.ts";
import { tuning } from "../../../src/game/tuning.ts";

const DT = 1 / 60;
const S = tuning.player.spriteScale;
const stand = { w: tuning.player.body.width * S, h: tuning.player.body.height * S };
const glide = { w: tuning.glide.body.width * S, h: tuning.glide.body.height * S };

export interface SimInput {
  /** Кадр (від 0), на якому гравець натискає Jump; Infinity — ніколи */
  jumpAt?: (s: SimState) => boolean;
  /** Утримувати Jump (для планера) */
  hold: (s: SimState) => boolean;
  up?: (s: SimState) => boolean;
  down?: (s: SimState) => boolean;
  right?: boolean;
  /** Вважати відкритими всі вітрові тунелі з gate (флюгери вже вдарено) */
  openGates?: boolean;
}

export interface SimState {
  frame: number;
  x: number;
  /** Нижня межа тіла (ноги) */
  feet: number;
  vx: number;
  vy: number;
  onGround: boolean;
  state: string;
  inWind: boolean;
}

export interface SimResult {
  landed: boolean;
  fell: boolean;
  /** Останній стан */
  final: SimState;
  /** Мінімальна висота ніг (найвища точка) */
  apex: number;
  frames: number;
  trace: SimState[];
}

const overlap = (
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number },
) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

export function simulate(
  level: LevelDef,
  startX: number,
  startFeet: number,
  input: SimInput,
  maxFrames = 60 * 20,
): SimResult {
  const machine = new StateMachine(
    [
      new IdleState(),
      new RunState(),
      new JumpState(),
      new FallState(),
      new GlideState(),
      new HurtState(),
      new DeadState(),
    ],
    "fall",
  );
  const ctx: PlayerContext = {
    input: emptyInput(),
    dt: DT,
    onGround: false,
    vx: 0,
    vy: 0,
    coyoteMs: Number.POSITIVE_INFINITY,
    jumpBufferMs: Number.POSITIVE_INFINITY,
    inWind: false,
    facing: 1,
  };
  let x = startX;
  let feet = startFeet;
  let onGround = false;
  let jumped = false;
  const trace: SimState[] = [];
  let apex = feet;

  const solids = level.platforms.map((p) => ({ x: p.x, y: p.y, w: p.width, h: p.height }));
  const dims = () => (machine.name === "glide" ? glide : stand);

  for (let frame = 0; frame < maxFrames; frame++) {
    const d = dims();
    const gravity = machine.name === "glide" ? 0 : tuning.player.gravity;
    // 1. Фізика: гравітація, переміщення по осях і зіткнення
    ctx.vy += gravity * DT;
    ctx.vy = Math.min(ctx.vy, 2000);
    x += ctx.vx * DT;
    for (const s of solids) {
      const box = { x: x - d.w / 2, y: feet - d.h, w: d.w, h: d.h };
      if (!overlap(box, s)) continue;
      x = ctx.vx > 0 ? s.x - d.w / 2 : s.x + s.w + d.w / 2;
      ctx.vx = 0;
    }
    feet += ctx.vy * DT;
    onGround = false;
    for (const s of solids) {
      const box = { x: x - d.w / 2, y: feet - d.h, w: d.w, h: d.h };
      if (!overlap(box, s)) continue;
      if (ctx.vy >= 0) {
        feet = s.y;
        onGround = true;
      } else {
        feet = s.y + s.h + d.h;
      }
      ctx.vy = 0;
    }
    // Стояння на платформі без руху вниз
    if (!onGround && ctx.vy >= 0) {
      for (const s of solids) {
        if (Math.abs(feet - s.y) < 0.5 && x + d.w / 2 > s.x && x - d.w / 2 < s.x + s.w)
          onGround = true;
      }
    }
    apex = Math.min(apex, feet);

    // 2. Вітер і ввід
    const box = { x: x - d.w / 2, y: feet - d.h, w: d.w, h: d.h };
    const zone = level.winds.find(
      (w) =>
        (w.gate === undefined || input.openGates === true) &&
        overlap(box, { x: w.x, y: w.y, w: w.width, h: w.height }),
    );
    const inWind = zone !== undefined;
    ctx.wind = zone ? { kind: zone.kind ?? "lift", ...ringDirection(zone.dir) } : null;
    const snap: SimState = {
      frame,
      x,
      feet,
      vx: ctx.vx,
      vy: ctx.vy,
      onGround,
      state: machine.name,
      inWind,
    };
    trace.push(snap);
    const pressNow = !jumped && (input.jumpAt?.(snap) ?? false);
    if (pressNow) jumped = true;
    const held = input.hold(snap) || pressNow;
    const inp: InputState = {
      ...emptyInput(),
      right: input.right ?? true,
      up: input.up?.(snap) ?? false,
      down: input.down?.(snap) ?? false,
      jumpHeld: held,
      jumpPressed: pressNow,
    };
    ctx.input = inp;
    ctx.onGround = onGround;
    ctx.inWind = inWind;
    ctx.coyoteMs = onGround ? 0 : ctx.coyoteMs + DT * 1000;
    ctx.jumpBufferMs = pressNow ? 0 : ctx.jumpBufferMs + DT * 1000;
    machine.update(ctx);

    if (feet > level.height + tuning.world.fallLimit) {
      return { landed: false, fell: true, final: snap, apex, frames: frame, trace };
    }
  }
  const final = trace.at(-1) as SimState;
  return { landed: final.onGround, fell: false, final, apex, frames: trace.length, trace };
}
