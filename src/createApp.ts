/**
 * App Factory
 *
 * Creates and configures the Hono application.
 * Separated from server startup to enable testing.
 */

import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { cors } from 'hono/cors';
import { secureHeaders } from 'hono/secure-headers';
import { prettyJSON } from 'hono/pretty-json';
import { tasks } from './routes/taskRoutes.js';
import { notFoundHandler, errorHandler } from './middleware/errorHandler.js';

function createApp(): Hono {
  const app = new Hono();

  app.use('*', secureHeaders());
  app.use('*', cors({
    origin: process.env.CORS_ORIGIN ?? '*',
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowHeaders: ['Content-Type', 'Authorization']
  }));

  if (process.env.NODE_ENV !== 'test') {
    app.use('*', logger());
  }

  app.use('*', prettyJSON());

  app.get('/health', (c) => {
    return c.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV ?? 'development'
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

  return app;
}

export { createApp };
