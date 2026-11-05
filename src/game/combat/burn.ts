// Обгоряння паперу: чиста логіка (без Phaser). Рівень 0…1 росте від шкоди вогню й не спадає до респавну.
import { tuning } from "../tuning.ts";

/** Новий рівень обгоряння після шкоди від вогню. */
export const burnAfter = (burn: number, damage: number, maxHp: number): number =>
  Math.min(1, Math.max(0, burn + damage / maxHp));

/** Крок маски 0…steps: 0 — не обгоріло (накладка прихована). Змінюється рідко, тож маска оновлюється нечасто. */
export function burnStep(burn: number, steps: number = tuning.burn.steps): number {
  if (burn <= 0) return 0;
  return Math.max(1, Math.min(steps, Math.ceil(burn * steps)));
}

// Фігура в текстурі 128×128 займає приблизно від y=2 (голова) до y=125 (ноги)
export const FIGURE_TOP = 2;
export const FIGURE_BOTTOM = 125;

/** Детермінований генератор (mulberry32): однакові маски при кожній збірці. */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Рваний край обгорілої області на кроці step: масив [x, y] для x = 0…size з кроком 8. */
export function ragged(step: number, steps: number, size = 128): [number, number][] {
  const base = FIGURE_BOTTOM - (step / steps) * (FIGURE_BOTTOM - FIGURE_TOP);
  const rand = rng(1234 + step * 97);
  const pts: [number, number][] = [];
  for (let x = 0; x <= size; x += 8) {
    pts.push([x, base + (rand() - 0.5) * 2 * tuning.burn.edgeRoughness]);
  }
  return pts;
}

/** Полігон маски «обгоріла область»: усе нижче рваного краю. */
export function burnedPolygon(step: number, steps: number, size = 128): string {
  const edge = ragged(step, steps, size);
  const pts = [`0,${size}`, ...edge.map(([x, y]) => `${x},${y.toFixed(1)}`), `${size},${size}`];
  return pts.join(" ");
}

/** Полігон смужки жару вздовж краю: між краєм і краєм мінус edgeWidth. */
export function emberPolygon(step: number, steps: number, size = 128): string {
  const edge = ragged(step, steps, size);
  const top = edge.map(([x, y]) => `${x},${(y - tuning.burn.edgeWidth).toFixed(1)}`);
  const bottom = [...edge].reverse().map(([x, y]) => `${x},${(y + 2).toFixed(1)}`);
  return [...top, ...bottom].join(" ");
}
