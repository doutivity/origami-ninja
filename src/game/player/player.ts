import Phaser from "phaser";
import { AttackTimer } from "../combat/attack.ts";
import { burnAfter } from "../combat/burn.ts";
import { type Box, swordHitbox } from "../combat/geometry.ts";
import { blinkVisible, Health } from "../combat/health.ts";
import { emptyInput, type InputState } from "../input/input-state.ts";
import { type FrameName, TEX } from "../scenes/BootScene.ts";
import { tuning } from "../tuning.ts";
import { stepBoat } from "../water/boat-motion.ts";
import type { PlayerContext, StateName } from "./context.ts";
import { chargeFraction } from "./frog-model.ts";
import { tiltOf, type WindEffect } from "./glide-model.ts";
import { ShellGuard, shellWanted } from "./shell-model.ts";
import { StateMachine } from "./state-machine.ts";
import { ChargeState } from "./states/charge.ts";
import { DeadState } from "./states/dead.ts";
import { FallState } from "./states/fall.ts";
import { GlideState } from "./states/glide.ts";
import { HurtState } from "./states/hurt.ts";
import { IdleState } from "./states/idle.ts";
import { JumpState } from "./states/jump.ts";
import { RunState } from "./states/run.ts";
import { ShellState } from "./states/shell.ts";

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
  /** Чи пливе гравець у воді у формі орігамі-човника */
  inWater = false;
  waterSpeed = 0;
  waterSurfaceY = 0;
  /** Залишок cooldown повторного входу у воду після стрибка, мс */
  waterExitMs = 0;
  deathCause: "fire" | "enemy" | "fall" | "water" | null = null;
  /** Поточний візуальний кадр (для накладки обгоряння) */
  frameName: FrameName = "idle";
  /** Поточний кут нахилу літачка на екрані, градуси */
  private glideAngle = 0;
  private currentBodyMode: "normal" | "glide" | "boat" | "frog" | "shell" = "normal";
  /** Форма жабки доступна на рівні (виставляє GameScene) */
  frogEnabled = false;
  /** Форма черепахи доступна на рівні (виставляє GameScene) */
  shellEnabled = false;
  /** Панцир: тримає один удар, потім тріскає */
  readonly shellGuard = new ShellGuard();
  /** Чи стоїть гравець у чорнилі (виставляє GameScene) */
  inInk = false;
  private attackHeldMs = 0;
  private readonly chargeState = new ChargeState();
  private prevJumpHeld = false;
  private groundHeldMs = 0;
  /** Триває стрибок жабки (до апогею) */
  private leaping = false;
  /** Чи в зоні висхідного вітру (виставляє GameScene) */
  inWind = false;
  /** Який вітер діє зараз (виставляє сцена разом з inWind) */
  wind: WindEffect | null = null;
  private runClock = 0;
  private idleClock = 0;
  private foldMs = 0;
  private landMs = 0;
  private prevState: StateName = "fall";

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
        this.chargeState,
        new ShellState(),
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
    return s !== "hurt" && s !== "dead" && s !== "charge" && s !== "shell";
  }

  /** Хітбокс меча, поки він активний; інакше null. */
  swordBox(): Box | null {
    if (!this.attack.active) return null;
    const b = this.body as Phaser.Physics.Arcade.Body;
    return swordHitbox({ x: b.x, y: b.y, width: b.width, height: b.height }, this.ctx.facing);
  }

  /** Шкода від ворога/вогню. Повертає true, якщо шкода застосована. */
  takeDamage(amount: number, fromX: number): boolean {
    // Панцир тримає один удар: шкоди немає, але панцир тріскає й ніндзя розкладається
    if (this.machine.name === "shell" && !this.health.invulnerable && this.shellGuard.block()) {
      this.health.invulnerableMs = tuning.shell.blockInvulnerableMs;
      this.scene.cameras.main.shake(80, 0.004);
      return true;
    }
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

  /** Миттєва смерть (падіння в прірву, потоплення): зупиняємо тіло й вимикаємо керування. */
  die(cause: "fire" | "fall" | "enemy" | "water"): void {
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

  /** Заряд присіду жабки 0…1 (для візуалу). */
  get charge(): number {
    return this.machine.name === "charge" ? chargeFraction(this.chargeState.chargeMs) : 0;
  }

  /** Шкода від вогню за кадр: без невразливості й відкидання, зате росте обгорілість. */
  applyFire(dtSec: number, dps: number = tuning.fire.damagePerSecond): void {
    if (this.health.dead) return;
    const dmg = dps * dtSec;
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
    this.shellGuard.update(deltaMs);
    if (input.attackPressed && this.canAttack) this.attack.start();
    if (!this.canAttack) this.attack.phase = "idle";
    this.attack.update(deltaMs);

    ctx.input =
      this.machine.name === "dead"
        ? { ...input, left: false, right: false, jumpHeld: false, jumpPressed: false }
        : input;
    ctx.dt = deltaMs / 1000;
    ctx.frogEnabled = this.frogEnabled;
    // Утримання Jump на землі (для заряду жабки) і тап із відкладеним стрибком
    const held = ctx.input.jumpHeld;
    const onGroundNow = body.blocked.down || body.touching.down;
    ctx.jumpTap =
      this.frogEnabled &&
      this.prevJumpHeld &&
      !held &&
      onGroundNow &&
      this.groundHeldMs < tuning.frog.chargeStartMs &&
      this.machine.name !== "charge";
    this.groundHeldMs = held && onGroundNow ? this.groundHeldMs + deltaMs : 0;
    ctx.groundHeldMs = this.groundHeldMs;
    this.prevJumpHeld = held;
    this.waterExitMs = Math.max(0, this.waterExitMs - deltaMs);
    ctx.inWind = this.inWind;
    ctx.inInk = this.inInk;
    // Утримання Attack на землі складає панцир (лише на рівнях із shell)
    this.attackHeldMs = input.attackHeld && onGroundNow ? this.attackHeldMs + deltaMs : 0;
    ctx.shellReady = this.shellGuard.ready;
    ctx.shellRequested = shellWanted({
      enabled: this.shellEnabled,
      ready: this.shellGuard.ready,
      onGround: onGroundNow,
      attackHeldMs: this.attackHeldMs,
    });
    ctx.wind = this.inWind ? this.wind : null;
    ctx.onGround = body.blocked.down || body.touching.down;
    ctx.vx = body.velocity.x;
    ctx.vy = body.velocity.y;

    // Coyote time і input buffer рахуються в мілісекундах
    ctx.coyoteMs = ctx.onGround ? 0 : ctx.coyoteMs + deltaMs;
    ctx.jumpBufferMs = ctx.input.jumpPressed ? 0 : ctx.jumpBufferMs + deltaMs;

    if (this.inWater && !this.dead) {
      const step = stepBoat({
        input,
        blockedLeft: body.blocked.left,
        blockedRight: body.blocked.right,
        vx: ctx.vx,
        bodyY: body.y,
        targetY: this.waterSurfaceY - FEET_BELOW_CENTER + 20,
        waterSpeed: this.waterSpeed,
        dt: ctx.dt,
      });
      ctx.vx = step.vx;
      ctx.vy = step.vy;
      if (step.facing !== 0) ctx.facing = step.facing;
      if (step.exit) {
        this.inWater = false;
        this.waterExitMs = tuning.boat.exitCooldownMs;
        body.setAllowGravity(true);
        this.machine.transition("jump", ctx);
      }
    } else {
      this.machine.update(ctx);
    }
    body.setVelocity(ctx.vx, ctx.vy);
    this.updateVisual(ctx);
  }

  private frameFor(ctx: PlayerContext): FrameName {
    const state = this.machine.name;
    if (state === "dead") return "fall";
    if (state === "hurt") return "hurt";
    // Складання в літачок і назад: короткий проміжний кадр замість миттєвої підміни
    if (state !== this.prevState && (state === "glide" || this.prevState === "glide")) {
      this.foldMs = tuning.player.foldMs;
    }
    // Амортизація приземлення після польоту або падіння
    if (
      (this.prevState === "fall" || this.prevState === "glide") &&
      (state === "idle" || state === "run")
    ) {
      this.landMs = tuning.player.landMs;
    }
    if (state === "jump" && this.prevState === "charge") this.leaping = true;
    if (state !== "jump") this.leaping = false;
    this.prevState = state;
    if (this.foldMs > 0) {
      this.foldMs -= ctx.dt * 1000;
      return "fold";
    }
    if (this.inWater) return "boat";
    if (state === "glide") return "glide";
    if (state === "charge") return "frog";
    if (state === "shell") return "shell";
    if (state === "jump" && this.leaping && ctx.vy < 0) return "frogLeap";
    if (this.attack.busy) return "attack";
    if (this.landMs > 0) {
      this.landMs -= ctx.dt * 1000;
      if (state === "idle" || state === "run") return "land";
    }
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
        // «Дихання»: два кадри idle по черзі
        this.idleClock += ctx.dt * 1000;
        return Math.floor(this.idleClock / tuning.player.idleFrameMs) % 2 === 0 ? "idle" : "idle2";
    }
  }

  private updateVisual(ctx: PlayerContext): void {
    this.setFlipX(ctx.facing < 0);
    this.frameName = this.frameFor(ctx);
    const key = TEX.ninja(this.frameName);
    if (this.texture.key !== key) this.setTexture(key);
    // Миготіння під час невразливості
    this.setAlpha(blinkVisible(this.health.invulnerableMs) ? 1 : 0.35);
    this.setBodyMode(
      this.machine.name === "glide",
      this.inWater,
      this.machine.name === "charge",
      this.machine.name === "shell",
    );
    let angle = 0;
    if (this.machine.name === "dead") {
      angle = ctx.facing * -80;
    } else if (this.inWater) {
      angle = Math.sin(this.scene.time.now / 160) * 4;
    } else {
      angle = this.updateGlideAngle(ctx);
    }
    this.setAngle(angle);
    this.updateSlash(ctx);
  }

  /** Тіло планера/човника нижче й ширше; гравітація світу вимикається під час польоту або плавання. */
  private setBodyMode(glide: boolean, inWater = false, frog = false, shell = false): void {
    const next = inWater ? "boat" : glide ? "glide" : frog ? "frog" : shell ? "shell" : "normal";
    if (next === this.currentBodyMode) return;
    this.currentBodyMode = next;
    const spec =
      next === "boat"
        ? tuning.boat.body
        : next === "glide"
          ? tuning.glide.body
          : next === "frog"
            ? tuning.frog.body
            : next === "shell"
              ? tuning.shell.body
              : tuning.player.body;
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(spec.width, spec.height, false);
    body.setOffset(spec.offsetX, spec.offsetY);
    // Гравітація світу вимкнена лише в польоті планера й на воді; у присіді жабки діє, щоб тіло стояло на землі
    body.setAllowGravity(next === "normal" || next === "frog" || next === "shell");
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
