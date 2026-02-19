/**
 * Task API - Automated Tests
 *
 * Integration tests using Hono's built-in app.request().
 * Mirrors all test cases from test-api.http.
 */

import { describe, it, expect } from 'vitest';
import { createApp } from '../src/createApp.js';
import { db } from '../src/config/database.js';

const app = createApp();

// Helper to make JSON requests
function jsonRequest(path: string, options: RequestInit = {}) {
  return app.request(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  });
}

// Helper to seed a task and return its ID
async function seedTask(overrides: Record<string, unknown> = {}): Promise<number> {
  const body = {
    title: 'Seeded Task',
    description: 'A task created for testing',
    priority: 'medium',
    ...overrides
  };
  const res = await jsonRequest('/tasks', {
    method: 'POST',
    body: JSON.stringify(body)
  });
  const json = await res.json();
  return json.data.id;
}

// ============================================================
// HEALTH CHECK & ROOT
// ============================================================

describe('Health & Root', () => {
  it('GET / should return API info', async () => {
    const res = await app.request('/');
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.name).toBe('Task API');
    expect(json.version).toBe('2.0.0');
    expect(json.endpoints).toBeDefined();
  });

  it('GET /health should return healthy status', async () => {
    const res = await app.request('/health');
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe('healthy');
    expect(json.timestamp).toBeDefined();
  });
});

// ============================================================
// CREATE TASK - POST /tasks
// ============================================================

describe('POST /tasks', () => {
  it('should create a task with all fields', async () => {
    const res = await jsonRequest('/tasks', {
      method: 'POST',
      body: JSON.stringify({
        title: 'Test Task',
        description: 'This is a test task',
        priority: 'high'
      })
    });
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.message).toBe('Task created successfully');
    expect(json.data.title).toBe('Test Task');
    expect(json.data.description).toBe('This is a test task');
    expect(json.data.priority).toBe('high');
    expect(json.data.completed).toBe(0);
    expect(json.data.id).toBeDefined();
  });

  it('should create a task with only title (minimal)', async () => {
    const res = await jsonRequest('/tasks', {
      method: 'POST',
      body: JSON.stringify({ title: 'Minimal Task' })
    });
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.data.title).toBe('Minimal Task');
    expect(json.data.priority).toBe('medium');
    expect(json.data.description).toBeNull();
  });

  it('should reject missing title', async () => {
    const res = await jsonRequest('/tasks', {
      method: 'POST',
      body: JSON.stringify({ description: 'Missing title' })
    });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('Validation Error');
  });

  it('should reject empty title', async () => {
    const res = await jsonRequest('/tasks', {
      method: 'POST',
      body: JSON.stringify({ title: '', description: 'Empty title' })
    });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('Validation Error');
  });

  it('should reject title over 200 characters', async () => {
    const res = await jsonRequest('/tasks', {
      method: 'POST',
      body: JSON.stringify({
        title: 'x'.repeat(201),
        description: 'Title too long'
      })
    });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('Validation Error');
  });

  it('should reject invalid priority', async () => {
    const res = await jsonRequest('/tasks', {
      method: 'POST',
      body: JSON.stringify({
        title: 'Test Task',
        priority: 'invalid'
      })
    });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('Validation Error');
  });

  it('should reject description over 1000 characters', async () => {
    const res = await jsonRequest('/tasks', {
      method: 'POST',
      body: JSON.stringify({
        title: 'Test Task',
        description: 'x'.repeat(1001)
      })
    });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('Validation Error');
  });

  it('should handle special characters in title', async () => {
    const res = await jsonRequest('/tasks', {
      method: 'POST',
      body: JSON.stringify({
        title: "Task with special chars: !@#$%^&*()_+-=[]{}|;':\",./<>?"
      })
    });
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.data.title).toContain('special chars');
  });

  it('should handle unicode characters', async () => {
    const res = await jsonRequest('/tasks', {
      method: 'POST',
      body: JSON.stringify({
        title: 'タスク 任务 Задача',
        description: 'Testing unicode characters: 日本語 Русский'
      })
    });
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.data.title).toBe('タスク 任务 Задача');
  });

  it('should accept title at exactly 200 characters', async () => {
    const res = await jsonRequest('/tasks', {
      method: 'POST',
      body: JSON.stringify({ title: 'x'.repeat(200) })
    });
    expect(res.status).toBe(201);
  });

  it('should accept description at exactly 1000 characters', async () => {
    const res = await jsonRequest('/tasks', {
      method: 'POST',
      body: JSON.stringify({
        title: 'Max description test',
        description: 'x'.repeat(1000)
      })
    });
    expect(res.status).toBe(201);
  });
});

// ============================================================
// LIST TASKS - GET /tasks
// ============================================================

describe('GET /tasks', () => {
  it('should return empty array when no tasks exist', async () => {
    const res = await app.request('/tasks');
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data).toEqual([]);
    expect(json.pagination.total).toBe(0);
  });

  it('should return all tasks', async () => {
    await seedTask({ title: 'Task 1' });
    await seedTask({ title: 'Task 2' });

    const res = await app.request('/tasks');
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data).toHaveLength(2);
    expect(json.pagination.total).toBe(2);
  });

  it('should filter by completed=true', async () => {
    const id = await seedTask({ title: 'To complete' });
    await seedTask({ title: 'Incomplete' });
    // Mark one as completed
    db.prepare('UPDATE tasks SET completed = 1 WHERE id = ?').run(id);

    const res = await app.request('/tasks?completed=true');
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data).toHaveLength(1);
    expect(json.data[0].completed).toBe(1);
  });

  it('should filter by completed=false', async () => {
    const id = await seedTask({ title: 'To complete' });
    await seedTask({ title: 'Incomplete' });
    db.prepare('UPDATE tasks SET completed = 1 WHERE id = ?').run(id);

    const res = await app.request('/tasks?completed=false');
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data).toHaveLength(1);
    expect(json.data[0].completed).toBe(0);
  });

  it('should filter by priority=high', async () => {
    await seedTask({ title: 'High', priority: 'high' });
    await seedTask({ title: 'Low', priority: 'low' });

    const res = await app.request('/tasks?priority=high');
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data).toHaveLength(1);
    expect(json.data[0].priority).toBe('high');
  });

  it('should filter by priority=medium', async () => {
    await seedTask({ title: 'Medium', priority: 'medium' });
    await seedTask({ title: 'Low', priority: 'low' });

    const res = await app.request('/tasks?priority=medium');
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data).toHaveLength(1);
    expect(json.data[0].priority).toBe('medium');
  });

  it('should filter by priority=low', async () => {
    await seedTask({ title: 'High', priority: 'high' });
    await seedTask({ title: 'Low', priority: 'low' });

    const res = await app.request('/tasks?priority=low');
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data).toHaveLength(1);
    expect(json.data[0].priority).toBe('low');
  });

  it('should support pagination with limit and offset', async () => {
    for (let i = 1; i <= 5; i++) {
      await seedTask({ title: `Task ${i}` });
    }

    const page1 = await app.request('/tasks?limit=2&offset=0');
    const json1 = await page1.json();
    expect(json1.data).toHaveLength(2);
    expect(json1.pagination.total).toBe(5);
    expect(json1.pagination.hasMore).toBe(true);

    const page2 = await app.request('/tasks?limit=2&offset=2');
    const json2 = await page2.json();
    expect(json2.data).toHaveLength(2);
    expect(json2.pagination.hasMore).toBe(true);

    const page3 = await app.request('/tasks?limit=2&offset=4');
    const json3 = await page3.json();
    expect(json3.data).toHaveLength(1);
    expect(json3.pagination.hasMore).toBe(false);
  });

  it('should support combined filters', async () => {
    await seedTask({ title: 'High incomplete', priority: 'high' });
    await seedTask({ title: 'Low incomplete', priority: 'low' });

    const res = await app.request('/tasks?completed=false&priority=high&limit=10&offset=0');
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data).toHaveLength(1);
    expect(json.data[0].priority).toBe('high');
  });

  it('should reject invalid completed filter', async () => {
    const res = await app.request('/tasks?completed=invalid');
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('Validation Error');
  });

  it('should reject invalid priority filter', async () => {
    const res = await app.request('/tasks?priority=invalid');
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('Validation Error');
  });

  it('should reject limit=0', async () => {
    const res = await app.request('/tasks?limit=0');
    expect(res.status).toBe(400);
  });

  it('should reject limit over 100', async () => {
    const res = await app.request('/tasks?limit=101');
    expect(res.status).toBe(400);
  });

  it('should reject negative offset', async () => {
    const res = await app.request('/tasks?offset=-1');
    expect(res.status).toBe(400);
  });
});

// ============================================================
// GET SINGLE TASK - GET /tasks/:id
// ============================================================

describe('GET /tasks/:id', () => {
  it('should return a task by ID', async () => {
    const id = await seedTask({ title: 'Find me' });

    const res = await app.request(`/tasks/${id}`);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.id).toBe(id);
    expect(json.data.title).toBe('Find me');
  });

  it('should return 404 for non-existent task', async () => {
    const res = await app.request('/tasks/99999');
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.data.error).toBe('Not Found');
  });

  it('should reject non-numeric ID', async () => {
    const res = await app.request('/tasks/abc');
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('Validation Error');
  });

  it('should reject negative ID', async () => {
    const res = await app.request('/tasks/-1');
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('Validation Error');
  });
});

// ============================================================
// UPDATE TASK - PUT /tasks/:id (Full Update)
// ============================================================

describe('PUT /tasks/:id', () => {
  it('should fully update a task', async () => {
    const id = await seedTask({ title: 'Original' });

    const res = await jsonRequest(`/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        title: 'Updated Task Title',
        description: 'Updated description',
        completed: true,
        priority: 'medium'
      })
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.message).toBe('Task updated successfully');
    expect(json.data.title).toBe('Updated Task Title');
    expect(json.data.description).toBe('Updated description');
    expect(json.data.completed).toBe(1);
    expect(json.data.priority).toBe('medium');
  });

  it('should reject missing title', async () => {
    const id = await seedTask();
    const res = await jsonRequest(`/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        description: 'Updated description',
        completed: true,
        priority: 'medium'
      })
    });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('Validation Error');
  });

  it('should reject missing completed', async () => {
    const id = await seedTask();
    const res = await jsonRequest(`/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        title: 'Updated Task',
        description: 'Updated description',
        priority: 'medium'
      })
    });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('Validation Error');
  });

  it('should reject missing priority', async () => {
    const id = await seedTask();
    const res = await jsonRequest(`/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        title: 'Updated Task',
        description: 'Updated description',
        completed: true
      })
    });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('Validation Error');
  });

  it('should reject invalid ID', async () => {
    const res = await jsonRequest('/tasks/abc', {
      method: 'PUT',
      body: JSON.stringify({
        title: 'Updated Task',
        description: 'Updated description',
        completed: true,
        priority: 'medium'
      })
    });
    expect(res.status).toBe(400);
  });

  it('should return 404 for non-existent task', async () => {
    const res = await jsonRequest('/tasks/99999', {
      method: 'PUT',
      body: JSON.stringify({
        title: 'Updated Task',
        description: 'Updated description',
        completed: true,
        priority: 'medium'
      })
    });
    expect(res.status).toBe(404);
  });
});

// ============================================================
// PATCH TASK - PATCH /tasks/:id (Partial Update)
// ============================================================

describe('PATCH /tasks/:id', () => {
  it('should update only title', async () => {
    const id = await seedTask({ title: 'Original' });

    const res = await jsonRequest(`/tasks/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ title: 'Patched Title Only' })
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.title).toBe('Patched Title Only');
    expect(json.data.description).toBe('A task created for testing');
  });

  it('should update only completed status', async () => {
    const id = await seedTask();

    const res = await jsonRequest(`/tasks/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ completed: true })
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.completed).toBe(1);
  });

  it('should update only priority', async () => {
    const id = await seedTask();

    const res = await jsonRequest(`/tasks/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ priority: 'low' })
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.priority).toBe('low');
  });

  it('should set description to null', async () => {
    const id = await seedTask({ description: 'Has description' });

    const res = await jsonRequest(`/tasks/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ description: null })
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.description).toBeNull();
  });

  it('should reject invalid ID', async () => {
    const res = await jsonRequest('/tasks/abc', {
      method: 'PATCH',
      body: JSON.stringify({ title: 'Patched Task' })
    });
    expect(res.status).toBe(400);
  });

  it('should reject invalid priority', async () => {
    const id = await seedTask();
    const res = await jsonRequest(`/tasks/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ priority: 'urgent' })
    });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('Validation Error');
  });

  it('should reject invalid completed type', async () => {
    const id = await seedTask();
    const res = await jsonRequest(`/tasks/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ completed: 'yes' })
    });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('Validation Error');
  });

  it('should reject empty title', async () => {
    const id = await seedTask();
    const res = await jsonRequest(`/tasks/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ title: '' })
    });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('Validation Error');
  });

  it('should return 404 for non-existent task', async () => {
    const res = await jsonRequest('/tasks/99999', {
      method: 'PATCH',
      body: JSON.stringify({ title: 'Patched Task' })
    });
    expect(res.status).toBe(404);
  });
});

// ============================================================
// DELETE TASK - DELETE /tasks/:id
// ============================================================

describe('DELETE /tasks/:id', () => {
  it('should delete a task', async () => {
    const id = await seedTask();

    const res = await app.request(`/tasks/${id}`, { method: 'DELETE' });
    expect(res.status).toBe(204);

    // Verify it's gone
    const check = await app.request(`/tasks/${id}`);
    expect(check.status).toBe(404);
  });

  it('should reject invalid ID', async () => {
    const res = await app.request('/tasks/abc', { method: 'DELETE' });
    expect(res.status).toBe(400);
  });

  it('should return 404 for non-existent task', async () => {
    const res = await app.request('/tasks/99999', { method: 'DELETE' });
    expect(res.status).toBe(404);
  });
});

// ============================================================
// ERROR HANDLING
// ============================================================

describe('Error Handling', () => {
  it('should return 404 for unknown routes', async () => {
    const res = await app.request('/nonexistent-route');
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toBe('Not Found');
  });

  it('should return 404 for wrong method on existing route', async () => {
    const res = await app.request('/tasks/1', { method: 'POST' });
    expect(res.status).toBe(404);
  });
});
