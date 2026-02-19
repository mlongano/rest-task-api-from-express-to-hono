/**
 * Task API - Entry Point
 * 
 * Applicazione Express REST API con SQLite.
 * Include best practices: security headers, logging, graceful shutdown, healthcheck.
 */

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');

// Configurazione e moduli interni
const { initializeDatabase, closeDatabase } = require('./config/database');
const taskRoutes = require('./routes/taskRoutes');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

// Inizializza Express
const app = express();

// Configurazione da variabili d'ambiente con defaults
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const NODE_ENV = process.env.NODE_ENV || 'development';

// === MIDDLEWARE GLOBALI ===

// Helmet: aggiunge header HTTP di sicurezza (XSS, clickjacking, etc.)
app.use(helmet());

// CORS: permette richieste cross-origin (configurabile per produzione)
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Morgan: logging delle richieste HTTP
// 'dev' per development (colorato), 'combined' per production (Apache format)
app.use(morgan(NODE_ENV === 'development' ? 'dev' : 'combined'));

// Parser JSON per request body
app.use(express.json({ limit: '10kb' }));  // Limita dimensione body per sicurezza

// Parser URL-encoded (per form submissions)
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// === ROUTES ===

// Healthcheck endpoint (usato da Docker e load balancer)
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: NODE_ENV
  });
});

// API info endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'Task API',
    version: '1.0.0',
    description: 'REST API for task management',
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

// Mount delle route per i task
app.use('/tasks', taskRoutes);

// === ERROR HANDLING ===

// Handler per route non trovate (404)
app.use(notFoundHandler);

// Handler errori globale (deve essere l'ultimo middleware)
app.use(errorHandler);

// === SERVER STARTUP ===

// Inizializza il database prima di avviare il server
initializeDatabase();

const server = app.listen(PORT, HOST, () => {
  console.log(`
╔═══════════════════════════════════════════════════════╗
║                    Task API Server                    ║
╠═══════════════════════════════════════════════════════╣
║  Status:      Running                                 ║
║  URL:         http://${HOST}:${PORT.toString().padEnd(24)}║
║  Environment: ${NODE_ENV.padEnd(40)}║
║  Process ID:  ${process.pid.toString().padEnd(40)}║
╚═══════════════════════════════════════════════════════╝
  `);
});

// === GRACEFUL SHUTDOWN ===
// Gestisce la chiusura pulita quando il container riceve SIGTERM/SIGINT

function gracefulShutdown(signal) {
  console.log(`\n⚠ Received ${signal}. Starting graceful shutdown...`);

  // Smette di accettare nuove connessioni
  server.close((err) => {
    if (err) {
      console.error('✗ Error during server shutdown:', err);
      process.exit(1);
    }

    console.log('✓ HTTP server closed');

    // Chiude la connessione al database
    try {
      closeDatabase();
      console.log('✓ Graceful shutdown completed');
      process.exit(0);
    } catch (dbErr) {
      console.error('✗ Error closing database:', dbErr);
      process.exit(1);
    }
  });

  // Forza chiusura dopo 10 secondi se lo shutdown non completa
  setTimeout(() => {
    console.error('✗ Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
}

// Registra handler per segnali di terminazione
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handler per errori non gestiti (non dovrebbero mai accadere in produzione)
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  gracefulShutdown('uncaughtException');
});

module.exports = app;  // Esporta per testing
