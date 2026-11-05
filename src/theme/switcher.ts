// Перемикач теми System / Light / Dark. Вибір зберігається в localStorage (усе в try/catch).
import { themes } from "./tokens.ts";

const KEY = "origami-ninja:theme";
type Choice = "system" | "light" | "dark";

function read(): Choice {
  try {
    const v = localStorage.getItem(KEY);
    if (v === "light" || v === "dark") return v;
  } catch {
    // сховище недоступне — працюємо за системною темою
  }
  return "system";
}

function write(choice: Choice): void {
  try {
    if (choice === "system") localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, choice);
  } catch {
    // ігноруємо: вибір просто не збережеться
  }
}

function apply(choice: Choice): void {
  const root = document.documentElement;
  if (choice === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", choice);
  // theme-color: при примусовій темі однаковий колір для обох meta
  const metas = document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]');
  const dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  metas.forEach((m) => {
    const media = m.getAttribute("media") ?? "";
    const own = media.includes("dark") ? themes.dark.bg : themes.light.bg;
    const forced = choice === "system" ? own : themes[choice].bg;
    m.setAttribute("content", forced);
  });
  void dark;
}

function init(): void {
  const group = document.querySelector<HTMLElement>("[data-theme-switcher]");
  if (!group) return;
  const buttons = Array.from(group.querySelectorAll<HTMLButtonElement>("button[data-theme-value]"));
  const mark = (choice: Choice) => {
    for (const b of buttons)
      b.setAttribute("aria-pressed", String(b.dataset.themeValue === choice));
  };
  const current = read();
  apply(current);
  mark(current);
  for (const b of buttons) {
    b.addEventListener("click", () => {
      const choice = b.dataset.themeValue as Choice;
      write(choice);
      apply(choice);
      mark(choice);
    });
  }
}

init();
