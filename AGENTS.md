# AGENTS.md - Task API Codebase Guide

This document provides essential information for AI coding agents working in this repository.

## Project Overview

REST API for task management built with Hono, TypeScript, and SQLite. Uses Node.js native modules and requires Node.js 20+.

## Commands

### Development
```bash
npm run dev          # Start with hot-reload (tsx watch)
npm start            # Production server (requires build first)
```

### Build
```bash
npm run build        # Compile TypeScript to dist/
```

### Linting & Type Checking
```bash
npm run lint         # Run ESLint on src/
npm run lint:fix     # Auto-fix linting issues
npm run typecheck    # Type check without emitting
```

### Testing
No test framework is currently configured. If tests are added, update this section with:
```bash
npm test                    # Run all tests
npm test -- path/to/test.ts # Run single test file
```

### Docker
```bash
docker compose up -d         # Start in background
docker compose down          # Stop containers
docker compose build --no-cache  # Rebuild image
```

## Project Structure

```
src/
├── app.ts                 # Entry point, Hono setup, middleware
├── config/
│   └── database.ts        # SQLite configuration and initialization
├── controllers/
│   └── taskController.ts  # Business logic for CRUD operations
├── middleware/
│   ├── errorHandler.ts    # Centralized error handling
│   └── validate.ts        # Zod validation schemas
├── routes/
│   └── taskRoutes.ts      # Route definitions
└── types/
    └── index.ts           # TypeScript type definitions
```

## Code Style Guidelines

### Module System
- Use ES modules (`import`/`export`)
- Use `.js` extension in imports for ESM compatibility (TypeScript requirement)

### Import Order
```typescript
// 1. External packages first
import { Hono } from 'hono';
import { z } from 'zod';

// 2. Node.js built-ins second
import path from 'node:path';

// 3. Internal modules third (with .js extension)
import { db } from './config/database.js';
import type { Task } from './types/index.js';
```

### Naming Conventions
| Type | Convention | Example |
|------|------------|---------|
| Functions | camelCase | `getAllTasks`, `createTask` |
| Variables | camelCase | `dbPath`, `statusCode` |
| Classes | PascalCase | `HttpError` |
| Files | camelCase | `taskController.ts`, `errorHandler.ts` |
| Constants | SCREAMING_SNAKE_CASE | `PORT`, `NODE_ENV` |
| Types/Interfaces | PascalCase | `Task`, `ApiResponse` |

### Function Declarations
Use function declarations for exported functions:
```typescript
function getAllTasks(c: Context) {
  // implementation
}

export { getAllTasks };
```

### Type Definitions
Define types in `src/types/index.ts`. Use `type` for unions/primitives, `interface` for objects:
```typescript
export type Priority = 'low' | 'medium' | 'high';

export interface Task {
  id: number;
  title: string;
  // ...
}
```

### Error Handling
- Use typed error responses with `ApiErrorResponse`
- Throw `HttpError` for HTTP errors
- Global error handler catches all errors

### Response Format
Success responses wrap data with typed generics:
```typescript
return c.json<ApiResponse<Task>>({ data: task });
return c.json<ApiMessageResponse<Task>>({ message: 'Created', data: newTask }, 201);
```

Error responses:
```typescript
return c.json<ApiErrorResponse>({
  error: 'Not Found',
  message: `Task with id ${id} not found`,
  timestamp: new Date().toISOString()
}, 404);
```

### Validation Pattern
Use Zod schemas with validation middleware:
```typescript
export const createTaskSchema = z.object({
  title: z.string().trim().min(1).max(200),
  priority: z.enum(['low', 'medium', 'high']).optional()
});

// In route:
app.post('/', validateBody(createTaskSchema), createTask);

// In controller:
const input = c.get('validatedBody') as CreateTaskInput;
```

### Database Queries
Use better-sqlite3 with typed results:
```typescript
const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as Task | undefined;
db.prepare('INSERT INTO tasks (title) VALUES (@title)').run({ title });
```

### Comments
- JSDoc-style header comments at file top
- Brief inline comments for complex logic
- Comments may be in English or Italian (match existing style)

### Hono Patterns
- Create routers with `new Hono()`
- Mount routers: `app.route('/tasks', tasks)`
- Middleware order: security → logging → routes → 404 → error handler

### Environment Variables
- `PORT` - Server port (default: 3000)
- `HOST` - Bind address (default: 0.0.0.0)
- `NODE_ENV` - Environment (development/production)
- `DB_PATH` - SQLite database path
- `CORS_ORIGIN` - CORS origin setting

## Security Practices
- Use `secureHeaders()` middleware from Hono
- Validate all input with Zod schemas
- Use parameterized queries for SQL (prevent injection)
- Use non-root user in Docker

## Adding New Features

1. Add types in `src/types/index.ts`
2. Create Zod schema in `src/middleware/validate.ts`
3. Create controller function in `src/controllers/`
4. Create route in `src/routes/` with validation middleware
5. Update database schema in `src/config/database.ts` if needed

## Run After Changes
Always run type checking and linting after making changes:
```bash
npm run typecheck && npm run lint
```
