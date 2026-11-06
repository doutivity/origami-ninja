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

/** Вид вітру: lift — висхідний потік, down — спадний, ring — термальне кільце з поштовхом за напрямом. */
export type WindKind = "lift" | "down" | "ring";

/** Зона вітру: впливає лише на планер, шкоди не завдає. */
export interface WindDef {
  x: number;
  y: number;
  width: number;
  height: number;
  /** За замовчуванням "lift" */
  kind?: WindKind;
  /** Напрямок поштовху кільця (за замовчуванням праворуч); довжина не важлива */
  dir?: Point;
  /** Id флюгера, що вмикає зону: до удару мечем зона неактивна */
  gate?: string;
}

/** Флюгер-перемикач: удар мечем відкриває вітрові тунелі з таким gate. y — рівень основи (верх платформи). */
export interface VaneDef {
  id: string;
  x: number;
  y: number;
}

/** Паперовий журавлик: висить у повітрі, гойдається й пікірує на гравця. */
export interface CraneDef {
  x: number;
  y: number;
  /** Піврозмах горизонтального гойдання, px */
  range: number;
}

/** Чорнильна пляма на землі: x, y — лівий верхній кут (y — верх платформи). Сповільнює біг і стрибок. */
export interface InkDef {
  x: number;
  y: number;
  width: number;
}

/** Паперова стіна, яку можна розрізати. y — верх; низ (y + height) має лежати на платформі. */
export interface CutDef {
  x: number;
  y: number;
  width: number;
  height: number;
  /** «Товста» стіна: меч її не бере, лише ривок */
  tough?: boolean;
}

/** Водна зона: x, y — лівий верхній кут поверхні води. */
export interface WaterDef {
  x: number;
  y: number;
  width: number;
  height: number;
  /** Швидкість поверхневої течії в пікселях/с (додатна — праворуч) */
  currentSpeed?: number;
  /** Хвилі: поверхня коливається на ±amp px, довжина хвилі length px, швидкість speed рад/с */
  wave?: { amp: number; length: number; speed: number };
}

/** Риба-стрибун: x — місце стрибка; y береться з води під нею. */
export interface FishDef {
  x: number;
  /** Зсув у циклі стрибків, мс (щоб риби не стрибали хором) */
  offsetMs?: number;
  /** Напрямок дуги (за замовчуванням праворуч) */
  dir?: -1 | 1;
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
  bg?: "mountains" | "bamboo" | "pagoda" | "canyon" | "marsh" | "workshop" | "sea";
  /** Вертикальний рівень: ціль угорі, перевірка досяжності замість прірви для планера */
  vertical?: boolean;
  /** Вітрило в човнику: утримання Attack у воді прискорює проти течії */
  sail?: boolean;
  /** Планер вимкнено (закрите приміщення: утримання Jump у падінні нічого не складає) */
  noGlide?: boolean;
  /** Чи доступний ривок-сюрікен (подвійний тап Attack) */
  dash?: boolean;
  /** Чи доступна форма черепахи (панцир при утриманні Attack) */
  shell?: boolean;
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
  cranes?: CraneDef[];
  inks?: InkDef[];
  cuts?: CutDef[];
  fishes?: FishDef[];
  vanes?: VaneDef[];
  beams?: BeamDef[];
  rise?: RiseDef;
  checkpoints: CheckpointDef[];
  finish: FinishDef;
}
