/** Патруль між двома точками: повертає новий напрямок (-1 або 1) за поточною позицією. */
export function patrolDirection(x: number, left: number, right: number, dir: -1 | 1): -1 | 1 {
  if (x <= left) return 1;
  if (x >= right) return -1;
  return dir;
}
