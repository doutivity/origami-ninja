# syntax=docker/dockerfile:1
# Єдине середовище: усі версії зафіксовані.
ARG NODE_IMAGE=node:26.13.0-alpine
ARG CADDY_IMAGE=caddy:2.11.7-alpine
ARG PLAYWRIGHT_IMAGE=mcr.microsoft.com/playwright:v1.64.1-noble

# ---- base: порожній каталог /app з правами користувача хоста ----
FROM ${NODE_IMAGE} AS base
ARG UID=1000
ARG GID=1000
ENV HOME=/tmp npm_config_cache=/tmp/.npm npm_config_update_notifier=false
WORKDIR /app
RUN mkdir -p /app/node_modules && chown -R ${UID}:${GID} /app

# ---- deps: npm ci за lock-файлом ----
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci
# Шрифти проєкту для fontconfig: sharp рендерить ними текст у згенерованих PNG (OG, іконки).
# Власний FreeType у sharp не читає woff2, тому в образі розпаковуємо їх у TTF (у репозиторії лишаються woff2).
RUN apk add --no-cache fontconfig woff2
COPY src/assets/fonts/*.woff2 /tmp/fonts/
RUN mkdir -p /usr/share/fonts/origami-ninja \
 && cd /tmp/fonts && for f in *.woff2; do woff2_decompress "$f"; done \
 && mv /tmp/fonts/*.ttf /usr/share/fonts/origami-ninja/ && rm -rf /tmp/fonts && fc-cache -f

# ---- dev: Vite dev-сервер (код монтується volume) ----
FROM deps AS dev
ENV BASE_PATH=/ SITE_URL=http://localhost:5173
EXPOSE 5173
CMD ["npm", "run", "dev"]

# ---- build: статичний бандл ----
FROM deps AS build
ARG SITE_URL=http://localhost:8080
ARG BASE_PATH=/
ARG GA_MEASUREMENT_ID=
ARG GTM_CONTAINER_ID=
ENV SITE_URL=${SITE_URL} BASE_PATH=${BASE_PATH} GA_MEASUREMENT_ID=${GA_MEASUREMENT_ID} GTM_CONTAINER_ID=${GTM_CONTAINER_ID}
COPY . .
RUN npm run build

# ---- dist: лише артефакт для `docker build --output` ----
FROM scratch AS dist
COPY --from=build /app/dist /

# ---- test: lint, typecheck, vitest, check:seo ----
FROM build AS test
RUN npm run lint && npm run typecheck && npm run test && npm run check:seo

# ---- e2e: офіційний образ Playwright тієї ж версії ----
FROM ${PLAYWRIGHT_IMAGE} AS e2e
ENV HOME=/tmp npm_config_cache=/tmp/.npm
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
CMD ["npx", "playwright", "test"]

# ---- runtime: Caddy з тим самим BASE_PATH, що й збірка ----
FROM ${CADDY_IMAGE} AS runtime
ARG BASE_PATH=/
ENV BASE_PATH=${BASE_PATH}
COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/dist /srv${BASE_PATH}
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q --spider "http://127.0.0.1:8080${BASE_PATH}" || exit 1
