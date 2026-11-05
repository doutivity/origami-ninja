// Ядро згоди (Consent Mode v2). Без DOM і без Phaser: усе залежне від середовища передається ззовні,
// тому логіка тестується без браузера. До згоди жодних запитів до Google і жодних cookies.

export type ConsentStatus = "granted" | "denied";

export interface StoredConsent {
  status: ConsentStatus;
  version: string;
}

/** Мінімальний інтерфейс сховища (localStorage). */
export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface ConsentConfig {
  /** GA4 measurement ID (G-…); порожній — gtag.js не використовується */
  gaId: string;
  /** Контейнер GTM (GTM-…); порожній — gtm.js не використовується */
  gtmId: string;
  /** Поточна версія політики конфіденційності */
  version: string;
  storageKey: string;
}

type DataLayerItem = unknown;

/** Вікно, яким користується ядро (у тестах — підроблений об'єкт). */
export interface ConsentWindow {
  dataLayer?: DataLayerItem[];
  gtag?: (...args: unknown[]) => void;
  [flag: `ga-disable-${string}`]: boolean | undefined;
}

export interface ConsentEnv {
  win: ConsentWindow;
  /** null — сховище недоступне (приватний режим, заблоковане) */
  storage: KeyValueStorage | null;
  /** Додає <script async src> на сторінку */
  loadScript(src: string): void;
  /** Поточні cookies (document.cookie) */
  readCookies(): string;
  /** Записує cookie-рядок (document.cookie = …) */
  writeCookie(cookie: string): void;
  hostname: string;
  basePath: string;
}

export interface ConsentUi {
  show(reason: "initial" | "settings"): void;
  hide(): void;
}

export const parseStored = (raw: string | null, version: string): StoredConsent | null => {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as Partial<StoredConsent>;
    if ((v.status === "granted" || v.status === "denied") && v.version === version) {
      return { status: v.status, version: v.version };
    }
  } catch {
    // пошкоджений запис — вважаємо, що вибору не було
  }
  return null;
};

/** Рядки Set-Cookie, що видаляють усі cookies `_ga*` (для хоста, батьківських доменів і шляхів). */
export function gaCookieDeletions(
  cookieHeader: string,
  hostname: string,
  basePath: string,
): string[] {
  const names = cookieHeader
    .split(";")
    .map((c) => c.split("=")[0]?.trim() ?? "")
    .filter((n) => n.startsWith("_ga"));
  const parts = hostname.split(".");
  const domains: (string | null)[] = [null];
  for (let i = 0; i < parts.length - 1; i++) domains.push(`.${parts.slice(i).join(".")}`);
  const paths = Array.from(new Set(["/", basePath]));
  const out: string[] = [];
  for (const name of names) {
    for (const path of paths) {
      for (const domain of domains) {
        out.push(
          `${name}=; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; path=${path}${domain ? `; domain=${domain}` : ""}`,
        );
      }
    }
  }
  return out;
}

export class ConsentManager {
  status: ConsentStatus | null = null;
  private scriptsLoaded = false;

  private readonly cfg: ConsentConfig;
  private readonly env: ConsentEnv;
  private readonly ui: ConsentUi;

  constructor(cfg: ConsentConfig, env: ConsentEnv, ui: ConsentUi) {
    this.cfg = cfg;
    this.env = env;
    this.ui = ui;
  }

  get enabled(): boolean {
    return this.cfg.gaId !== "" || this.cfg.gtmId !== "";
  }

  /** Готує dataLayer/gtag, ставить дефолт «все заборонено» і показує банер, якщо вибору ще немає. */
  init(): void {
    if (!this.enabled) return;
    const w = this.env.win;
    w.dataLayer = w.dataLayer ?? [];
    const layer = w.dataLayer;
    // Офіційний gtag кладе в dataLayer саме об'єкт arguments, а не масив
    w.gtag =
      w.gtag ??
      function gtag() {
        // biome-ignore lint/complexity/noArguments: gtag.js очікує об'єкт arguments
        layer.push(arguments);
      };
    // Consent Mode v2: дефолт до завантаження будь-яких скриптів Google
    this.gtag("consent", "default", {
      analytics_storage: "denied",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
    });

    const stored = this.read();
    if (stored?.status === "granted") this.applyGranted();
    else if (stored?.status === "denied") this.applyDenied(false);
    else this.ui.show("initial");
    this.status = stored?.status ?? null;
  }

  accept(): void {
    if (!this.enabled) return;
    this.status = "granted";
    this.write("granted");
    this.applyGranted();
    this.ui.hide();
  }

  decline(): void {
    if (!this.enabled) return;
    this.status = "denied";
    this.write("denied");
    this.applyDenied(true);
    this.ui.hide();
  }

  /** Посилання «Cookie settings» у footer знову відкриває банер. */
  openSettings(): void {
    if (this.enabled) this.ui.show("settings");
  }

  /** Подія аналітики: без згоди нічого не робить. */
  track(name: string, params: Record<string, unknown> = {}): void {
    if (!this.enabled || this.status !== "granted") return;
    if (this.cfg.gaId) this.gtag("event", name, params);
    else this.env.win.dataLayer?.push({ event: name, ...params });
  }

  private gtag(...args: unknown[]): void {
    this.env.win.gtag?.(...args);
  }

  private applyGranted(): void {
    const { gaId, gtmId } = this.cfg;
    if (gaId) this.env.win[`ga-disable-${gaId}`] = false;
    // Лише analytics_storage; рекламні параметри лишаються denied назавжди
    this.gtag("consent", "update", { analytics_storage: "granted" });
    if (this.scriptsLoaded) return;
    this.scriptsLoaded = true;
    if (gaId) {
      this.gtag("js", new Date());
      this.gtag("config", gaId);
      this.env.loadScript(
        `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(gaId)}`,
      );
    }
    if (gtmId) {
      this.env.win.dataLayer?.push({ "gtm.start": Date.now(), event: "gtm.js" });
      this.env.loadScript(
        `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(gtmId)}`,
      );
    }
  }

  /** Відмова або відкликання: вимикаємо GA і прибираємо cookies. wipe=false — лише при завантаженні сторінки. */
  private applyDenied(wipe: boolean): void {
    if (this.cfg.gaId) this.env.win[`ga-disable-${this.cfg.gaId}`] = true;
    this.gtag("consent", "update", { analytics_storage: "denied" });
    if (wipe || this.env.readCookies().includes("_ga")) {
      for (const c of gaCookieDeletions(
        this.env.readCookies(),
        this.env.hostname,
        this.env.basePath,
      )) {
        this.env.writeCookie(c);
      }
    }
  }

  private read(): StoredConsent | null {
    try {
      return parseStored(this.env.storage?.getItem(this.cfg.storageKey) ?? null, this.cfg.version);
    } catch {
      return null;
    }
  }

  private write(status: ConsentStatus): void {
    try {
      this.env.storage?.setItem(
        this.cfg.storageKey,
        JSON.stringify({ status, version: this.cfg.version }),
      );
    } catch {
      // сховище недоступне: вибір діє до перезавантаження
    }
  }
}
