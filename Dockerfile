# ═══════════════════════════════════════════════════════════════════════════════
# DOCKERFILE - Task API (Node.js + SQLite)
#
# Multi-stage build per ottimizzare dimensione e sicurezza dell'immagine finale.
# ═══════════════════════════════════════════════════════════════════════════════

# === STAGE 1: Dependencies ===
# Installa tutte le dipendenze (dev + prod) per la build
FROM node:24-alpine AS deps

# better-sqlite3 richiede questi pacchetti per la compilazione nativa
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copia solo i file necessari per installare le dipendenze
# Questo layer viene cachato se package.json non cambia
COPY package.json ./

# Installa TUTTE le dipendenze e genera il package-lock.json
RUN npm install

# === STAGE 2: Build ===
# Compila il codice TypeScript a JavaScript
FROM node:24-alpine AS builder

WORKDIR /app

# Copia tutti i file necessari per la build
COPY --from=deps /app/node_modules ./node_modules
COPY package.json tsconfig.json ./
COPY src ./src

# Compila TypeScript -> JavaScript in dist/
RUN npx tsc

# === STAGE: Test ===
# Ambiente per eseguire i test automatizzati (Vitest)
# Uso: docker build --target test -t task-api-test . && docker run --rm task-api-test
# Oppure: docker compose run --rm test
FROM node:24-alpine AS test

WORKDIR /app

# Copia tutte le dipendenze (dev incluse: vitest, tsx, etc.)
COPY --from=deps /app/node_modules ./node_modules
COPY package.json tsconfig.json vitest.config.ts ./
COPY src ./src
COPY tests ./tests

# Database in-memory per i test, nessun file su disco
ENV DB_PATH=:memory:
ENV NODE_ENV=test

CMD ["npx", "vitest", "run"]

# === STAGE 3: Production Dependencies ===
# Installa solo le dipendenze di produzione
FROM node:24-alpine AS prod-deps

RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copia package.json e il package-lock.json generato dallo stage "deps"
COPY --from=deps /app/package*.json ./

# --omit=dev esclude le devDependencies
RUN npm ci --omit=dev

# === STAGE 3: Final Image ===
# Immagine finale minimale con solo il necessario per l'esecuzione
FROM node:24-alpine AS runner

# Metadati dell'immagine (OCI standard)
LABEL org.opencontainers.image.title="Task API"
LABEL org.opencontainers.image.description="REST API for task management"
LABEL org.opencontainers.image.version="1.0.0"

# Installa dumb-init per gestire correttamente i segnali (PID 1 problem)
# e sqlite libs necessarie a runtime
RUN apk add --no-cache dumb-init

# Crea un utente non-root per sicurezza
# (mai eseguire container come root in produzione)
RUN addgroup -g 1001 -S nodejs && \
  adduser -S nodejs -u 1001 -G nodejs

WORKDIR /app

# Copia node_modules dalla stage prod-deps
COPY --from=prod-deps /app/node_modules ./node_modules

# Copia il codice compilato dalla stage builder
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --chown=nodejs:nodejs package.json ./

# Crea directory per il database con permessi corretti
RUN mkdir -p /app/data && chown -R nodejs:nodejs /app/data

# Imposta variabili d'ambiente di default
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0
ENV DB_PATH=/app/data/tasks.db

# Espone la porta (documentazione, non apre effettivamente la porta)
EXPOSE 3000

# Cambia all'utente non-root
USER nodejs

# Healthcheck interno al container
# Verifica che l'applicazione risponda correttamente
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Usa dumb-init come entrypoint per gestire correttamente i segnali
# Questo risolve il "PID 1 zombie reaping problem"
ENTRYPOINT ["dumb-init", "--"]

# Comando di default
CMD ["node", "dist/app.js"]
