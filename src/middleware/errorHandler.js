/**
 * Error Handler Middleware
 * 
 * Gestisce tutti gli errori in modo centralizzato.
 * Deve essere l'ULTIMO middleware registrato in Express.
 */

/**
 * Classe per errori HTTP personalizzati
 */
class HttpError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
    this.name = 'HttpError';
  }
}

/**
 * Middleware per route non trovate (404)
 * Posizionare PRIMA dell'error handler
 */
function notFoundHandler(req, res, next) {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.originalUrl} not found`,
    timestamp: new Date().toISOString()
  });
}

/**
 * Middleware principale per la gestione errori
 * Cattura tutti gli errori passati a next(error)
 */
function errorHandler(err, req, res, next) {
  // Log dell'errore (in produzione usare un logger come Winston o Pino)
  console.error(`[ERROR] ${new Date().toISOString()}:`, {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    path: req.path,
    method: req.method
  });

  // Errori di validazione da express-validator
  if (err.array && typeof err.array === 'function') {
    return res.status(400).json({
      error: 'Validation Error',
      details: err.array(),
      timestamp: new Date().toISOString()
    });
  }

  // Errori HTTP personalizzati
  if (err instanceof HttpError) {
    return res.status(err.statusCode).json({
      error: err.name,
      message: err.message,
      timestamp: new Date().toISOString()
    });
  }

  // Errori SQLite
  if (err.code && err.code.startsWith('SQLITE')) {
    return res.status(500).json({
      error: 'Database Error',
      message: process.env.NODE_ENV === 'development' 
        ? err.message 
        : 'An internal database error occurred',
      timestamp: new Date().toISOString()
    });
  }

  // Errori di parsing JSON
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Invalid JSON in request body',
      timestamp: new Date().toISOString()
    });
  }

  // Errore generico (500)
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' 
      ? err.message 
      : 'An unexpected error occurred',
    timestamp: new Date().toISOString()
  });
}

module.exports = {
  HttpError,
  notFoundHandler,
  errorHandler
};
