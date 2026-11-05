import Phaser from "phaser";
import { AttackTimer } from "../combat/attack.ts";
import { burnAfter } from "../combat/burn.ts";
import { type Box, swordHitbox } from "../combat/geometry.ts";
import { blinkVisible, Health } from "../combat/health.ts";
import { emptyInput, type InputState } from "../input/input-state.ts";
import { type FrameName, TEX } from "../scenes/BootScene.ts";
import { tuning } from "../tuning.ts";
import type { PlayerContext } from "./context.ts";
import { tiltOf } from "./glide-model.ts";
import { StateMachine } from "./state-machine.ts";
import { DeadState } from "./states/dead.ts";
import { FallState } from "./states/fall.ts";
import { GlideState } from "./states/glide.ts";
import { HurtState } from "./states/hurt.ts";
import { IdleState } from "./states/idle.ts";
import { JumpState } from "./states/jump.ts";
import { RunState } from "./states/run.ts";

const RUN_FRAMES: readonly FrameName[] = ["run0", "run1", "run2", "run3"];
// Відстань від центру спрайта до ніг у пікселях екрана (текстура 128 px, ступні ≈ y=124)
const FEET_BELOW_CENTER = (124 - 64) * tuning.player.spriteScale;

/** Гравець: фізичний спрайт + state machine руху + шар атаки + здоров'я. */
export class Player extends Phaser.Physics.Arcade.Sprite {
  readonly machine: StateMachine;
  readonly health = new Health();
  /** Атака — шар поверх станів: дозволена на землі й у стрибку */
  readonly attack = new AttackTimer();
  private readonly ctx: PlayerContext;
  private readonly slashSprite: Phaser.GameObjects.Image;
  /** Обгорілість 0…1: росте від вогню, зберігається до респавну */
  burn = 0;
  /** Керування вимкнене (фініш) */
  locked = false;
  /** Чи стоїть гравець у вогні в цьому кадрі (виставляє GameScene) */
  inFire = false;
  deathCause: "fire" | "enemy" | "fall" | null = null;
  /** Поточний візуальний кадр (для накладки обгоряння) */
  frameName: FrameName = "idle";
  /** Поточний кут нахилу літачка на екрані, градуси */
  private glideAngle = 0;
  private glideBody = false;
  /** Чи в зоні висхідного вітру (виставляє GameScene) */
  inWind = false;
  private runClock = 0;

  constructor(scene: Phaser.Scene, x: number, feetY: number) {
    super(scene, x, feetY - FEET_BELOW_CENTER, TEX.ninja("idle"));
    scene.add.existing(this);
    scene.physics.add.existing(this);
    const t = tuning.player;
    this.setScale(t.spriteScale);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(t.body.width, t.body.height, false);
    body.setOffset(t.body.offsetX, t.body.offsetY);
    body.setMaxVelocity(t.runSpeed * 3, 2000);
    this.setCollideWorldBounds(true);
    this.setDepth(10);

    this.slashSprite = scene.add
      .image(0, 0, TEX.slash)
      .setScale(0.5)
      .setDepth(11)
      .setVisible(false);

    this.ctx = {
      input: emptyInput(),
      dt: 0,
      onGround: false,
      vx: 0,
      vy: 0,
      coyoteMs: Number.POSITIVE_INFINITY,
      jumpBufferMs: Number.POSITIVE_INFINITY,
      inWind: false,
      facing: 1,
    };
    this.machine = new StateMachine(
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
  }

  get stateName() {
    return this.machine.name;
  }

  get facing(): -1 | 1 {
    return this.ctx.facing;
  }

  get dead(): boolean {
    return this.health.dead;
  }

  private get canAttack(): boolean {
    const s = this.machine.name;
    return s !== "hurt" && s !== "dead";
  }

  /** Хітбокс меча, поки він активний; інакше null. */
  swordBox(): Box | null {
    if (!this.attack.active) return null;
    const b = this.body as Phaser.Physics.Arcade.Body;
    return swordHitbox({ x: b.x, y: b.y, width: b.width, height: b.height }, this.ctx.facing);
  }

  /** Шкода від ворога/вогню. Повертає true, якщо шкода застосована. */
  takeDamage(amount: number, fromX: number): boolean {
    if (!this.health.damage(amount)) return false;
    const body = this.body as Phaser.Physics.Arcade.Body;
    const away = this.x < fromX ? -1 : 1;
    body.setVelocity(away * tuning.health.knockback.x, -tuning.health.knockback.y);
    this.ctx.vx = body.velocity.x;
    this.ctx.vy = body.velocity.y;
    if (this.health.dead) this.deathCause = "enemy";
    this.machine.transition(this.health.dead ? "dead" : "hurt", this.ctx);
    this.scene.cameras.main.shake(110, 0.006);
    return true;
  }

  /** Миттєва смерть (падіння в прірву): зупиняємо тіло й вимикаємо керування. */
  die(cause: "fire" | "fall" | "enemy"): void {
    if (this.dead && this.deathCause) return;
    this.health.drain(this.health.max);
    this.deathCause = cause;
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(0, 0);
    body.setAllowGravity(false);
    this.ctx.vx = 0;
    this.ctx.vy = 0;
    this.machine.transition("dead", this.ctx);
  }

  /** Шкода від вогню за кадр: без невразливості й відкидання, зате росте обгорілість. */
  applyFire(dtSec: number): void {
    if (this.health.dead) return;
    const dmg = tuning.fire.damagePerSecond * dtSec;
    this.health.drain(dmg);
    this.burn = burnAfter(this.burn, dmg, this.health.max);
    if (this.health.dead) {
      this.deathCause = "fire";
      this.machine.transition("dead", this.ctx);
    }
  }

  /** Один кадр: ввід → state machine → швидкість тіла → візуальний кадр. */
  tick(rawInput: InputState, deltaMs: number): void {
    const input = this.locked ? emptyInput() : rawInput;
    const body = this.body as Phaser.Physics.Arcade.Body;
    const ctx = this.ctx;
    this.health.update(deltaMs);
    if (input.attackPressed && this.canAttack) this.attack.start();
    if (!this.canAttack) this.attack.phase = "idle";
    this.attack.update(deltaMs);

    ctx.input =
      this.machine.name === "dead"
        ? { ...input, left: false, right: false, jumpHeld: false, jumpPressed: false }
        : input;
    ctx.dt = deltaMs / 1000;
    ctx.inWind = this.inWind;
    ctx.onGround = body.blocked.down || body.touching.down;
    ctx.vx = body.velocity.x;
    ctx.vy = body.velocity.y;

    // Coyote time і input buffer рахуються в мілісекундах
    ctx.coyoteMs = ctx.onGround ? 0 : ctx.coyoteMs + deltaMs;
    ctx.jumpBufferMs = ctx.input.jumpPressed ? 0 : ctx.jumpBufferMs + deltaMs;

    this.machine.update(ctx);
    body.setVelocity(ctx.vx, ctx.vy);
    this.updateVisual(ctx);
  }

  private frameFor(ctx: PlayerContext): FrameName {
    const state = this.machine.name;
    if (state === "hurt" || state === "dead") return "fall";
    if (state === "glide") return "glide";
    if (this.attack.busy) return "attack";
    switch (state) {
      case "run":
        this.runClock += Math.abs(ctx.vx) * ctx.dt * tuning.player.runFramesPerPixel;
        return RUN_FRAMES[Math.floor(this.runClock) % RUN_FRAMES.length] as FrameName;
      case "jump":
        return "jump";
      case "fall":
        return "fall";
      default:
        this.runClock = 0;
        return "idle";
    }
  }

  private updateVisual(ctx: PlayerContext): void {
    this.setFlipX(ctx.facing < 0);
    this.frameName = this.frameFor(ctx);
    const key = TEX.ninja(this.frameName);
    if (this.texture.key !== key) this.setTexture(key);
    // Миготіння під час невразливості
    this.setAlpha(blinkVisible(this.health.invulnerableMs) ? 1 : 0.35);
    this.setBodyMode(this.machine.name === "glide");
    this.setAngle(this.machine.name === "dead" ? ctx.facing * -80 : this.updateGlideAngle(ctx));
    this.updateSlash(ctx);
  }

  /** Тіло планера нижче й ширше; низ тіла збігається зі стоячим, тож перемикання не заглиблює в землю. */
  private setBodyMode(glide: boolean): void {
    if (glide === this.glideBody) return;
    this.glideBody = glide;
    const spec = glide ? tuning.glide.body : tuning.player.body;
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(spec.width, spec.height, false);
    body.setOffset(spec.offsetX, spec.offsetY);
    // Польотом керує модель планера, тож гравітацію світу на цей час вимикаємо
    body.setAllowGravity(!glide);
  }

  /** Кут літачка плавно слідує за нахилом ↑/↓; у інших станах 0. */
  private updateGlideAngle(ctx: PlayerContext): number {
    const target = this.machine.name === "glide" ? tuning.glide.angle[tiltOf(ctx.input)] : 0;
    this.glideAngle += (target - this.glideAngle) * Math.min(1, ctx.dt * 10);
    // Дзеркальний спрайт (flipX) вимагає дзеркального кута
    return ctx.facing < 0 ? -this.glideAngle : this.glideAngle;
  }

  /** Дуга удару: видима під час активної фази й згасає у відновленні. */
  private updateSlash(ctx: PlayerContext): void {
    const phase = this.attack.phase;
    const show = phase === "active" || phase === "recover";
    this.slashSprite.setVisible(show);
    if (!show) return;
    const b = this.body as Phaser.Physics.Arcade.Body;
    this.slashSprite.setPosition(b.center.x + ctx.facing * (b.halfWidth + 34), b.center.y - 4);
    this.slashSprite.setFlipX(ctx.facing < 0);
    this.slashSprite.setAlpha(phase === "active" ? 1 : 1 - this.attack.phaseProgress);
  }

  override destroy(fromScene?: boolean): void {
    this.slashSprite.destroy();
    super.destroy(fromScene);
  }
}
