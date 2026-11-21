# Przewodnik Rodzica – obraz produkcyjny aplikacji webowej (Next.js standalone, monorepo z silnikiem @zus/engine)
# Budowa:  docker build -t przewodnik-rodzica .
# Start:   docker compose up -d   (http://localhost:3000)

FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
COPY apps/web/package.json apps/web/
COPY packages/engine/package.json packages/engine/
RUN npm ci --no-audit --no-fund

FROM node:24-alpine AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY packages ./packages
COPY apps/web ./apps/web
RUN npm test --workspace packages/engine && npm run build --workspace apps/web

FROM node:24-alpine AS run
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
RUN addgroup -S app && adduser -S app -G app
COPY --from=build --chown=app:app /app/apps/web/.next/standalone ./
COPY --from=build --chown=app:app /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=build --chown=app:app /app/apps/web/public ./apps/web/public
RUN mkdir -p /app/apps/web/data && chown app:app /app/apps/web/data
USER app
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s CMD wget -qO- http://127.0.0.1:3000/api/params >/dev/null || exit 1
CMD ["node", "apps/web/server.js"]
