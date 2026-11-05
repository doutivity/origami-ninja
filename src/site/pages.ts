// Реєстр сторінок: звідси беруться title/description, хлібні крихти, JSON-LD, sitemap і навігація.
import { type DevlogEntry, devlog } from "../content/devlog/index.ts";
import { site } from "./config.ts";

export type PageKind = "home" | "page" | "article" | "not-found";

export interface Crumb {
  name: string;
  path: string;
}

export interface PageMeta {
  /** URL відносно BASE_PATH: "/", "/about/", "/404.html" */
  path: string;
  title: string;
  description: string;
  kind: PageKind;
  /** Підпис у навігації (якщо є — сторінка в головному меню) */
  nav?: string;
  crumbs: Crumb[];
  entry?: DevlogEntry;
}

const home: Crumb = { name: "Home", path: "/" };

const staticPages: PageMeta[] = [
  {
    path: "/",
    title: "Origami Ninja — a paper ninja platformer",
    description: site.description,
    kind: "home",
    crumbs: [],
  },
  {
    path: "/play/",
    title: "Play Origami Ninja — free browser platformer",
    description:
      "Play the Origami Ninja prototype in your browser: run through a paper mountain, dodge fire and glide over the gap. Keyboard and touch controls.",
    kind: "page",
    nav: "Play",
    crumbs: [home, { name: "Play", path: "/play/" }],
  },
  {
    path: "/about/",
    title: "About Origami Ninja — story, mechanics and tech",
    description:
      "The story behind Origami Ninja, how its mechanics work, what the game is built with, what is planned next and how to read the source.",
    kind: "page",
    nav: "About",
    crumbs: [home, { name: "About", path: "/about/" }],
  },
  {
    path: "/controls/",
    title: "Controls — keyboard and touch | Origami Ninja",
    description:
      "How to play Origami Ninja: keyboard keys, touch buttons, jumping, sword attacks and gliding as a paper plane.",
    kind: "page",
    nav: "Controls",
    crumbs: [home, { name: "Controls", path: "/controls/" }],
  },
  {
    path: "/devlog/",
    title: "Devlog — Origami Ninja",
    description:
      "Development notes for Origami Ninja: what was built, how it works and what comes next.",
    kind: "page",
    nav: "Devlog",
    crumbs: [home, { name: "Devlog", path: "/devlog/" }],
  },
  {
    path: "/privacy/",
    title: "Privacy policy — Origami Ninja",
    description:
      "What data Origami Ninja collects, why, how Google Analytics is used only with your consent and how to withdraw it.",
    kind: "page",
    crumbs: [home, { name: "Privacy policy", path: "/privacy/" }],
  },
];

const devlogPages: PageMeta[] = devlog.map((entry) => ({
  path: `/devlog/${entry.slug}/`,
  title: `${entry.title} — Origami Ninja devlog`,
  description: entry.description,
  kind: "article",
  crumbs: [
    home,
    { name: "Devlog", path: "/devlog/" },
    { name: entry.title, path: `/devlog/${entry.slug}/` },
  ],
  entry,
}));

export const notFoundPage: PageMeta = {
  path: "/404.html",
  title: "Page not found — Origami Ninja",
  description: "This page could not be found. Head back to the Origami Ninja home page.",
  kind: "not-found",
  crumbs: [],
};

/** Усі сторінки, що індексуються (без 404). Порядок = порядок у sitemap. */
export const pages: PageMeta[] = [...staticPages, ...devlogPages];

export const allPages: PageMeta[] = [...pages, notFoundPage];

export const pageByPath = (path: string): PageMeta | undefined =>
  allPages.find((p) => p.path === path);
