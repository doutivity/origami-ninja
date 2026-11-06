# Origami Ninja

[![CI](https://github.com/doutivity/origami-ninja/actions/workflows/ci.yml/badge.svg)](https://github.com/doutivity/origami-ninja/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A 2D platformer in the browser: a paper ninja with a sword runs across a world that is one big
sheet of paper, burns in the fire and folds itself into a paper plane to cross the gap.

**Play it:** <https://doutivity.github.io/origami-ninja/>

Everything you see is drawn in code. There are no image files in the repository: the ninja, the
mountains, the flames, the favicon, the social cards and the hero illustration are generated
from the same shapes and the same colour tokens.

## Features

- Run, variable-height jump, coyote time and input buffer (keyboard and touch, with multi-touch).
- Sword attack that works on the ground and in the air; a paper enemy that falls after two hits.
- Fire that slowly chars the paper (about 35 HP/s), with a burn mask that creeps up the sprite.
- Hold jump while falling to fold into a paper plane; tilt it, ride the updraft, cross the gap.
- A level with checkpoints and a finish, death and "Level complete" screens.
- Automatic quality levels (`high` / `low`) that keep the game at 60 FPS on weaker devices.
- A static content site around the game: home, about, controls, devlog and privacy pages,
  light and dark themes, SEO metadata, JSON-LD, sitemap and `humans.txt`.
- Optional Google Analytics / Tag Manager that loads **only after the visitor accepts** (Consent Mode v2).

## Requirements

Only [Docker](https://docs.docker.com/get-docker/) and [just](https://github.com/casey/just).
Node and npm are **not** used on the host: installs, the dev server, builds, linting and tests
all run in containers, locally and in CI.

## Quick start

```sh
just install   # install dependencies in a container (updates package-lock.json)
just dev       # dev server with HMR on http://localhost:5173
```

Open <http://localhost:5173/play/> to play. Run `just` with no arguments to see every recipe.

## Recipes

| Recipe | What it does |
| --- | --- |
| `just install` | Install dependencies in a container |
| `just dev` | Dev server on <http://localhost:5173> |
| `just lint` / `just format` | Biome check / auto-format |
| `just typecheck` | `tsc --noEmit` |
| `just test` | Vitest unit tests |
| `just build` | Build `dist/` (defaults: `SITE_URL=http://localhost:8080`, `BASE_PATH=/`) |
| `just build-pages` | Build `dist/` with the GitHub Pages settings |
| `just check-seo` | Verify the built `dist/` (titles, canonicals, sitemap, links, icons, OG images…) |
| `just check` | Fast check: lint, typecheck, tests, build, `check-seo` |
| `just e2e` | Playwright smoke tests on the built site (Pages mode, desktop and phone profiles) |
| `just lighthouse` | Lighthouse CI, desktop and mobile; reports in `reports/lighthouse/` |
| `just ci` | Full check: `check` + `e2e` + `lighthouse` (the same as CI) |
| `just image` | Build the production image |
| `just up` / `just down` / `just logs` | Production site on <http://localhost:8080> |
| `just preview-pages` | The site as on GitHub Pages: <http://localhost:8080/origami-ninja/> |
| `just fonts` | Download the selected Google Fonts into the repository |
| `just shell` | Shell in the dev container |
| `just clean` | Remove `dist`, reports, volumes and project images |

## Controls

| Action | Keyboard | Touch |
| --- | --- | --- |
| Move | Arrow keys or `A` / `D` | `←` `→` buttons |
| Jump | `Space` (hold for a higher jump) | `Jump` |
| Glide | Hold `Space` while falling | Hold `Jump` in the air |
| Tilt the glider | `↑` slower and longer, `↓` faster and lower | – |
| Frog leap | Hold `Space` on the ground, release to leap | Hold `Jump` on the ground |
| Attack | `J` | `Attack` |
| Restart at the last checkpoint | `R` | Tap the game-over screen |

URL parameters for the game page:

- `?debug=1` – FPS counter, hitboxes and the current quality level.
- `?quality=low` or `?quality=high` – force a quality level (disables the automatic switch).
- `?touch=1` – show the touch buttons on a desktop.

## Build settings

The site is configured at build time with environment variables (build arguments in Docker):

| Variable | Default | Purpose |
| --- | --- | --- |
| `SITE_URL` | `http://localhost:8080` | Absolute site address: canonical, Open Graph, sitemap. For Pages: `https://doutivity.github.io/origami-ninja` |
| `BASE_PATH` | `/` | Vite `base`. For Pages: `/origami-ninja/` |
| `GA_MEASUREMENT_ID` | empty | GA4 measurement ID (`G-…`). Empty means no analytics code and no consent banner |
| `GTM_CONTAINER_ID` | empty | Optional Google Tag Manager container (`GTM-…`) |

`just build-pages` uses the Pages values. If `GTM_CONTAINER_ID` is not set it falls back to the
project container `GTM-M3BV4B7T`.

## Deploying to GitHub Pages

1. In the repository go to **Settings → Pages** and set **Source** to **GitHub Actions**.
2. Optionally open **Settings → Secrets and variables → Actions → Variables** and add:
   - `GA_MEASUREMENT_ID` – your GA4 measurement ID;
   - `GTM_CONTAINER_ID` – to override the default Tag Manager container.
3. Push to `main` (or run the **Deploy to GitHub Pages** workflow manually).

The workflow runs `just ci`, builds with `just build-pages`, checks the Pages build with
`check:seo`, and publishes `dist/`. The `ci.yml` workflow runs the same full check on every push
and pull request and stores the Playwright and Lighthouse reports as artifacts.

> **Analytics:** do not configure a GA4 tag inside the Tag Manager container *and* set
> `GA_MEASUREMENT_ID`, or events will be counted twice. Without a consent the site makes no
> requests to Google and sets no cookies. See [/privacy/](https://doutivity.github.io/origami-ninja/privacy/).

### Search engines

On a project site (`user.github.io/repo/`) search engines ignore a `robots.txt` that lives in a
sub-folder, so the generated `robots.txt` is not picked up automatically. Submit the sitemap
manually: add the property in Google Search Console and submit
`https://doutivity.github.io/origami-ninja/sitemap.xml`.

### Moving to a custom domain

1. Add a file `public/CNAME` containing the domain (for example `ninja.example.com`). It is the
   only file in `public/` that is committed, everything else there is generated.
2. Configure the domain in **Settings → Pages** and in your DNS.
3. Build with `SITE_URL=https://ninja.example.com` and `BASE_PATH=/`. In
   `.github/workflows/deploy.yml` the `build-pages` recipe takes its values from the top of the
   `justfile` (`pages_url`, `pages_base`); change them there.
4. Submit the new sitemap to Search Console.

## Project structure

```
src/
  index.html, about/, controls/, devlog/, play/, privacy/, 404.html   page contents (only <main>)
  content/devlog/     devlog entries as data (add a file and one line in index.ts)
  site/               page registry, header/footer, JSON-LD, sitemap, humans.txt, SEO helpers
  theme/              design tokens (light and dark), theme switcher, paper texture
  gfx/                shared drawing code: ninja, glider, scene pieces, icons, hero, OG image
  consent/            consent module (Consent Mode v2) and the track() wrapper
  game/               Phaser game: scenes, player state machine, combat, fire, wind, level, tuning
  assets/fonts/       self-hosted woff2 fonts with their OFL licences
plugins/              Vite plugins: shared layout, theme, assets
scripts/              asset generation, font download, check:seo
tests/unit, tests/e2e Vitest and Playwright
lighthouse/           Lighthouse CI configuration
```

All gameplay numbers live in `src/game/tuning.ts`; the level is a typed object in
`src/game/level/mountain.ts`; colours come from `src/theme/tokens.ts`.

### Adding a devlog entry

Create `src/content/devlog/NNN-slug.ts` exporting an `entry`, then add one import to
`src/content/devlog/index.ts`. The entry page, the list, the sitemap, the JSON-LD and the
Open Graph image are generated automatically.

## Tech

TypeScript, Vite (multi-page), Phaser 4 with Arcade Physics, Biome, Vitest, Playwright, Lighthouse CI,
sharp, Caddy (local production image) and GitHub Actions / GitHub Pages. Fonts:
[Shippori Mincho](https://fonts.google.com/specimen/Shippori+Mincho) and
[Hanken Grotesk](https://fonts.google.com/specimen/Hanken+Grotesk) (SIL OFL), self-hosted.

## License

[MIT](LICENSE) © 2026 Yaroslav Podorvanov
