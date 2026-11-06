import Phaser from "phaser";
import { type Box, boxesOverlap } from "../combat/geometry.ts";
import { Archer } from "../enemies/archer.ts";
import { Crane } from "../enemies/crane.ts";
import { Enemy } from "../enemies/enemy.ts";
import { currentPalette, debugMode, hexToNumber, renderScale } from "../env.ts";
import { type DeathCause, GAME_EVENTS } from "../events.ts";
import { BurnOverlay } from "../fire/burn-overlay.ts";
import { FireZone } from "../fire/fire-zone.ts";
import { RisingFire } from "../fire/rising-fire.ts";
import { ArrowPool } from "../hazards/arrows.ts";
import { Beam } from "../hazards/beam.ts";
import { InkZone } from "../ink/ink-zone.ts";
import { InputHub } from "../input/hub.ts";
import { getLevel, nextLevel } from "../level/index.ts";
import type { LevelDef } from "../level/types.ts";
import { Checkpoint } from "../objects/checkpoint.ts";
import { Shadows } from "../objects/shadows.ts";
import { Vane } from "../objects/vane.ts";
import { Player } from "../player/player.ts";
import {
  getGovernor,
  getQuality,
  type QualityGovernor,
  qualityProfile,
  setQuality,
} from "../quality.ts";
import { tuning } from "../tuning.ts";
import { WaterZone } from "../water/water-zone.ts";
import { WindZone } from "../wind/wind-zone.ts";
import { TEX } from "./BootScene.ts";

type Phase = "playing" | "dead" | "complete";

export class GameScene extends Phaser.Scene {
  private hub!: InputHub;
  private player!: Player;
  private bg!: Phaser.GameObjects.Image;
  private currentLevelDef!: LevelDef;
  private enemies: Enemy[] = [];
  private fires: FireZone[] = [];
  private winds: WindZone[] = [];
  private waters: WaterZone[] = [];
  private beams: Beam[] = [];
  private vanes: Vane[] = [];
  private inks: InkZone[] = [];
  /** Літаючі вороги не мають колізій із платформами й тіней */
  private fliers: Enemy[] = [];
  private arrows!: ArrowPool;
  private rise?: RisingFire;
  /** Скільки мс гравець у грі після респавну: від цього залежить положення стіни вогню */
  private riseMs = 0;
  /** Усі платформи як прямокутники (для стріл) */
  private solidBoxes: Box[] = [];
  private checkpoints: Checkpoint[] = [];
  private shadows!: Shadows;
  private overlay!: BurnOverlay;
  private playerEmbers!: Phaser.GameObjects.Particles.ParticleEmitter;
  private hitboxGfx?: Phaser.GameObjects.Graphics;
  private governor!: QualityGovernor;
  private cullTimer = 0;
  private lastHp = -1;
  private phase: Phase = "playing";
  private runMs = 0;
  private overlayShownAt = 0;
  /** Мітка часу попереднього кадру: delta у Phaser згладжена, а для FPS потрібна сира */
  private lastFrameTime = 0;

  constructor() {
    super("GameScene");
  }

  create(): void {
    const el = document.getElementById("game");
    if (el) el.dataset.scene = "GameScene";
    const levelId = (this.registry.get("levelId") as string | undefined) ?? "mountain";
    const level = getLevel(levelId);
    this.currentLevelDef = level;
    const rs = renderScale();
    const cam = this.cameras.main;
    cam.setBackgroundColor(hexToNumber(currentPalette().paper));
    cam.setZoom(rs);
    this.enemies = [];
    this.fires = [];
    this.winds = [];
    this.waters = [];
    this.beams = [];
    this.vanes = [];
    this.inks = [];
    this.fliers = [];
    this.rise = undefined;
    this.riseMs = 0;
    this.solidBoxes = [];
    this.checkpoints = [];
    this.cullTimer = 0;
    this.lastHp = -1;
    this.phase = "playing";
    this.overlayShownAt = 0;
    this.lastFrameTime = 0;
    this.runMs = (this.registry.get("runMs") as number | undefined) ?? 0;
    const cpIndex = (this.registry.get("checkpoint") as number | undefined) ?? -1;
    this.registry.set("overlay", null);
    this.governor = getGovernor();

    // Паралакс рахуємо вручну від вікна камери: scrollFactor разом із zoom зсуває фон по вертикалі
    const bgKeys = {
      bamboo: TEX.bgBamboo,
      pagoda: TEX.bgPagoda,
      canyon: TEX.bgCanyon,
      marsh: TEX.bgMarsh,
      mountains: TEX.bg,
    } as const;
    const bgKey = bgKeys[level.bg ?? "mountains"];
    this.bg = this.add.image(0, 0, bgKey).setOrigin(0, 0).setDepth(-10);

    // Платформи: видимі картинки + статичні фізичні тіла
    const solids: Phaser.GameObjects.Zone[] = [];
    level.platforms.forEach((pl, i) => {
      this.add
        .image(pl.x, pl.y, TEX.platform(level.id, i))
        .setOrigin(0, 0)
        .setScale(1 / rs);
      const zone = this.add.zone(pl.x + pl.width / 2, pl.y + pl.height / 2, pl.width, pl.height);
      this.physics.add.existing(zone, true);
      // Карниз тримає лише зверху: крізь нього можна стрибати знизу й збоку
      if (pl.oneWay) {
        const sb = zone.body as Phaser.Physics.Arcade.StaticBody;
        sb.checkCollision.down = false;
        sb.checkCollision.left = false;
        sb.checkCollision.right = false;
      }
      solids.push(zone);
      this.solidBoxes.push({ x: pl.x, y: pl.y, width: pl.width, height: pl.height });
    });

    this.physics.world.setBounds(
      0,
      0,
      level.width,
      level.height + tuning.world.fallLimit * 4,
      true,
      true,
      true,
      false,
    );
    this.hub = new InputHub(this);
    const spawn = cpIndex >= 0 ? (level.checkpoints[cpIndex] ?? level.spawn) : level.spawn;
    this.player = new Player(this, spawn.x, spawn.y);
    this.player.frogEnabled = level.frog === true;
    this.player.shellEnabled = level.shell === true;
    this.physics.add.collider(this.player, solids);

    this.arrows = new ArrowPool(this);
    for (const def of level.enemies) this.enemies.push(new Enemy(this, def));
    for (const def of level.archers ?? [])
      this.enemies.push(
        new Archer(
          this,
          def,
          (x, y, dir) => this.arrows.fire(x, y, dir),
          () => (this.phase === "playing" ? { x: this.player.x, y: this.player.y } : null),
        ),
      );
    this.physics.add.collider(this.enemies, solids);
    // Журавлики літають: колізій із платформами немає, але б'ються мечем і зачіпають гравця
    for (const def of level.cranes ?? []) {
      const crane = new Crane(this, def, () =>
        this.phase === "playing" ? { x: this.player.x, y: this.player.y } : null,
      );
      this.fliers.push(crane);
      this.enemies.push(crane);
    }
    this.physics.add.overlap(this.player, this.enemies, (_p, e) => this.onEnemyContact(e as Enemy));

    this.checkpoints = level.checkpoints.map((c, i) => new Checkpoint(this, c, i <= cpIndex));
    this.add
      .image(level.finish.x, level.finish.y, TEX.finish)
      .setOrigin(0.5, 1)
      .setScale(level.finish.height / 140 / 2)
      .setDepth(5);

    for (const def of level.winds) this.winds.push(new WindZone(this, def, currentPalette()));
    for (const def of level.inks ?? []) this.inks.push(new InkZone(this, def, currentPalette()));
    for (const def of level.vanes ?? []) this.vanes.push(new Vane(this, def));
    for (const def of level.waters ?? [])
      this.waters.push(new WaterZone(this, def, currentPalette()));

    // Вогонь: зони й іскри на гравцеві (обидва з жорсткими лімітами частинок)
    const pal = currentPalette();
    const colors = [hexToNumber(pal.fire), hexToNumber(pal.accent), hexToNumber(pal.paper)];
    for (const def of level.fires) this.fires.push(new FireZone(this, def, colors));
    for (const def of level.beams ?? []) this.beams.push(new Beam(this, def, pal));
    if (level.rise) {
      this.rise = new RisingFire(
        this,
        level.width,
        spawn.y + tuning.rise.gap,
        level.rise.speedScale ?? 1,
        colors,
        hexToNumber(pal.fire),
      );
    }
    this.playerEmbers = this.add
      .particles(0, 0, TEX.ember, {
        follow: this.player,
        followOffset: { x: 0, y: -4 },
        x: { min: -14, max: 14 },
        y: { min: -30, max: 26 },
        lifespan: { min: 400, max: 800 },
        speedY: { min: -140, max: -60 },
        speedX: { min: -30, max: 30 },
        scale: { start: 0.8, end: 0 },
        alpha: { start: 1, end: 0 },
        color: colors,
        frequency: tuning.particles.emitEveryMs,
        emitting: false,
        maxAliveParticles: tuning.particles.maxOnPlayer,
      })
      .setDepth(12);
    this.overlay = new BurnOverlay(this, this.player.frameName);

    this.shadows = new Shadows(this);
    this.shadows.add(this.player, (124 - 64) * tuning.player.spriteScale - 4, 54);
    for (const e of this.enemies)
      if (!this.fliers.includes(e))
        this.shadows.add(e, (116 - 60) * tuning.enemy.spriteScale - 2, 50);

    cam.setBounds(0, 0, level.width, level.height);
    cam.startFollow(this.player, true, tuning.camera.lerp, tuning.camera.lerp);
    cam.setDeadzone(tuning.camera.deadzone.width, tuning.camera.deadzone.height);

    if (debugMode) this.hitboxGfx = this.add.graphics().setDepth(50);

    this.applyQuality();
    this.game.events.on(GAME_EVENTS.overlayAction, this.onOverlayAction, this);
    this.scene.launch("UIScene", { hub: this.hub });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.game.events.off(GAME_EVENTS.overlayAction, this.onOverlayAction, this);
      this.scene.stop("UIScene");
    });
    // Підказка рівня лише на першому проході (без чекпоінта); UIScene створюється наступним кадром
    if (level.hint && cpIndex < 0) {
      const hint = level.hint;
      this.time.delayedCall(500, () => this.registry.set("toast", hint));
    }
    if (!this.registry.get("runStarted")) {
      this.registry.set("runStarted", true);
      this.game.events.emit(GAME_EVENTS.levelStart, { level: level.id });
    }
  }

  private onEnemyContact(enemy: Enemy): void {
    if (enemy.dead || this.phase !== "playing") return;
    this.player.takeDamage(tuning.enemy.contactDamage, enemy.x);
  }

  update(time: number, delta: number): void {
    const rawDelta = this.lastFrameTime > 0 ? time - this.lastFrameTime : 0;
    this.lastFrameTime = time;
    const input = this.hub.poll();
    if (input.restartPressed) {
      this.onOverlayAction();
      if (this.phase === "playing") this.respawn();
      return;
    }
    if (this.phase === "playing") this.runMs += delta;

    this.player.tick(input, delta);
    const view = this.cameras.main.worldView;
    this.bg.setPosition(view.x * 0.7, view.y);
    for (const e of this.enemies) e.tick(delta);
    this.enemies = this.enemies.filter((e) => e.active);

    if (this.phase === "playing") this.riseMs += delta;
    this.rise?.update(this.riseMs);
    this.applyHazards(delta, time);
    this.applyFire(delta);
    for (const w of this.waters) w.update(delta / 1000);
    this.applySwordHits();
    this.syncHud();
    this.shadows.update((s) => (s.body as Phaser.Physics.Arcade.Body).blocked.down);
    if (this.phase === "playing") this.updateProgress();

    if (this.governor.update(rawDelta) === "downgrade") this.downgrade();
  }

  /** Смерть, чекпоінти й фініш. */
  private updateProgress(): void {
    const level = this.currentLevelDef;
    const b = this.player.body as Phaser.Physics.Arcade.Body;
    const box = { x: b.x, y: b.y, width: b.width, height: b.height };

    if (this.player.dead) {
      this.beginDeath(this.player.deathCause ?? "enemy");
      return;
    }
    if (this.player.y > level.height + tuning.world.fallLimit) {
      this.player.die("fall");
      this.beginDeath("fall");
      return;
    }
    this.checkpoints.forEach((cp, i) => {
      if (cp.active || !boxesOverlap(box, cp.box)) return;
      cp.activate();
      this.registry.set("checkpoint", i);
      this.registry.set("toast", `Checkpoint ${i + 1}`);
      this.game.events.emit(GAME_EVENTS.checkpoint, { index: i });
    });
    const f = level.finish;
    if (
      boxesOverlap(box, {
        x: f.x - f.width / 2,
        y: f.y - f.height,
        width: f.width,
        height: f.height,
      })
    ) {
      this.beginComplete();
    }
  }

  private beginDeath(cause: DeathCause): void {
    this.phase = "dead";
    const deaths = ((this.registry.get("deaths") as number | undefined) ?? 0) + 1;
    this.registry.set("deaths", deaths);
    this.registry.set("runMs", this.runMs);
    this.game.events.emit(GAME_EVENTS.death, { cause });
    const delay = cause === "fall" ? 250 : tuning.overlay.deathDelayMs;
    this.time.delayedCall(delay, () => this.showOverlay({ kind: "dead", cause }));
  }

  private beginComplete(): void {
    this.phase = "complete";
    this.player.locked = true;
    this.registry.set("runMs", this.runMs);
    this.game.events.emit(GAME_EVENTS.levelComplete, { ms: Math.round(this.runMs) });
    const next = nextLevel(this.currentLevelDef.id);
    this.time.delayedCall(500, () =>
      this.showOverlay({
        kind: "complete",
        timeMs: this.runMs,
        deaths: (this.registry.get("deaths") as number | undefined) ?? 0,
        levelName: this.currentLevelDef.name,
        nextLevelName: next?.name,
      }),
    );
  }

  private showOverlay(data: object): void {
    this.overlayShownAt = this.time.now;
    this.registry.set("overlay", data);
  }

  /** R або тап по оверлею: смерть → респавн на чекпоінті; фініш → повний рестарт або наступний рівень. */
  private onOverlayAction(): void {
    if (
      this.overlayShownAt === 0 ||
      this.time.now - this.overlayShownAt < tuning.overlay.inputLockMs
    )
      return;
    if (this.phase === "complete") this.restartRun();
    else if (this.phase === "dead") this.respawn();
  }

  private respawn(): void {
    this.registry.set("runMs", this.runMs);
    this.scene.restart();
  }

  private restartRun(): void {
    const next = nextLevel(this.currentLevelDef.id);
    // Новий забіг: level_start і таймер стартують знову
    this.registry.set("runStarted", false);
    if (next) {
      this.registry.set("levelId", next.id);
      this.registry.set("checkpoint", -1);
      this.registry.set("toast", next.name);
    } else {
      this.registry.set("levelId", "mountain");
      this.registry.set("checkpoint", -1);
      this.registry.set("deaths", 0);
      this.registry.set("runMs", 0);
    }
    this.scene.restart();
  }

  /** Автоматичне зниження якості (середній FPS < порогу протягом вікна). */
  private downgrade(): void {
    setQuality("low");
    this.game.events.emit(GAME_EVENTS.qualityDowngrade, { fps: Math.round(this.governor.lastFps) });
    this.applyQuality();
  }

  /** Застосовує профіль якості: масштаб рендеру, частинки, тіні, фільтри обгоряння. */
  private applyQuality(): void {
    const q = qualityProfile();
    const rs = renderScale();
    this.scale.resize(tuning.view.width * rs, tuning.view.height * rs);
    this.cameras.main.setZoom(rs);
    for (const f of this.fires) f.applyQuality(q);
    for (const w of this.winds) w.applyQuality(q);
    for (const w of this.waters) w.applyQuality(q);
    for (const bm of this.beams) bm.applyQuality(q);
    this.rise?.applyQuality(q);
    this.playerEmbers.maxAliveParticles = Math.max(
      1,
      Math.round(tuning.particles.maxOnPlayer * q.particleScale),
    );
    this.shadows.setEnabled(q.shadows);
    this.overlay.setUseFilters(q.burnFilters);
    this.game.events.emit(GAME_EVENTS.qualityChanged, getQuality());
  }

  /** Стріли лучників і палаючі балки: шкода при влучанні. */
  private applyHazards(deltaMs: number, nowMs: number): void {
    const b = this.player.body as Phaser.Physics.Arcade.Body;
    const box = { x: b.x, y: b.y, width: b.width, height: b.height };
    const playing = this.phase === "playing";
    this.arrows.update(
      deltaMs,
      this.solidBoxes,
      playing ? box : { x: -9999, y: -9999, width: 0, height: 0 },
      (x) => this.player.takeDamage(tuning.archer.arrowDamage, x),
    );
    for (const beam of this.beams) {
      beam.update(deltaMs, nowMs);
      const bb = beam.box;
      if (playing && bb && boxesOverlap(box, bb))
        this.player.takeDamage(tuning.beam.damage, beam.x);
    }
  }

  /** Вогонь і вода: шкода за секунду, обгоряння, плавання у формі човна. */
  private applyFire(deltaMs: number): void {
    const b = this.player.body as Phaser.Physics.Arcade.Body;
    const box = { x: b.x, y: b.y, width: b.width, height: b.height };
    if (this.phase === "playing") {
      const inRise = this.rise ? boxesOverlap(box, this.rise.box) : false;
      this.player.inFire = inRise || this.fires.some((f) => boxesOverlap(box, f.box));
      if (this.player.inFire)
        this.player.applyFire(
          deltaMs / 1000,
          inRise ? tuning.rise.damagePerSecond : tuning.fire.damagePerSecond,
        );

      // Вода: плавання в орігамі-човнику або потоплення при падінні у воду
      const inWater =
        this.player.waterExitMs > 0 ? undefined : this.waters.find((w) => boxesOverlap(box, w.box));
      if (inWater && !this.player.dead) {
        this.player.inWater = true;
        this.player.waterSpeed = inWater.currentSpeed;
        this.player.waterSurfaceY = inWater.surfaceY;
        if (b.y > inWater.surfaceY + 44) {
          this.player.die("water");
          this.beginDeath("water");
        }
      } else {
        this.player.inWater = false;
      }
    } else {
      this.player.inFire = false;
      this.player.inWater = false;
    }
    this.playerEmbers.emitting = this.player.inFire && !this.player.dead;
    // Чорнило: сповільнює, поки гравець на землі в смузі плями
    this.player.inInk = this.inks.some((k) => boxesOverlap(box, k.box));
    // Вітер: перша активна зона, у яку потрапив гравець (зони не перетинаються)
    const wind = this.winds.find((w) => w.active && boxesOverlap(box, w.box));
    this.player.inWind = wind !== undefined;
    this.player.wind = wind?.effect ?? null;
    this.overlay.sync(this.player, this.player.burn, this.player.frameName);

    // Раз на ~200 мс вирішуємо, яким зонам випускати іскри
    this.cullTimer -= deltaMs;
    if (this.cullTimer <= 0) {
      this.cullTimer = 200;
      const v = this.cameras.main.worldView;
      const m = tuning.particles.cullMargin;
      const near = (r: { x: number; width: number }) =>
        r.x + r.width > v.x - m && r.x < v.right + m;
      for (const f of this.fires) f.setNear(near(f.box));
      for (const w of this.winds) w.setNear(near(w.box));
    }
  }

  /** Меч у активній фазі б'є кожного ворога один раз за змах. */
  private applySwordHits(): void {
    const box = this.player.swordBox();
    if (this.hitboxGfx) {
      this.hitboxGfx.clear();
      if (box)
        this.hitboxGfx.lineStyle(2, 0xff2222, 1).strokeRect(box.x, box.y, box.width, box.height);
    }
    if (!box) return;
    this.arrows.deflect(box);
    for (const v of this.vanes) {
      if (!v.strike(box)) continue;
      for (const w of this.winds) if (w.gate === v.id) w.unlock();
      this.registry.set("toast", "The wind has shifted");
    }
    for (const e of this.enemies) {
      if (e.dead || e.lastHitSwing === this.player.attack.swing) continue;
      const b = e.body as Phaser.Physics.Arcade.Body;
      if (boxesOverlap(box, { x: b.x, y: b.y, width: b.width, height: b.height })) {
        e.lastHitSwing = this.player.attack.swing;
        e.hit(this.player.facing);
      }
    }
  }

  /** HP передаємо HUD через registry, лише коли значення змінилось. */
  private syncHud(): void {
    if (this.player.health.hp === this.lastHp) return;
    this.lastHp = this.player.health.hp;
    this.registry.set("maxHp", this.player.health.max);
    this.registry.set("hp", this.lastHp);
  }
}
