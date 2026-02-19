/**
 * Error Handler Middleware
 *
 * Handles all errors centrally.
 * Must be the LAST middleware registered in Hono.
 */

import type { Context } from 'hono';
import type { ApiErrorResponse } from '../types/index.js';

class HttpError extends Error {
  statusCode: number;
  
  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
    this.name = 'HttpError';
  }
}

function createErrorResponse(error: string, message: string): ApiErrorResponse {
  return {
    error,
    message,
    timestamp: new Date().toISOString()
  };
}

function errorHandler(err: Error, c: Context): Response {
  console.error(`[ERROR] ${new Date().toISOString()}:`, {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    path: c.req.path,
    method: c.req.method
  });

  if (err instanceof HttpError) {
    return c.json<ApiErrorResponse>(
      createErrorResponse(err.name, err.message),
      err.statusCode as 400 | 401 | 403 | 404 | 500
    );
  }

  if (err.message?.includes('SQLITE') || (err as unknown as { code?: string }).code?.startsWith('SQLITE')) {
    return c.json<ApiErrorResponse>(
      createErrorResponse(
        'Database Error',
        process.env.NODE_ENV === 'development' 
          ? err.message 
          : 'An internal database error occurred'
      ),
      500
    );
  }

  if (err instanceof SyntaxError && (err as unknown as { status?: number }).status === 400 && 'body' in err) {
    return c.json<ApiErrorResponse>(
      createErrorResponse('Bad Request', 'Invalid JSON in request body'),
      400
    );
  }

  return c.json<ApiErrorResponse>(
    createErrorResponse(
      'Internal Server Error',
      process.env.NODE_ENV === 'development' 
        ? err.message 
        : 'An unexpected error occurred'
    ),
    500
  );
}

function notFoundHandler(c: Context): Response {
  return c.json<ApiErrorResponse>(
    {
      error: 'Not Found',
      message: `Route ${c.req.method} ${c.req.path} not found`,
      timestamp: new Date().toISOString()
    },
    404
  );
}

export { HttpError, errorHandler, notFoundHandler };
