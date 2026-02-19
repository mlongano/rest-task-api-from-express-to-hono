/**
 * Task Controller
 * 
 * Contiene la logica business per tutte le operazioni CRUD sui task.
 * Separato dalle route per mantenere il codice organizzato e testabile.
 */

const { db } = require('../config/database');

/**
 * GET /tasks
 * Recupera tutti i task con supporto per filtri e paginazione
 */
function getAllTasks(req, res, next) {
  try {
    // Query parameters per filtri e paginazione
    const { completed, priority, limit = 50, offset = 0 } = req.query;

    let query = 'SELECT * FROM tasks WHERE 1=1';
    const params = {};

    // Filtro per stato completamento
    if (completed !== undefined) {
      query += ' AND completed = @completed';
      params.completed = completed === 'true' ? 1 : 0;
    }

    // Filtro per priorità
    if (priority) {
      query += ' AND priority = @priority';
      params.priority = priority;
    }

    // Ordinamento e paginazione
    query += ' ORDER BY created_at DESC LIMIT @limit OFFSET @offset';
    params.limit = parseInt(limit);
    params.offset = parseInt(offset);

    const tasks = db.prepare(query).all(params);

    // Conta totale per paginazione
    let countQuery = 'SELECT COUNT(*) as total FROM tasks WHERE 1=1';
    if (completed !== undefined) {
      countQuery += ' AND completed = ' + (completed === 'true' ? 1 : 0);
    }
    if (priority) {
      countQuery += ` AND priority = '${priority}'`;
    }
    const { total } = db.prepare(countQuery).get();

    res.json({
      data: tasks,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: parseInt(offset) + tasks.length < total
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /tasks/:id
 * Recupera un singolo task per ID
 */
function getTaskById(req, res, next) {
  try {
    const { id } = req.params;

    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);

    if (!task) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Task with id ${id} not found`
      });
    }

    res.json({ data: task });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /tasks
 * Crea un nuovo task
 */
function createTask(req, res, next) {
  try {
    const { title, description = null, priority = 'medium' } = req.body;

    const result = db.prepare(`
      INSERT INTO tasks (title, description, priority)
      VALUES (@title, @description, @priority)
    `).run({ title, description, priority });

    // Recupera il task appena creato per restituirlo completo
    const newTask = db.prepare('SELECT * FROM tasks WHERE id = ?').get(result.lastInsertRowid);

    res.status(201).json({
      message: 'Task created successfully',
      data: newTask
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /tasks/:id
 * Aggiorna completamente un task esistente
 */
function updateTask(req, res, next) {
  try {
    const { id } = req.params;
    const { title, description, completed, priority } = req.body;

    // Verifica che il task esista
    const existingTask = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
    if (!existingTask) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Task with id ${id} not found`
      });
    }

    const result = db.prepare(`
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
      priority: priority || 'medium'
    });

    const updatedTask = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);

    res.json({
      message: 'Task updated successfully',
      data: updatedTask
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /tasks/:id
 * Aggiorna parzialmente un task (solo i campi forniti)
 */
function patchTask(req, res, next) {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Verifica che il task esista
    const existingTask = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
    if (!existingTask) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Task with id ${id} not found`
      });
    }

    // Costruisce query dinamica solo per i campi forniti
    const allowedFields = ['title', 'description', 'completed', 'priority'];
    const fieldsToUpdate = Object.keys(updates).filter(key => allowedFields.includes(key));

    if (fieldsToUpdate.length === 0) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'No valid fields to update'
      });
    }

    const setClause = fieldsToUpdate.map(field => `${field} = @${field}`).join(', ');
    const params = { id };

    fieldsToUpdate.forEach(field => {
      if (field === 'completed') {
        params[field] = updates[field] ? 1 : 0;
      } else {
        params[field] = updates[field];
      }
    });

    db.prepare(`UPDATE tasks SET ${setClause} WHERE id = @id`).run(params);

    const updatedTask = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);

    res.json({
      message: 'Task updated successfully',
      data: updatedTask
    });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /tasks/:id
 * Elimina un task
 */
function deleteTask(req, res, next) {
  try {
    const { id } = req.params;

    const existingTask = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
    if (!existingTask) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Task with id ${id} not found`
      });
    }

    db.prepare('DELETE FROM tasks WHERE id = ?').run(id);

    // 204 No Content è lo standard per DELETE riuscito senza body
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getAllTasks,
  getTaskById,
  createTask,
  updateTask,
  patchTask,
  deleteTask
};
