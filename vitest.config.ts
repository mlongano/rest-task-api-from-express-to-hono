import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    env: {
      DB_PATH: ':memory:',
      NODE_ENV: 'test'
    },
    setupFiles: ['./tests/setup.ts']
  }
});
