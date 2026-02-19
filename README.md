# Task API

REST API per la gestione di task, costruita con Node.js, Express e SQLite.

## Quick Start

```bash
# Clona il repository e entra nella directory
cd task-api

# Crea il file di configurazione
cp .env.example .env

# Avvia con Docker Compose
docker compose up -d

# Verifica che funzioni
curl http://localhost:3000/health
```

L'API sarà disponibile su `http://localhost:3000`

## Stack Tecnologico

| Tecnologia | Scopo |
|------------|-------|
| **Node.js 20** | Runtime JavaScript |
| **Express 4** | Framework web |
| **better-sqlite3** | Database embedded |
| **Helmet** | Security headers |
| **express-validator** | Validazione input |
| **Morgan** | HTTP logging |

## Struttura Progetto

```
task-api/
├── src/
│   ├── config/
│   │   └── database.js       # Setup SQLite
│   ├── controllers/
│   │   └── taskController.js # Logica CRUD
│   ├── middleware/
│   │   ├── errorHandler.js   # Gestione errori
│   │   └── validate.js       # Validazione input
│   ├── routes/
│   │   └── taskRoutes.js     # Endpoint REST
│   └── app.js                # Entry point
├── .dockerignore
├── .env.example
├── .gitignore
├── compose.yaml
├── Dockerfile
├── package.json
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
│        app.js (Entry Point)             │
│  - Middleware globali (Helmet, CORS,    │
│    Morgan, body parser)                 │
│  - Route registration                   │
│  - Graceful shutdown                    │
└──────────────────┬──────────────────────┘
                   │
        ┌──────────┴──────────┐
        │                     │
┌───────▼────────┐   ┌────────▼────────┐
│  taskRoutes.js │   │   /health       │
│  (Route Layer) │   │   Endpoints     │
└───────┬────────┘   └─────────────────┘
        │
┌───────▼────────────────────────────────┐
│      Middleware Pipeline               │
│  1. Validation Middleware              │
│     (validate.js)                      │
│  2. Controller Functions               │
│     (taskController.js)                │
└───────┬────────────────────────────────┘
        │
┌───────▼────────────────────────────────┐
│      Data Layer                        │
│  - Database configuration              │
│  - SQL prepared statements             │
│  - Schema migrations                   │
└────────────────────────────────────────┘
```

### Request Flow

1. **Ingresso Richiesta**: La richiesta HTTP arriva al server Express
2. **Global Middleware**:
   - Helmet aggiunge security headers
   - CORS valida origini cross-origin
   - Morgan logga la richiesta
   - Body parser parsifica JSON
3. **Routing**: Express mappa l'URL al router appropriato
4. **Validation**: `express-validator` valida input (body, params, query)
5. **Controller**: La funzione controller esegue la logica business
6. **Database**: Il controller interagisce con SQLite via `better-sqlite3`
7. **Response**: Il controller invia la risposta JSON al client
8. **Error Handling**: Se qualcosa va storto, l'errore viene propagato al `errorHandler`

### Componenti Chiave

#### app.js - Application Bootstrap

- Configura middleware globali
- Registra le route
- Gestisce il lifecycle del server (startup, shutdown)
- Implementa graceful shutdown per sicurezza
- Health check endpoint per monitoring

#### taskRoutes.js - Route Definitions

- Definisce tutti gli endpoint REST
- Collega validazione middleware ai controller
- Organizza route per risorsa (tasks)
- Segue convenzioni RESTful standard

#### validate.js - Input Validation Layer

- Middleware di validazione dichiarativa con `express-validator`
- Regole separate per ogni endpoint
- Centralizzato e riutilizzabile
- Ritorna errori dettagliati con field specifici

#### taskController.js - Business Logic Layer

- Contiene tutta la logica di business
- Gestisce CRUD operations
- Implementa paginazione e filtri
- Non contiene logica di routing
- Delega errori al centralized error handler

#### database.js - Data Access Layer

- Configurazione SQLite con `better-sqlite3`
- Synchronous API (non async) per semplicità
- Setup iniziale schema e triggers
- Gestisce connection pooling
- Abilita WAL mode per performance

#### errorHandler.js - Error Handling Layer

- Centralizza gestione errori
- Gestisce diversi tipi di errori (HTTP, SQLite, Validation)
- Nasconde stack trace in produzione
- Formatta risposte di errore consistenti

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

1. **Input Validation**: Tutti gli input validati prima del processing
2. **SQL Injection Prevention**: Prepared statements per tutte le query
3. **HTTP Headers**: Helmet per security headers (XSS, CSP, etc.)
4. **CORS**: Configurabile per controllo origini
5. **Body Size Limit**: 10KB limit per mitigare DoS
6. **Non-root Container**: Docker container eseguito come utente non-root

### Performance Considerations

- **WAL Mode**: SQLite Write-Ahead Logging per concorrenza
- **Prepared Statements**: Query caching per performance
- **Synchronous Database**: better-sqlite3 più veloce di sqlite3 async
- **Connection Reuse**: Singola connessione database riutilizzata
- **Pagination**: Supporto nativo per query paginate

### Scalabilità e Manutenibilità

- **Separation of Concerns**: Ogni layer ha responsabilità chiara
- **Middleware Chain**: Facile aggiungere nuovo middleware
- **Validation Reuse**: Regole centralizzate e riutilizzabili
- **Error Centralization**: Un solo punto di gestione errori
- **Environment-based**: Configurazione via environment variables

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
  "environment": "production"
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

## Comandi Docker

```bash
# Avvio in background
docker compose up -d

# Visualizza log
docker compose logs -f api

# Sviluppo con hot-reload
docker compose watch

# Stop
docker compose down

# Stop e rimuovi volumi (cancella database)
docker compose down -v

# Rebuild immagine
docker compose build --no-cache
```

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

- ✅ Helmet per HTTP security headers
- ✅ CORS configurabile
- ✅ Validazione input con express-validator
- ✅ Container non-root
- ✅ Limiti su dimensione request body
- ✅ No-new-privileges in Docker

### Performance

- ✅ Multi-stage Docker build
- ✅ SQLite WAL mode per concorrenza
- ✅ Layer caching ottimizzato nel Dockerfile
- ✅ Limiti risorse nel Compose

### Affidabilità

- ✅ Graceful shutdown
- ✅ Health checks
- ✅ Gestione errori centralizzata
- ✅ Logging strutturato
- ✅ Restart policy

### Developer Experience

- ✅ Hot-reload con Docker Compose Watch
- ✅ Variabili d'ambiente con .env
- ✅ Codice organizzato per responsabilità

## Esempi con cURL

```bash
# Crea un task
curl -X POST http://localhost:3000/tasks \
  -H "Content-Type: application/json" \
  -d '{"title": "Imparare Docker", "priority": "high"}'

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
