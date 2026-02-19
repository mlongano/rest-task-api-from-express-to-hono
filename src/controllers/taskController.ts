/**
 * Task Controller
 *
 * Contains business logic for all CRUD operations on tasks.
 * Separated from routes to keep code organized and testable.
 */

import type { Context } from 'hono';
import { db } from '../config/database.js';
import type { 
  Task, 
  CreateTaskInput, 
  UpdateTaskInput, 
  PatchTaskInput, 
  PaginationQuery,
  ApiResponse,
  ApiMessageResponse,
  PaginationMeta
} from '../types/index.js';

function getAllTasks(c: Context) {
  const query = c.get('validatedQuery') as PaginationQuery;
  const { completed, priority, limit = 50, offset = 0 } = query;

  let sql = 'SELECT * FROM tasks WHERE 1=1';
  const params: Record<string, unknown> = {};

  if (completed !== undefined) {
    sql += ' AND completed = @completed';
    params.completed = completed === 'true' ? 1 : 0;
  }

  if (priority) {
    sql += ' AND priority = @priority';
    params.priority = priority;
  }

  sql += ' ORDER BY created_at DESC LIMIT @limit OFFSET @offset';
  params.limit = limit;
  params.offset = offset;

  const tasks = db.prepare(sql).all(params) as Task[];

  let countSql = 'SELECT COUNT(*) as total FROM tasks WHERE 1=1';
  if (completed !== undefined) {
    countSql += ' AND completed = ' + (completed === 'true' ? 1 : 0);
  }
  if (priority) {
    countSql += ` AND priority = '${priority}'`;
  }
  const { total } = db.prepare(countSql).get() as { total: number };

  const pagination: PaginationMeta = {
    total,
    limit,
    offset,
    hasMore: offset + tasks.length < total
  };

  return c.json<{ data: Task[]; pagination: PaginationMeta }>({
    data: tasks,
    pagination
  });
}

function getTaskById(c: Context) {
  const { id } = c.get('validatedParams') as { id: number };

  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as Task | undefined;

  if (!task) {
    return c.json<ApiResponse<{ error: string; message: string }>>({
      data: {
        error: 'Not Found',
        message: `Task with id ${id} not found`
      }
    }, 404);
  }

  return c.json<ApiResponse<Task>>({ data: task });
}

function createTask(c: Context) {
  const input = c.get('validatedBody') as CreateTaskInput;
  const { title, description = null, priority = 'medium' } = input;

  const result = db.prepare(`
    INSERT INTO tasks (title, description, priority)
    VALUES (@title, @description, @priority)
  `).run({ title, description, priority });

  const newTask = db.prepare('SELECT * FROM tasks WHERE id = ?').get(result.lastInsertRowid) as Task;

  return c.json<ApiMessageResponse<Task>>({
    message: 'Task created successfully',
    data: newTask
  }, 201);
}

function updateTask(c: Context) {
  const { id } = c.get('validatedParams') as { id: number };
  const input = c.get('validatedBody') as UpdateTaskInput;
  const { title, description, completed, priority } = input;

  const existingTask = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as Task | undefined;
  
  if (!existingTask) {
    return c.json<ApiResponse<{ error: string; message: string }>>({
      data: {
        error: 'Not Found',
        message: `Task with id ${id} not found`
      }
    }, 404);
  }

  db.prepare(`
    UPDATE tasks 
    SET title = @title, 
        description = @description, 
        completed = @completed, 
        priority = @priority
    WHERE id = @id
  `).run({
    id,
    title,
    description: description ?? null,
    completed: completed ? 1 : 0,
    priority
  });

  const updatedTask = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as Task;

  return c.json<ApiMessageResponse<Task>>({
    message: 'Task updated successfully',
    data: updatedTask
  });
}

function patchTask(c: Context) {
  const { id } = c.get('validatedParams') as { id: number };
  const updates = c.get('validatedBody') as PatchTaskInput;

  const existingTask = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as Task | undefined;
  
  if (!existingTask) {
    return c.json<ApiResponse<{ error: string; message: string }>>({
      data: {
        error: 'Not Found',
        message: `Task with id ${id} not found`
      }
    }, 404);
  }

  const allowedFields = ['title', 'description', 'completed', 'priority'] as const;
  const fieldsToUpdate = allowedFields.filter(key => key in updates && updates[key] !== undefined);

  if (fieldsToUpdate.length === 0) {
    return c.json<ApiResponse<{ error: string; message: string }>>({
      data: {
        error: 'Bad Request',
        message: 'No valid fields to update'
      }
    }, 400);
  }

  const setClause = fieldsToUpdate.map(field => `${field} = @${field}`).join(', ');
  const params: Record<string, unknown> = { id };

  for (const field of fieldsToUpdate) {
    if (field === 'completed') {
      params[field] = updates[field] ? 1 : 0;
    } else {
      params[field] = updates[field];
    }
  }

  db.prepare(`UPDATE tasks SET ${setClause} WHERE id = @id`).run(params);

  const updatedTask = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as Task;

  return c.json<ApiMessageResponse<Task>>({
    message: 'Task updated successfully',
    data: updatedTask
  });
}

function deleteTask(c: Context) {
  const { id } = c.get('validatedParams') as { id: number };

  const existingTask = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as Task | undefined;
  
  if (!existingTask) {
    return c.json<ApiResponse<{ error: string; message: string }>>({
      data: {
        error: 'Not Found',
        message: `Task with id ${id} not found`
      }
    }, 404);
  }

  db.prepare('DELETE FROM tasks WHERE id = ?').run(id);

  return c.body(null, 204);
}

export {
  getAllTasks,
  getTaskById,
  createTask,
  updateTask,
  patchTask,
  deleteTask
};
