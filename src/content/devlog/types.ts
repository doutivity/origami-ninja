export interface DevlogEntry {
  /** Частина URL: /devlog/<slug>/ */
  slug: string;
  title: string;
  /** Для <meta name="description"> і OG */
  description: string;
  /** Дата публікації, YYYY-MM-DD */
  date: string;
  /** HTML тіла запису (без <h1>) */
  body: string;
}
