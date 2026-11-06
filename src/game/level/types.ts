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
  /** Карниз: проходиться знизу, тримає лише зверху */
  oneWay?: boolean;
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

/** Водна зона: x, y — лівий верхній кут поверхні води. */
export interface WaterDef {
  x: number;
  y: number;
  width: number;
  height: number;
  /** Швидкість поверхневої течії в пікселях/с (додатна — праворуч) */
  currentSpeed?: number;
}

/** Платформа-карниз пагоди можна проходити знизу (one-way): задається прапорцем у PlatformDef. */

/** Лучник на платформі: стріляє вогняними стрілами в бік гравця. y — рівень ніг. */
export interface ArcherDef {
  x: number;
  y: number;
}

/** Падаюча палаюча балка: x — центр, падає від topY до landY (верх платформи). */
export interface BeamDef {
  x: number;
  topY: number;
  landY: number;
  /** Пауза між падіннями й зсув першого падіння, мс */
  intervalMs: number;
  offsetMs: number;
}

/** Стіна вогню, що піднімається: швидкість береться з tuning.rise, тут лише вмикання. */
export interface RiseDef {
  /** Множник швидкості (1 — стандарт) */
  speedScale?: number;
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
  /** Текстура фону (за замовчуванням "mountains") */
  bg?: "mountains" | "bamboo" | "pagoda";
  /** Вертикальний рівень: ціль угорі, перевірка досяжності замість прірви для планера */
  vertical?: boolean;
  /** Чи доступна форма жабки (заряджений стрибок) */
  frog?: boolean;
  /** Підказка, що показується на старті рівня */
  hint?: string;
  /** Розмір світу в пікселях */
  width: number;
  height: number;
  /** Де з'являється гравець (низ спрайта по центру) */
  spawn: Point;
  platforms: PlatformDef[];
  enemies: EnemyDef[];
  fires: FireDef[];
  winds: WindDef[];
  waters?: WaterDef[];
  archers?: ArcherDef[];
  beams?: BeamDef[];
  rise?: RiseDef;
  checkpoints: CheckpointDef[];
  finish: FinishDef;
}
