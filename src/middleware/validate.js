/**
 * Validation Middleware
 * 
 * Definisce le regole di validazione per ogni endpoint.
 * Usa express-validator per validazione dichiarativa.
 */

const { body, param, query, validationResult } = require('express-validator');

/**
 * Middleware che controlla i risultati della validazione
 * Se ci sono errori, passa al errorHandler tramite next(error)
 */
function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const error = new Error('Validation failed');
    error.statusCode = 400;
    error.name = 'ValidationError';
    error.details = errors.array().map(err => ({
      field: err.path,
      message: err.msg,
      value: err.value
    }));
    return next(error);
  }

  next();
}

/**
 * Validazione per creazione task (POST /tasks)
 */
const createTaskValidation = [
  body('title')
    .trim()
    .notEmpty().withMessage('Title is required')
    .isLength({ min: 1, max: 200 }).withMessage('Title must be between 1 and 200 characters'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 }).withMessage('Description must be at most 1000 characters'),
  
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high']).withMessage('Priority must be low, medium, or high'),
  
  handleValidationErrors
];

/**
 * Validazione per aggiornamento completo task (PUT /tasks/:id)
 */
const updateTaskValidation = [
  param('id')
    .isInt({ min: 1 }).withMessage('ID must be a positive integer'),
  
  body('title')
    .trim()
    .notEmpty().withMessage('Title is required')
    .isLength({ min: 1, max: 200 }).withMessage('Title must be between 1 and 200 characters'),
  
  body('description')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 1000 }).withMessage('Description must be at most 1000 characters'),
  
  body('completed')
    .isBoolean().withMessage('Completed must be a boolean'),
  
  body('priority')
    .isIn(['low', 'medium', 'high']).withMessage('Priority must be low, medium, or high'),
  
  handleValidationErrors
];

/**
 * Validazione per aggiornamento parziale task (PATCH /tasks/:id)
 */
const patchTaskValidation = [
  param('id')
    .isInt({ min: 1 }).withMessage('ID must be a positive integer'),
  
  body('title')
    .optional()
    .trim()
    .notEmpty().withMessage('Title cannot be empty')
    .isLength({ min: 1, max: 200 }).withMessage('Title must be between 1 and 200 characters'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 }).withMessage('Description must be at most 1000 characters'),
  
  body('completed')
    .optional()
    .isBoolean().withMessage('Completed must be a boolean'),
  
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high']).withMessage('Priority must be low, medium, or high'),
  
  handleValidationErrors
];

/**
 * Validazione per parametro ID nelle route
 */
const idParamValidation = [
  param('id')
    .isInt({ min: 1 }).withMessage('ID must be a positive integer'),
  
  handleValidationErrors
];

/**
 * Validazione per query parameters di lista
 */
const listQueryValidation = [
  query('completed')
    .optional()
    .isIn(['true', 'false']).withMessage('Completed must be true or false'),
  
  query('priority')
    .optional()
    .isIn(['low', 'medium', 'high']).withMessage('Priority must be low, medium, or high'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  
  query('offset')
    .optional()
    .isInt({ min: 0 }).withMessage('Offset must be a non-negative integer'),
  
  handleValidationErrors
];

module.exports = {
  createTaskValidation,
  updateTaskValidation,
  patchTaskValidation,
  idParamValidation,
  listQueryValidation
};
