// Типи опису рівня. Рівень — звичайний TS-об'єкт, а не код у сцені.
export interface Point {
  x: number;
  y: number;
}

/** Прямокутна платформа: x, y — лівий верхній кут. */
export interface PlatformDef {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Ворог, що ходить між двома точками. y — рівень ніг (верх платформи). */
export interface EnemyDef {
  x: number;
  y: number;
  patrolLeft: number;
  patrolRight: number;
}

/** Вогняна зона: x, y — лівий верхній кут області шкоди; полум'я стоїть на нижній межі. */
export interface FireDef {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Зона висхідного вітру: піднімає планер, шкоди не завдає. */
export interface WindDef {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Чекпоінт: x — центр, y — рівень ніг (верх платформи). */
export interface CheckpointDef {
  x: number;
  y: number;
}

/** Фініш: x — центр, y — рівень ніг. Дотик до воріт завершує рівень. */
export interface FinishDef {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface LevelDef {
  id: string;
  name: string;
  /** Розмір світу в пікселях */
  width: number;
  height: number;
  /** Де з'являється гравець (низ спрайта по центру) */
  spawn: Point;
  platforms: PlatformDef[];
  enemies: EnemyDef[];
  fires: FireDef[];
  winds: WindDef[];
  checkpoints: CheckpointDef[];
  finish: FinishDef;
}
