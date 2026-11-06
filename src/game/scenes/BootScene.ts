// BootScene: один раз генерує всі текстури з тих самих форм, що й сайт, і запускає гру.
import Phaser from "phaser";
import { boat, glider, PUPPET_POSES, type PuppetPoseName, puppetFigure } from "../../gfx/ninja.ts";
import {
  bambooForest,
  blobShadow,
  checkpointFlag,
  finishGate,
  flameCluster,
  mountains,
  oni,
  slash,
  waterSurface,
} from "../../gfx/scene.ts";
import { burnedPolygon, emberPolygon } from "../combat/burn.ts";
import { currentPalette, renderScale } from "../env.ts";
import { LEVELS } from "../level/index.ts";
import { rasterize, svgDoc } from "../rasterize.ts";
import { tuning } from "../tuning.ts";

/** Кадри гравця: пози ляльки, складений у літачок планер та орігамі-човник. */
export type FrameName = PuppetPoseName | "glide" | "boat";

export const TEX = {
  ninja: (name: FrameName) => `ninja-${name}`,
  bg: "bg-mountains",
  bgBamboo: "bg-bamboo",
  water: "water-surface",
  oni: (frame: number) => `oni-${frame}`,
  slash: "slash",
  flame: "flame",
  ember: "ember",
  burnt: (name: FrameName) => `burnt-${name}`,
  glow: (name: FrameName) => `glow-${name}`,
  gust: "gust",
  checkpoint: (on: boolean) => (on ? "checkpoint-on" : "checkpoint-off"),
  finish: "finish",
  shadow: "shadow",
  burnMask: (step: number) => `burn-mask-${step}`,
  burnEdge: (step: number) => `burn-edge-${step}`,
  platform: (levelIdOrIdx: string | number, i?: number) =>
    typeof levelIdOrIdx === "number"
      ? `platform-${levelIdOrIdx}`
      : `platform-${levelIdOrIdx}-${i ?? 0}`,
} as const;

const setScene = (name: string) => {
  const el = document.getElementById("game");
  if (el) el.dataset.scene = name;
};

export class BootScene extends Phaser.Scene {
  constructor() {
    super("BootScene");
  }

  create(): void {
    setScene("BootScene");
    void this.generate().then(() => this.scene.start("GameScene"));
  }

  private async generate(): Promise<void> {
    const p = currentPalette();
    const rs = renderScale();
    const jobs: Promise<void>[] = [];
    const add = (key: string, svg: string) =>
      jobs.push(
        rasterize(svg).then((img) => {
          this.textures.addImage(key, img);
        }),
      );

    // Кадри ляльки: 128×128 px текстура на 64 умовні одиниці
    const frames = new Map<FrameName, HTMLImageElement>();
    for (const name of Object.keys(PUPPET_POSES) as PuppetPoseName[]) {
      jobs.push(
        rasterize(svgDoc(128, 128, "0 0 64 64", puppetFigure(p, PUPPET_POSES[name]))).then(
          (img) => {
            this.textures.addImage(TEX.ninja(name), img);
            frames.set(name, img);
          },
        ),
      );
    }

    // Планер: літачок опущено до низу текстури, щоб низ тіла збігався зі стоячим
    jobs.push(
      rasterize(
        svgDoc(128, 128, "0 0 64 64", `<g transform="translate(0 14)">${glider(p)}</g>`),
      ).then((img) => {
        this.textures.addImage(TEX.ninja("glide"), img);
        frames.set("glide", img);
      }),
    );

    // Човник: сампан на воді (опущений донизу текстури)
    jobs.push(
      rasterize(
        svgDoc(128, 128, "0 0 64 64", `<g transform="translate(0 10)">${boat(p)}</g>`),
      ).then((img) => {
        this.textures.addImage(TEX.ninja("boat"), img);
        frames.set("boat", img);
      }),
    );
    // Чекпоінти, фінішні ворота й тінь-пляма
    add(TEX.checkpoint(false), svgDoc(80, 180, "0 0 40 90", checkpointFlag(p, false)));
    add(TEX.checkpoint(true), svgDoc(80, 180, "0 0 40 90", checkpointFlag(p, true)));
    add(TEX.finish, svgDoc(160, 280, "-4 0 88 140", finishGate(p)));
    add(TEX.shadow, svgDoc(128, 32, "0 0 64 16", blobShadow(p)));

    // Смужка вітру
    add(
      TEX.gust,
      svgDoc(12, 56, "0 0 6 28", `<rect x="1.5" width="3" height="28" rx="1.5" fill="#fff"/>`),
    );

    // Водна поверхня
    add(TEX.water, svgDoc(120, 60, "0 0 120 60", waterSurface(p, 120, 60)));

    // Вогонь: кущ полум'я й біла «іскра» (колір задає емітер)
    add(TEX.flame, svgDoc(240, 260, "0 0 120 130", flameCluster(p)));
    add(TEX.ember, svgDoc(16, 16, "0 0 8 8", '<polygon points="4,0 8,4 4,8 0,4" fill="#fff"/>'));

    // Маски обгоряння: по одній на крок, запікаються один раз
    for (let step = 1; step <= tuning.burn.steps; step++) {
      add(
        TEX.burnMask(step),
        svgDoc(
          128,
          128,
          "0 0 128 128",
          `<polygon points="${burnedPolygon(step, tuning.burn.steps)}" fill="#fff"/>`,
        ),
      );
      add(
        TEX.burnEdge(step),
        svgDoc(
          128,
          128,
          "0 0 128 128",
          `<polygon points="${emberPolygon(step, tuning.burn.steps)}" fill="#fff"/>`,
        ),
      );
    }

    // Ворог (2 кадри ходьби) і дуга удару мечем
    for (const f of [0, 1] as const) add(TEX.oni(f), svgDoc(96, 120, "0 0 24 30", oni(p, f)));
    add(TEX.slash, svgDoc(200, 120, "0 0 100 60", slash(p)));

    // Паралакс-фони: гори та бамбуковий ліс
    const bgW = 1920;
    const bgH = 540;
    add(TEX.bg, svgDoc(bgW, bgH, `0 0 ${bgW} ${bgH}`, mountains(p, bgW, bgH, 90)));
    add(TEX.bgBamboo, svgDoc(bgW, bgH, `0 0 ${bgW} ${bgH}`, bambooForest(p, bgW, bgH, 50)));

    // Платформи для всіх рівнів
    LEVELS.forEach((lvl) => {
      lvl.platforms.forEach((pl, i) => {
        const lines: string[] = [];
        for (let y = 22; y < pl.height; y += 18) {
          lines.push(`M0,${y}H${pl.width}`);
        }
        const inner =
          `<rect width="${pl.width}" height="${pl.height}" fill="${p.shade}"/>` +
          `<path d="${lines.join("")}" stroke="${p.ink}" stroke-opacity="0.16" stroke-width="1" fill="none"/>` +
          `<rect width="${pl.width}" height="6" fill="${p.ink}"/>`;
        const svg = svgDoc(
          Math.round(pl.width * rs),
          Math.round(pl.height * rs),
          `0 0 ${pl.width} ${pl.height}`,
          inner,
        );
        add(TEX.platform(lvl.id, i), svg);
        if (lvl.id === "mountain") {
          add(TEX.platform(i), svg);
        }
      });
    });

    await Promise.all(jobs);

    // Накладки обгоряння з тих самих кадрів: обвуглений папір і розжарена кромка.
    // Через source-atop/source-in форма збігається зі щілинами ляльки пікселем у піксель.
    for (const [name, img] of frames) {
      this.textures.addCanvas(TEX.burnt(name), tint(img, "source-atop", "#6b4a34", 0.9));
      this.textures.addCanvas(TEX.glow(name), tint(img, "source-in", "#ffb347", 1));
    }
  }
}

/** Копія кадру, залитого кольором: source-atop затемнює існуючі пікселі, source-in дає силует. */
function tint(
  img: HTMLImageElement,
  mode: GlobalCompositeOperation,
  color: string,
  alpha: number,
): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = img.naturalWidth;
  c.height = img.naturalHeight;
  const ctx = c.getContext("2d");
  if (!ctx) return c;
  ctx.drawImage(img, 0, 0);
  ctx.globalCompositeOperation = mode;
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, c.width, c.height);
  return c;
}
