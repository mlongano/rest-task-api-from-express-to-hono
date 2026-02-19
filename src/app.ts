/**
 * Task API - Entry Point
 *
 * Hono application with TypeScript.
 * Best practices: structured logging, graceful shutdown, healthcheck.
 */

import { serve } from '@hono/node-server';
import { initializeDatabase, closeDatabase } from './config/database.js';
import { createApp } from './createApp.js';

const PORT = parseInt(process.env.PORT ?? '3000', 10);
const HOST = process.env.HOST ?? '0.0.0.0';
const NODE_ENV = process.env.NODE_ENV ?? 'development';

const app = createApp();

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
