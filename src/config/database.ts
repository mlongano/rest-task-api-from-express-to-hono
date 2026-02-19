/**
 * Database Configuration - SQLite
 *
 * Uses better-sqlite3 which is synchronous and more performant
 * for most use cases. Also simpler to use.
 */

import Database, { type Database as DatabaseType } from 'better-sqlite3';
import path from 'node:path';

const dbPath = process.env.DB_PATH ?? path.join(__dirname, '../../data/tasks.db');

const db: DatabaseType = new Database(dbPath, {
  verbose: process.env.NODE_ENV === 'development' ? console.log : undefined
});

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function initializeDatabase(): void {
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

function closeDatabase(): void {
  db.close();
  console.log('✓ Database connection closed');
}

export { db, initializeDatabase, closeDatabase };
