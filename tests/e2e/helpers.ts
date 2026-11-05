import type { BrowserContext, Page } from "@playwright/test";
import { CONSENT_STORAGE_KEY, POLICY_VERSION } from "../../src/consent/policy.ts";

/** Тестовий GA ID, з яким збирається e2e-образ (див. docker-compose.yml, сервіс web-e2e). */
export const TEST_GA_ID = "G-E2ETEST123";

export const GOOGLE =
  /(googletagmanager|google-analytics|googleapis|gstatic|doubleclick|google)\./i;

/** Збирає помилки консолі й необроблені винятки. */
export function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(`console: ${m.text()}`);
  });
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  return errors;
}

/** Мережу до Google перехоплюємо (порожня відповідь) і фіксуємо запити. Нічого не йде в інтернет. */
export async function stubGoogle(context: BrowserContext): Promise<string[]> {
  const urls: string[] = [];
  await context.route(GOOGLE, (route) => {
    urls.push(route.request().url());
    return route.fulfill({ status: 200, contentType: "application/javascript", body: "" });
  });
  return urls;
}

/** Заздалегідь зберігає відмову, щоб банер не перекривав кнопки гри. */
export async function preDecline(page: Page): Promise<void> {
  await page.addInitScript(
    ([key, version]) => {
      try {
        localStorage.setItem(key as string, JSON.stringify({ status: "denied", version }));
      } catch {
        // сховище недоступне
      }
    },
    [CONSENT_STORAGE_KEY, POLICY_VERSION],
  );
}

export const waitForGame = (page: Page) =>
  page.waitForFunction(
    () => document.getElementById("game")?.dataset.scene === "GameScene",
    undefined,
    {
      timeout: 20_000,
    },
  );
