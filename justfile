# Усі команди проєкту виконуються в Docker. На хості потрібні лише docker і just.

set shell := ["bash", "-euo", "pipefail", "-c"]

export HOST_UID := `id -u`
export HOST_GID := `id -g`
export DOCKER_BUILDKIT := "1"

pages_url  := "https://doutivity.github.io/origami-ninja"
pages_base := "/origami-ninja/"
ga_id      := env_var_or_default("GA_MEASUREMENT_ID", "")
gtm_id     := env_var_or_default("GTM_CONTAINER_ID", "")
# Для GitHub Pages контейнер GTM за замовчуванням — проєктний (його можна перевизначити змінною)
pages_gtm  := `echo "${GTM_CONTAINER_ID:-GTM-M3BV4B7T}"`

dev_run := "docker compose run --rm --build --no-deps -T dev"

# Показати список рецептів
default:
    @just --list

# Створює node_modules на хості від імені користувача (інакше Docker створить його як root)
_prep:
    @mkdir -p node_modules

# Встановити залежності в контейнері (оновлює package-lock.json)
install: _prep
    docker compose --profile tools run --rm --build tools npm install

# Dev-сервер на http://localhost:5173
dev: _prep
    docker compose up --build dev

# Завантажити обрані Google Fonts у репозиторій
fonts:
    docker compose --profile tools run --rm --build tools node scripts/fonts.ts

# Biome: перевірка
lint: _prep
    {{dev_run}} npm run lint

# Biome: автоформатування
format: _prep
    {{dev_run}} npm run format

# tsc --noEmit
typecheck: _prep
    {{dev_run}} npm run typecheck

# Vitest
test: _prep
    {{dev_run}} npm run test

# Перевірка SEO поверх dist/
check-seo: _prep
    {{dev_run}} npm run check:seo

# Збірка dist/ (SITE_URL, BASE_PATH, GA_MEASUREMENT_ID, GTM_CONTAINER_ID)
build site_url="http://localhost:8080" base_path="/" ga=ga_id gtm=gtm_id:
    rm -rf dist
    docker build --target dist --output type=local,dest=dist \
      --build-arg UID=$HOST_UID --build-arg GID=$HOST_GID \
      --build-arg SITE_URL="{{site_url}}" --build-arg BASE_PATH="{{base_path}}" \
      --build-arg GA_MEASUREMENT_ID="{{ga}}" --build-arg GTM_CONTAINER_ID="{{gtm}}" .
    touch dist/.nojekyll

# Збірка з налаштуваннями GitHub Pages
build-pages:
    just build "{{pages_url}}" "{{pages_base}}" "{{ga_id}}" "{{pages_gtm}}"

# Швидка перевірка: lint + typecheck + test + build + check-seo
check: lint typecheck test build check-seo

# Playwright smoke-тести на зібраному сайті (режим Pages, тестовий GA ID, desktop + телефон)
e2e:
    #!/usr/bin/env bash
    set -uo pipefail
    mkdir -p playwright-report test-results
    docker compose --profile e2e run --rm --build e2e
    code=$?
    docker compose --profile e2e down --remove-orphans >/dev/null 2>&1
    exit $code

# Lighthouse CI: desktop і mobile; SEO/Accessibility/Best Practices ≥ 0.9 (крім /play/, лише звіт)
lighthouse:
    #!/usr/bin/env bash
    set -uo pipefail
    mkdir -p reports/lighthouse
    docker compose --profile e2e run --rm --build lighthouse
    code=$?
    docker compose --profile e2e down --remove-orphans >/dev/null 2>&1
    exit $code

# Повна перевірка (те саме, що в CI)
ci: check e2e lighthouse

# Зібрати продакшн-образ (BASE_PATH=/)
image:
    docker compose build web

# Продакшн-сайт на http://localhost:8080
up:
    BASE_PATH=/ SITE_URL=http://localhost:8080 docker compose up -d --build web

down:
    docker compose down

logs:
    docker compose logs -f web

# Сайт як на GitHub Pages: http://localhost:8080/origami-ninja/
preview-pages:
    BASE_PATH={{pages_base}} SITE_URL=http://localhost:8080/origami-ninja docker compose up -d --build web

# Shell у dev-контейнері
shell: _prep
    docker compose run --rm --no-deps dev sh

# Видалити dist, звіти, volumes і образи проєкту
clean:
    docker compose down -v --rmi local --remove-orphans || true
    docker rmi -f origami-ninja-base 2>/dev/null || true
    rm -rf dist reports playwright-report test-results
