# Task API

REST API per la gestione di task, costruita con Node.js, Hono, TypeScript e SQLite.

## Quick Start

```bash
# Clona il repository e entra nella directory
cd task-api

# Crea il file di configurazione
cp .env.example .env

# Installa le dipendenze
npm install

# Avvia il server in development
npm run dev

# Verifica che funzioni
curl http://localhost:3000/health
```

L'API sarà disponibile su `http://localhost:3000`

## Stack Tecnologico

| Tecnologia | Scopo |
|------------|-------|
| **Node.js 20** | Runtime JavaScript |
| **Hono 4** | Framework web |
| **TypeScript 5** | Type safety |
| **better-sqlite3** | Database embedded |
| **Zod** | Validazione schema e type inference |
| **tsx** | Esecuzione TypeScript |

## Struttura Progetto

```
task-api/
├── src/
│   ├── config/
│   │   └── database.ts       # Setup SQLite
│   ├── controllers/
│   │   └── taskController.ts # Logica CRUD
│   ├── middleware/
│   │   ├── errorHandler.ts   # Gestione errori
│   │   └── validate.ts       # Validazione input con Zod
│   ├── routes/
│   │   └── taskRoutes.ts     # Endpoint REST
│   ├── types/
│   │   └── index.ts          # Definizioni di tipo centralizzate
│   ├── createApp.ts          # App Factory (configurazione Hono)
│   └── app.ts                # Entry point (server startup)
├── tests/
│   ├── setup.ts              # Test setup (DB in-memory)
│   ├── tasks.test.ts         # Test suite automatizzati (Vitest)
│   └── test-api.http         # Test manuali (REST Client / httpyac)
├── .dockerignore
├── .env.example
├── .gitignore
├── compose.yaml
├── Dockerfile
├── package.json
├── vitest.config.ts
├── tsconfig.json
└── README.md
```

## Architettura del Progetto

### Layer Architecture

Il progetto segue un'architettura a layer per mantenere la separazione delle responsabilità:

```
┌─────────────────────────────────────────┐
│         Client (HTTP/cURL)              │
└──────────────────┬──────────────────────┘
                   │
┌──────────────────▼──────────────────────┐
│        app.ts (Entry Point)             │
│  - Middleware globali (secureHeaders,   │
│    CORS, logger, prettyJSON)            │
│  - Route registration                  │
│  - Graceful shutdown                   │
└──────────────────┬──────────────────────┘
                   │
        ┌──────────┴──────────┐
        │                     │
┌───────▼────────┐   ┌────────▼────────┐
│ taskRoutes.ts  │   │   /health       │
│ (Route Layer)  │   │   Endpoints     │
└───────┬────────┘   └─────────────────┘
        │
┌───────▼────────────────────────────────┐
│      Middleware Pipeline               │
│  1. Validation Middleware              │
│     (validate.ts + Zod)               │
│  2. Controller Functions              │
│     (taskController.ts)               │
└───────┬────────────────────────────────┘
        │
┌───────▼────────────────────────────────┐
│      Data Layer                        │
│  - Configurazione database             │
│  - SQL prepared statements             │
│  - Schema migrations                   │
└────────────────────────────────────────┘
```

### Request Flow

1. **Ingresso Richiesta**: La richiesta HTTP arriva al server Hono
2. **Global Middleware**:
   - `secureHeaders` aggiunge security headers
   - CORS valida origini cross-origin
   - `logger` logga la richiesta
   - `prettyJSON` formatta le risposte JSON
3. **Routing**: Hono mappa l'URL al router appropriato
4. **Validation**: Zod valida input (body, params, query) con type inference
5. **Controller**: La funzione controller esegue la logica business
6. **Database**: Il controller interagisce con SQLite via `better-sqlite3`
7. **Response**: Il controller invia la risposta JSON tipizzata al client
8. **Error Handling**: Se qualcosa va storto, l'errore viene propagato all'`errorHandler`

### Componenti Chiave

#### createApp.ts - App Factory

La configurazione dell'applicazione Hono è estratta in una funzione factory `createApp()`, separata dall'avvio del server. Questo pattern (noto come **App Factory**) risolve un problema concreto: quando `app.ts` crea l'app e avvia il server nello stesso modulo, importare l'app per i test significa anche avviare il server, aprire porte e connettersi al database di produzione.

Con la factory:

- **Testabilità**: I test importano `createApp()` e ottengono un'istanza Hono isolata, senza avviare nessun server. Hono fornisce `app.request()` per simulare richieste HTTP direttamente in memoria.
- **Isolamento**: Ogni test suite può creare la propria istanza dell'app, con un database in-memory separato, senza conflitti tra test.
- **Separazione delle responsabilità**: `createApp.ts` si occupa solo della configurazione (middleware, route, error handling), mentre `app.ts` gestisce il lifecycle del server (listen, graceful shutdown, segnali di processo).

```typescript
// createApp.ts - solo configurazione
export function createApp(): Hono { ... }

// app.ts - solo server lifecycle
import { createApp } from './createApp.js';
const app = createApp();
serve({ fetch: app.fetch, port: PORT });

// tasks.test.ts - test senza server
import { createApp } from '../src/createApp.js';
const app = createApp();
const res = await app.request('/tasks');
```

#### app.ts - Server Bootstrap

- Importa l'app dalla factory `createApp()`
- Inizializza il database
- Avvia il server HTTP con `@hono/node-server`
- Gestisce il lifecycle del server (startup, shutdown)
- Implementa graceful shutdown per sicurezza

#### taskRoutes.ts - Route Definitions

- Definisce tutti gli endpoint REST
- Collega validazione Zod middleware ai controller
- Organizza route per risorsa (tasks)
- Segue convenzioni RESTful standard

#### validate.ts - Input Validation Layer

- Schemi Zod dichiarativi con type inference automatica
- Regole separate per ogni endpoint (`createTaskSchema`, `updateTaskSchema`, ecc.)
- Middleware generici riutilizzabili (`validateBody`, `validateParams`, `validateQuery`)
- Ritorna errori dettagliati con field specifici e timestamp

#### taskController.ts - Business Logic Layer

- Contiene tutta la logica di business
- Gestisce CRUD operations con tipi TypeScript
- Implementa paginazione e filtri
- Non contiene logica di routing
- Risposte tipizzate con generic (`ApiResponse<T>`, `ApiMessageResponse<T>`)

#### database.ts - Data Access Layer

- Configurazione SQLite con `better-sqlite3`
- Synchronous API (non async) per semplicità
- Setup iniziale schema e triggers
- Abilita WAL mode per performance

#### errorHandler.ts - Error Handling Layer

- Centralizza gestione errori
- Gestisce diversi tipi di errori (HTTP, SQLite, Validation)
- Nasconde stack trace in produzione
- Formatta risposte di errore consistenti con `ApiErrorResponse`

#### types/index.ts - Type Definitions

- Definizioni centrali di tutti i tipi del dominio
- `type` per unions/primitive (`Priority`)
- `interface` per oggetti (`Task`, `ApiResponse<T>`)
- Tipi per input validati (`CreateTaskInput`, `UpdateTaskInput`, `PatchTaskInput`)
- Tipi per paginazione e risposte errore

### Data Model

#### Tabella `tasks`

```sql
CREATE TABLE tasks (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  title       TEXT NOT NULL,
  description TEXT,
  completed   INTEGER DEFAULT 0,
  priority    TEXT DEFAULT 'medium' CHECK(priority IN ('low', 'medium', 'high')),
  created_at  TEXT DEFAULT (datetime('now')),
  updated_at  TEXT DEFAULT (datetime('now'))
)
```

**Note chiave**:

- `completed` è stored come INTEGER (0/1) per SQLite
- `priority` ha constraint CHECK per validità
- Trigger automatico aggiorna `updated_at` on UPDATE
- Timestamps in formato ISO8601 string

### Security Architecture

1. **Input Validation**: Tutti gli input validati con Zod prima del processing
2. **SQL Injection Prevention**: Prepared statements per tutte le query
3. **HTTP Headers**: `secureHeaders` di Hono per security headers (XSS, CSP, etc.)
4. **CORS**: Configurabile per controllo origini
5. **Non-root Container**: Docker container eseguito come utente non-root

### Performance Considerations

- **WAL Mode**: SQLite Write-Ahead Logging per concorrenza
- **Prepared Statements**: Query caching per performance
- **Synchronous Database**: better-sqlite3 più veloce di sqlite3 async
- **Hono**: ~14x più leggero di Express, performance superiori
- **Pagination**: Supporto nativo per query paginate

### Scalabilità e Manutenibilità

- **Separation of Concerns**: Ogni layer ha responsabilità chiara
- **Middleware Chain**: Facile aggiungere nuovo middleware
- **Type Safety**: TypeScript garantisce coerenza e facilita il refactoring
- **Validation Reuse**: Schemi Zod centralizzati e riutilizzabili
- **Error Centralization**: Un solo punto di gestione errori
- **Environment-based**: Configurazione via environment variables

## Refactoring da Express a Hono (v2.0.0)

Questo progetto è stato migrato da Express/JavaScript a Hono/TypeScript. Ecco cosa è cambiato e perché:

### Cambiamenti Tecnologici

| Prima | Dopo | Motivazione |
|-------|------|-------------|
| Express 4 | Hono 4 | Più leggero, più veloce, migliore supporto TypeScript |
| JavaScript | TypeScript | Type safety, migliore supporto IDE, meno errori a runtime |
| express-validator | Zod | Type inference, definizioni schema più pulite |
| Morgan | Hono logger | Built-in, nessuna dipendenza aggiuntiva |
| Helmet | Hono secureHeaders | Middleware built-in |

### Benefici del Refactoring

#### Type Safety

- Rilevamento errori a compile-time
- Autocomplete e IntelliSense
- Refactoring con confidenza
- Codice auto-documentante tramite i tipi

#### Framework Moderno

- Hono è ~14x più piccolo di Express
- Supporto TypeScript first-class
- Middleware built-in (niente pacchetti helmet/cors separati)
- Funziona su qualsiasi runtime JavaScript (Node, Bun, Deno, Cloudflare Workers)

#### Migliore Validazione

- Gli schemi Zod forniscono sia validazione runtime che type inference
- Singola fonte di verità per tipi e regole di validazione
- Messaggi di errore più chiari

### Cambiamenti Chiave nel Codice

#### Entry Point (app.ts)

```typescript
// Prima: Express
const express = require('express');
const helmet = require('helmet');
const app = express();
app.use(helmet());

// Dopo: Hono
import { Hono } from 'hono';
import { secureHeaders } from 'hono/secure-headers';
const app = new Hono();
app.use('*', secureHeaders());
```

#### Route (taskRoutes.ts)

```typescript
// Prima: Express Router
const express = require('express');
const router = express.Router();
router.get('/', taskController.getAllTasks);

// Dopo: Hono
import { Hono } from 'hono';
const tasks = new Hono();
tasks.get('/', validateQuery(listQuerySchema), getAllTasks);
```

#### Validazione (validate.ts)

```typescript
// Prima: array express-validator
const createTaskValidation = [
  body('title').trim().notEmpty(),
  body('priority').optional().isIn(['low', 'medium', 'high']),
  handleValidationErrors
];

// Dopo: schemi Zod con type inference
export const createTaskSchema = z.object({
  title: z.string().trim().min(1).max(200),
  priority: PrioritySchema.optional().default('medium')
});

// Il tipo viene inferito automaticamente
type CreateTaskInput = z.infer<typeof createTaskSchema>;
```

#### Controller (taskController.ts)

```typescript
// Prima: Express con req/res/next
function createTask(req, res, next) {
  try {
    const { title } = req.body;
    // ...
  } catch (error) {
    next(error);
  }
}

// Dopo: Hono Context con validazione tipizzata
function createTask(c: Context) {
  const input = c.get('validatedBody') as CreateTaskInput;
  // TypeScript sa che input.title è una stringa
  return c.json<ApiMessageResponse<Task>>({ ... }, 201);
}
```

#### Tipi (types/index.ts)

```typescript
// Nuovo file: definizioni di tipo centralizzate
export type Priority = 'low' | 'medium' | 'high';

export interface Task {
  id: number;
  title: string;
  description: string | null;
  completed: number;
  priority: Priority;
  created_at: string;
  updated_at: string;
}

export interface ApiResponse<T> {
  data: T;
}
```

### Cambiamenti nella Struttura

```shell
# Prima (JavaScript)
src/
├── app.js
├── config/database.js
├── controllers/taskController.js
├── middleware/
│   ├── errorHandler.js
│   └── validate.js
└── routes/taskRoutes.js

# Dopo (TypeScript)
src/
├── app.ts
├── config/database.ts
├── controllers/taskController.ts
├── middleware/
│   ├── errorHandler.ts
│   └── validate.ts
├── routes/taskRoutes.ts
└── types/index.ts          # NUOVO: Definizioni di tipo centralizzate
```

### Script npm

```bash
# Sviluppo
npm run dev          # Avvia con hot-reload (tsx watch)
npm start            # Produzione (richiede build)

# Build
npm run build        # Compila TypeScript in dist/

# Test
npm test             # Vitest (locale, DB in-memory)
npm run test:watch   # Vitest in watch mode
npm run test:docker  # Vitest in container Docker
npm run test:http    # httpyac contro server attivo

# Qualità
npm run typecheck    # Type check senza emissione
npm run lint         # Esegue ESLint
npm run lint:fix     # Auto-fix problemi di linting
```

### Guida alla Migrazione

Se hai codice v1.x esistente, ecco come migrare:

1. **Aggiorna dipendenze**: `npm install` scaricherà i nuovi pacchetti
2. **Database compatibile**: Schema SQLite invariato, i dati persistono
3. **API compatibile**: Tutti gli endpoint funzionano in modo identico
4. **Nuovi tipi**: Importare da `src/types/index.ts` se si estende il progetto

## API Endpoints

### Health Check

```http
GET /health
```

Risposta:

```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 3600.5,
  "environment": "development"
}
```

### Tasks

#### Lista Task

```http
GET /tasks
GET /tasks?completed=true
GET /tasks?priority=high
GET /tasks?limit=10&offset=20
```

**Query Parameters:**

| Parametro | Tipo | Default | Descrizione |
|-----------|------|---------|-------------|
| `completed` | boolean | - | Filtra per stato |
| `priority` | string | - | `low`, `medium`, `high` |
| `limit` | integer | 50 | Max risultati (1-100) |
| `offset` | integer | 0 | Skip per paginazione |

**Risposta:**

```json
{
  "data": [
    {
      "id": 1,
      "title": "Completare documentazione",
      "description": "Scrivere README",
      "completed": 0,
      "priority": "high",
      "created_at": "2024-01-15T10:00:00",
      "updated_at": "2024-01-15T10:00:00"
    }
  ],
  "pagination": {
    "total": 42,
    "limit": 50,
    "offset": 0,
    "hasMore": false
  }
}
```

#### Singolo Task

```http
GET /tasks/:id
```

#### Crea Task

```http
POST /tasks
Content-Type: application/json

{
  "title": "Nuovo task",
  "description": "Descrizione opzionale",
  "priority": "medium"
}
```

**Campi:**

| Campo | Tipo | Required | Note |
|-------|------|----------|------|
| `title` | string | ✓ | 1-200 caratteri |
| `description` | string | - | Max 1000 caratteri |
| `priority` | string | - | Default: `medium` |

#### Aggiorna Task (completo)

```http
PUT /tasks/:id
Content-Type: application/json

{
  "title": "Task aggiornato",
  "description": "Nuova descrizione",
  "completed": true,
  "priority": "low"
}
```

#### Aggiorna Task (parziale)

```http
PATCH /tasks/:id
Content-Type: application/json

{
  "completed": true
}
```

#### Elimina Task

```http
DELETE /tasks/:id
```

Risposta: `204 No Content`

## Docker

```bash
# Avvio in background
docker compose up -d

# Visualizza log
docker compose logs -f api

# Sviluppo con hot-reload
docker compose watch

# Esegui test in container isolato (DB in-memory)
docker compose run --rm test

# Stop
docker compose down

# Stop e rimuovi volumi (cancella database)
docker compose down -v

# Rebuild immagine
docker compose build --no-cache
```

### Test in Docker

Il Dockerfile include uno stage `test` dedicato che esegue i test Vitest in un container isolato con database in-memory. Questo garantisce che i test girino nello stesso ambiente del deployment, eliminando il classico problema "works on my machine".

```bash
# Esegui i test via compose (modo consigliato)
npm run test:docker

# Equivalente a:
docker compose run --rm test

# Oppure build diretto dello stage test
docker build --target test -t task-api-test .
docker run --rm task-api-test
```

Il servizio `test` usa un [profile](https://docs.docker.com/compose/profiles/) (`test`) per non avviarsi con `docker compose up`. Si attiva solo esplicitamente con `docker compose run --rm test`.

## Sviluppo Locale (senza Docker)

```bash
# Installa dipendenze
npm install

# Crea directory per database
mkdir -p data

# Avvia in development (con hot-reload)
npm run dev

# Oppure avvio normale
npm start
```

## Variabili d'Ambiente

| Variabile | Default | Descrizione |
|-----------|---------|-------------|
| `NODE_ENV` | `development` | Ambiente |
| `PORT` | `3000` | Porta server |
| `HOST` | `0.0.0.0` | Host binding |
| `DB_PATH` | `./data/tasks.db` | Path database |
| `CORS_ORIGIN` | `*` | Origini CORS permesse |

## Best Practices Implementate

### Sicurezza

- ✅ `secureHeaders` di Hono per HTTP security headers
- ✅ CORS configurabile
- ✅ Validazione input con Zod e type inference
- ✅ Container non-root
- ✅ Prepared statements per prevenire SQL injection

### Performance

- ✅ Multi-stage Docker build
- ✅ SQLite WAL mode per concorrenza
- ✅ Layer caching ottimizzato nel Dockerfile
- ✅ Hono ~14x più leggero di Express

### Affidabilità

- ✅ Graceful shutdown
- ✅ Health checks
- ✅ Gestione errori centralizzata
- ✅ Logging strutturato

### Testing

- ✅ Test automatizzati con Vitest (in-memory SQLite)
- ✅ Test in Docker (stesso ambiente di produzione)
- ✅ Test HTTP con httpyac (REST Client CLI)
- ✅ App Factory pattern per testabilità

### Developer Experience

- ✅ Hot-reload con tsx watch
- ✅ Supporto TypeScript completo
- ✅ Type safety end-to-end con Zod
- ✅ Variabili d'ambiente con .env
- ✅ Codice organizzato per responsabilità

## Esempi con cURL

```bash
# Crea un task
curl -X POST http://localhost:3000/tasks \
  -H "Content-Type: application/json" \
  -d '{"title": "Imparare TypeScript", "priority": "high"}'

# Lista tutti i task
curl http://localhost:3000/tasks

# Segna come completato
curl -X PATCH http://localhost:3000/tasks/1 \
  -H "Content-Type: application/json" \
  -d '{"completed": true}'

# Filtra task completati
curl "http://localhost:3000/tasks?completed=true"

# Elimina task
curl -X DELETE http://localhost:3000/tasks/1
```

## License

MIT
