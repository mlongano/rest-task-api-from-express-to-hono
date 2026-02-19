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
