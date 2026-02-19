/**
 * Task Routes
 *
 * Defines all REST endpoints for task management.
 * Follows standard RESTful conventions.
 *
 * Endpoints:
 *   GET    /tasks       - List all tasks (with filters and pagination)
 *   GET    /tasks/:id   - Get a single task
 *   POST   /tasks       - Create a new task
 *   PUT    /tasks/:id   - Fully update a task
 *   PATCH  /tasks/:id   - Partially update a task
 *   DELETE /tasks/:id   - Delete a task
 */

import { Hono } from 'hono';
import { 
  validateBody, 
  validateParams, 
  validateQuery,
  createTaskSchema,
  updateTaskSchema,
  patchTaskSchema,
  idParamSchema,
  listQuerySchema
} from '../middleware/validate.js';
import {
  getAllTasks,
  getTaskById,
  createTask,
  updateTask,
  patchTask,
  deleteTask
} from '../controllers/taskController.js';

const tasks = new Hono();

tasks.get('/', 
  validateQuery(listQuerySchema), 
  getAllTasks
);

tasks.get('/:id', 
  validateParams(idParamSchema), 
  getTaskById
);

tasks.post('/', 
  validateBody(createTaskSchema), 
  createTask
);

tasks.put('/:id', 
  validateParams(idParamSchema),
  validateBody(updateTaskSchema), 
  updateTask
);

tasks.patch('/:id', 
  validateParams(idParamSchema),
  validateBody(patchTaskSchema), 
  patchTask
);

tasks.delete('/:id', 
  validateParams(idParamSchema), 
  deleteTask
);

export { tasks };
