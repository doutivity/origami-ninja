// Генерація humans.txt за стандартом humanstxt.org.
import { site } from "./config.ts";

export interface HumansInput {
  /** Дата збірки, YYYY/MM/DD */
  date: string;
  /** Назва → версія (порожня, якщо версія не відома) */
  components: Record<string, string>;
  /** Шрифти: назви з Google Fonts */
  fonts: string[];
}

export function buildHumans(input: HumansInput): string {
  const components = Object.entries(input.components)
    .map(([name, version]) => (version ? `${name} ${version}` : name))
    .join(", ");
  return `/* TEAM */
  Developer: ${site.authorName}
  GitHub: ${site.authorUrl}

/* SITE */
  Last update: ${input.date}
  Language: English
  Doctype: HTML5
  Standards: HTML5, CSS3, TypeScript, JSON-LD
  License: ${site.license}
  Components: ${components}
  Fonts: ${input.fonts.join(", ")} (Google Fonts, self-hosted, OFL)

/* DEVELOPMENT PROCESS */
  Graphics: drawn in code, no external assets; the favicon, icons, social images and hero are generated from the same shapes and colour tokens as the game
  Style: chosen from several generated variants
  Environment: Docker-only; every command runs through a justfile
  Workflow: staged development with checks after every step
  CI: runs on every push
  Deployment: automatic, to GitHub Pages
  Source: ${site.repoUrl}
`;
}

export const humansDate = (d = new Date()): string =>
  `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
