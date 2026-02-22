# ── Etapa 1: Base ──────────────────────────────────────────────────────────────
FROM node:20-slim AS base
ENV NODE_ENV=production

# ── Etapa 2: Dependencias ──────────────────────────────────────────────────────
FROM base AS deps
WORKDIR /app

# Herramientas de compilación para better-sqlite3 (módulo nativo)
RUN apt-get update && \
    apt-get install -y --no-install-recommends python3 make g++ && \
    rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

# ── Etapa 3: Build ────────────────────────────────────────────────────────────
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# ── Etapa 4: Producción ────────────────────────────────────────────────────────
FROM node:20-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Herramientas de runtime para better-sqlite3
RUN apt-get update && \
    apt-get install -y --no-install-recommends libstdc++ && \
    rm -rf /var/lib/apt/lists/*

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copiar solo lo necesario del build standalone
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# El módulo nativo better-sqlite3 debe copiarse al standalone
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/better-sqlite3 ./node_modules/better-sqlite3
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/bindings ./node_modules/bindings
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/file-uri-to-path ./node_modules/file-uri-to-path

# Directorio de datos persistentes
RUN mkdir -p /data && chown nextjs:nodejs /data

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
