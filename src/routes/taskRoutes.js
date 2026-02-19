/**
 * Task Routes
 * 
 * Definisce tutti gli endpoint REST per la gestione dei task.
 * Segue le convenzioni RESTful standard.
 * 
 * Endpoints:
 *   GET    /tasks       - Lista tutti i task (con filtri e paginazione)
 *   GET    /tasks/:id   - Ottieni un singolo task
 *   POST   /tasks       - Crea un nuovo task
 *   PUT    /tasks/:id   - Aggiorna completamente un task
 *   PATCH  /tasks/:id   - Aggiorna parzialmente un task
 *   DELETE /tasks/:id   - Elimina un task
 */

const express = require('express');
const router = express.Router();

// Controller con la logica business
const taskController = require('../controllers/taskController');

// Middleware di validazione
const {
  createTaskValidation,
  updateTaskValidation,
  patchTaskValidation,
  idParamValidation,
  listQueryValidation
} = require('../middleware/validate');

// === ROUTE DEFINITIONS ===

// GET /tasks - Lista task con filtri opzionali
// Query params: completed, priority, limit, offset
router.get('/', 
  listQueryValidation, 
  taskController.getAllTasks
);

// GET /tasks/:id - Singolo task per ID
router.get('/:id', 
  idParamValidation, 
  taskController.getTaskById
);

// POST /tasks - Crea nuovo task
// Body: { title: string, description?: string, priority?: 'low'|'medium'|'high' }
router.post('/', 
  createTaskValidation, 
  taskController.createTask
);

// PUT /tasks/:id - Aggiornamento completo (tutti i campi richiesti)
// Body: { title: string, description?: string, completed: boolean, priority: string }
router.put('/:id', 
  updateTaskValidation, 
  taskController.updateTask
);

// PATCH /tasks/:id - Aggiornamento parziale (solo campi forniti)
// Body: { title?: string, description?: string, completed?: boolean, priority?: string }
router.patch('/:id', 
  patchTaskValidation, 
  taskController.patchTask
);

// DELETE /tasks/:id - Elimina task
router.delete('/:id', 
  idParamValidation, 
  taskController.deleteTask
);

module.exports = router;
