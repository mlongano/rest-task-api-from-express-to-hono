# AGENTS.md - Task API

This file provides guidelines for agentic coding assistants working on this project.

## Build/Lint/Commands

```bash
# Start server
npm start

# Development with hot-reload (uses --watch flag)
npm run dev

# Linting
npm run lint          # Check for issues
npm run lint:fix      # Auto-fix linting issues

# Docker
docker compose up -d           # Start in background
docker compose down            # Stop
docker compose down -v         # Stop + remove volumes (deletes database)
docker compose logs -f api     # View logs
docker compose watch           # Hot-reload in Docker
```

**Note**: No test framework is currently configured. When adding tests, use Jest or Mocha and add test scripts to package.json.

## Project Overview

- **Stack**: Node.js 20+, Express 4, SQLite (better-sqlite3), Helmet, CORS, Morgan
- **Language**: JavaScript (CommonJS - require/module.exports)
- **API Style**: RESTful with JSON responses
- **Database**: SQLite with better-sqlite3 (synchronous API)

## Code Style Guidelines

### File Organization
```
src/
├── app.js              # Entry point, middleware setup
├── config/             # Configuration (database, etc.)
├── controllers/        # Business logic
├── middleware/         # Express middleware
└── routes/            # Route definitions
```

### Import/Module System
- Use CommonJS: `require()` and `module.exports`
- Internal modules: `const { fn } = require('./relative/path')`
- External packages: `const express = require('express')`
- Destructure exports: `const { db, init } = require('./config/database')`

### Naming Conventions
- **Variables/Functions**: `camelCase` - `getAllTasks`, `const userId`
- **Classes**: `PascalCase` - `class HttpError`
- **Constants**: `UPPER_SNAKE_CASE` - `NODE_ENV`, `PORT`
- **Database columns**: `snake_case` - `created_at`, `updated_at`
- **File names**: `camelCase.js` - `taskController.js`, `errorHandler.js`

### Function Structure
```javascript
/**
 * Brief description in Italian (matching existing code)
 * 
 * Additional context if needed
 */
function functionName(req, res, next) {
  try {
    // Logic here
    res.json({ data: result });
  } catch (error) {
    next(error); // Always pass to error handler
  }
}
```

### Response Format
- **Success**: `{ data: <object> }` or `{ message: <string>, data: <object> }`
- **Error**: `{ error: <string>, message: <string>, timestamp: <ISO8601> }`
- **List with pagination**: `{ data: [], pagination: { total, limit, offset, hasMore } }`
- **Delete**: `204 No Content` (no body)
- **Create**: `201 Created` with created resource

### HTTP Status Codes
- `200` - OK
- `201` - Created
- `204` - No Content (DELETE)
- `400` - Bad Request (validation errors)
- `404` - Not Found
- `500` - Internal Server Error

### Error Handling
- Use try/catch in all controller functions
- Pass errors to `next(error)` for centralized handling
- Don't send responses directly in catch blocks
- Error handler in `src/middleware/errorHandler.js` handles all errors

### Validation
- Use `express-validator` for input validation
- Define validation rules in `src/middleware/validate.js`
- Chain validation middleware before controllers
- Format: `body('field').trim().notEmpty().withMessage('message')`

### Database Operations
- Use `better-sqlite3` (synchronous API, not async)
- Prepared statements with named parameters: `db.prepare('SELECT * WHERE id = @id').get({ id })`
- Query strings in template literals for readability
- Boolean values stored as 0/1 in SQLite

### Comments & Documentation
- JSDoc-style comments for all exported functions
- Italian descriptions (matching existing codebase)
- Section comments with `=== SECTION NAME ===` for major blocks
- Brief inline comments only when logic is non-obvious

### Middleware
- Global middleware in `app.js` before routes
- Route-specific middleware in route definitions
- Error handler must be LAST middleware
- Custom error classes extend `Error` with `statusCode`

### Security Best Practices
- Always validate and sanitize input
- Use prepared statements for SQL (no string concatenation)
- Limit request body size (`express.json({ limit: '10kb' })`)
- Helmet middleware enabled
- CORS configured via `CORS_ORIGIN` env var

### Environment Variables
- Use `process.env.VAR || defaultValue` pattern
- Document required variables in `.env.example`
- Never commit `.env` file
- Key variables: `NODE_ENV`, `PORT`, `HOST`, `DB_PATH`, `CORS_ORIGIN`

### Git Conventions
- No auto-commits unless explicitly requested
- Check `git status` and `git diff` before committing
- Write concise commit messages (1-2 sentences)
- Follow existing commit message style

## When Editing Code

1. Read the file first before making changes
2. Match existing code style exactly
3. Follow the project structure (controllers, routes, middleware separation)
4. Run `npm run lint` after changes
5. Test changes manually if no test suite exists
6. Check existing patterns before introducing new ones
