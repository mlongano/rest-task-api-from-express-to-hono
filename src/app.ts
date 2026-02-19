/**
 * Task API - Entry Point
 * 
 * Hono application with TypeScript.
 * Best practices: structured logging, graceful shutdown, healthcheck.
 */

import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { cors } from 'hono/cors';
import { secureHeaders } from 'hono/secure-headers';
import { prettyJSON } from 'hono/pretty-json';
import { serve } from '@hono/node-server';
import { initializeDatabase, closeDatabase } from './config/database.js';
import { tasks } from './routes/taskRoutes.js';
import { notFoundHandler, errorHandler } from './middleware/errorHandler.js';

const PORT = parseInt(process.env.PORT ?? '3000', 10);
const HOST = process.env.HOST ?? '0.0.0.0';
const NODE_ENV = process.env.NODE_ENV ?? 'development';

const app = new Hono();

app.use('*', secureHeaders());
app.use('*', cors({
  origin: process.env.CORS_ORIGIN ?? '*',
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowHeaders: ['Content-Type', 'Authorization']
}));
app.use('*', logger());
app.use('*', prettyJSON());

app.get('/health', (c) => {
  return c.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: NODE_ENV
  });
});

app.get('/', (c) => {
  return c.json({
    name: 'Task API',
    version: '2.0.0',
    description: 'REST API for task management (Hono + TypeScript)',
    endpoints: {
      health: 'GET /health',
      tasks: {
        list: 'GET /tasks',
        get: 'GET /tasks/:id',
        create: 'POST /tasks',
        update: 'PUT /tasks/:id',
        patch: 'PATCH /tasks/:id',
        delete: 'DELETE /tasks/:id'
      }
    }
  });
});

app.route('/tasks', tasks);

app.notFound(notFoundHandler);
app.onError(errorHandler);

initializeDatabase();

const server = serve({
  fetch: app.fetch,
  port: PORT,
  hostname: HOST
});

console.log(`
╔═══════════════════════════════════════════════════════╗
║                    Task API Server                     ║
╠═══════════════════════════════════════════════════════╣
║  Status:      Running                                  ║
║  URL:         http://${HOST}:${PORT.toString().padEnd(32)}║
║  Environment: ${NODE_ENV.padEnd(40)}║
║  Runtime:     Node.js                                  ║
╚═══════════════════════════════════════════════════════╝
`);

function gracefulShutdown(signal: string) {
  console.log(`\n⚠ Received ${signal}. Starting graceful shutdown...`);

  server.close((err) => {
    if (err) {
      console.error('✗ Error during server shutdown:', err);
      process.exit(1);
    }

    console.log('✓ HTTP server closed');

    try {
      closeDatabase();
      console.log('✓ Graceful shutdown completed');
      process.exit(0);
    } catch (dbErr) {
      console.error('✗ Error closing database:', dbErr);
      process.exit(1);
    }
  });

  setTimeout(() => {
    console.error('✗ Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  gracefulShutdown('uncaughtException');
});

export { app };
