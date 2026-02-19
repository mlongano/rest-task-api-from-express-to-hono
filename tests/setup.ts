/**
 * Test Setup
 *
 * Initializes in-memory SQLite database before tests run.
 * Cleans up after all tests complete.
 */

import { beforeAll, beforeEach, afterAll } from 'vitest';
import { initializeDatabase, closeDatabase, db } from '../src/config/database.js';

beforeAll(() => {
  initializeDatabase();
});

beforeEach(() => {
  db.exec('DELETE FROM tasks');
});

afterAll(() => {
  closeDatabase();
});
