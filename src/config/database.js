/**
 * Configurazione Database SQLite
 * 
 * Usa better-sqlite3 che è sincrono e più performante di sqlite3 asincrono
 * per la maggior parte dei casi d'uso. È anche più semplice da usare.
 */

const Database = require('better-sqlite3');
const path = require('path');

// Percorso del database - usa variabile d'ambiente o default
// In Docker, DB_PATH punta al volume montato per la persistenza
const dbPath = process.env.DB_PATH || path.join(__dirname, '../../data/tasks.db');

// Inizializza la connessione al database
// L'opzione 'verbose' logga le query in development (utile per debug)
const db = new Database(dbPath, {
  verbose: process.env.NODE_ENV === 'development' ? console.log : null
});

// Abilita foreign keys (disabilitate di default in SQLite)
db.pragma('journal_mode = WAL');  // Write-Ahead Logging per migliori performance
db.pragma('foreign_keys = ON');

/**
 * Inizializza lo schema del database
 * Crea le tabelle se non esistono
 */
function initializeDatabase() {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      completed INTEGER DEFAULT 0,
      priority TEXT DEFAULT 'medium' CHECK(priority IN ('low', 'medium', 'high')),
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `;

  db.exec(createTableQuery);

  // Crea un trigger per aggiornare automaticamente updated_at
  const createTriggerQuery = `
    CREATE TRIGGER IF NOT EXISTS update_task_timestamp 
    AFTER UPDATE ON tasks
    BEGIN
      UPDATE tasks SET updated_at = datetime('now') WHERE id = NEW.id;
    END
  `;

  db.exec(createTriggerQuery);

  console.log('✓ Database initialized successfully');
}

/**
 * Chiude la connessione al database
 * Chiamato durante il graceful shutdown
 */
function closeDatabase() {
  db.close();
  console.log('✓ Database connection closed');
}

module.exports = {
  db,
  initializeDatabase,
  closeDatabase
};
