// Модуль згоди: окремий малий скрипт без Phaser, однаковий для всіх сторінок.
// Підключається лише коли задано GA_MEASUREMENT_ID або GTM_CONTAINER_ID.
import { createBannerUi } from "./banner.ts";
import {
  type ConsentEnv,
  ConsentManager,
  type ConsentWindow,
  type KeyValueStorage,
} from "./consent.ts";
import { CONSENT_STORAGE_KEY, POLICY_VERSION } from "./policy.ts";
import { setTracker } from "./track.ts";

function safeStorage(): KeyValueStorage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

const env: ConsentEnv = {
  win: window as unknown as ConsentWindow,
  storage: safeStorage(),
  loadScript(src) {
    const s = document.createElement("script");
    s.async = true;
    s.src = src;
    document.head.append(s);
  },
  readCookies: () => document.cookie,
  writeCookie(cookie) {
    // biome-ignore lint/suspicious/noDocumentCookie: видалення cookies _ga* при відкликанні згоди
    document.cookie = cookie;
  },
  hostname: window.location.hostname,
  basePath: __BASE_PATH__,
};

// Посилання на політику з урахуванням BASE_PATH
const privacyHref = `${__BASE_PATH__}privacy/`;

// Циклічність: UI викликає менеджер, менеджер викликає UI
let manager: ConsentManager;
const ui = createBannerUi(privacyHref, {
  accept: () => manager.accept(),
  decline: () => manager.decline(),
});
manager = new ConsentManager(
  { gaId: __GA_ID__, gtmId: __GTM_ID__, version: POLICY_VERSION, storageKey: CONSENT_STORAGE_KEY },
  env,
  ui,
);
setTracker((name, params) => manager.track(name, params));
manager.init();

for (const el of document.querySelectorAll("[data-cookie-settings]")) {
  el.addEventListener("click", () => manager.openSettings());
}
