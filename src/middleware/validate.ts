/**
 * Validation Middleware
 *
 * Validation schemas using Zod for type-safe validation.
 */

import { z } from 'zod';
import type { Context, Next } from 'hono';
import type { ApiErrorResponse } from '../types/index.js';

const PrioritySchema = z.enum(['low', 'medium', 'high']);

const createErrorResponse = (details: Array<{ field: string; message: string; value?: unknown }>): ApiErrorResponse => ({
  error: 'Validation Error',
  message: 'Request validation failed',
  details,
  timestamp: new Date().toISOString()
});

export const createTaskSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(1000).nullable().optional(),
  priority: PrioritySchema.optional().default('medium')
});

export const updateTaskSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(1000).nullable(),
  completed: z.boolean(),
  priority: PrioritySchema
});

export const patchTaskSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(1000).nullable().optional(),
  completed: z.boolean().optional(),
  priority: PrioritySchema.optional()
});

export const idParamSchema = z.object({
  id: z.coerce.number().int().positive()
});

export const listQuerySchema = z.object({
  completed: z.enum(['true', 'false']).optional(),
  priority: PrioritySchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional()
});

function validateBody<T extends z.ZodTypeAny>(schema: T) {
  return async (c: Context, next: Next) => {
    const body = await c.req.json();
    const result = schema.safeParse(body);
    
    if (!result.success) {
      const details = result.error.issues.map(issue => ({
        field: issue.path.join('.'),
        message: issue.message,
        value: issue.path.reduce((obj: unknown, key) => {
          if (obj && typeof obj === 'object') {
            return (obj as Record<string, unknown>)[String(key)];
          }
          return undefined;
        }, body)
      }));
      
      return c.json<ApiErrorResponse>(createErrorResponse(details), 400);
    }
    
    c.set('validatedBody', result.data);
    await next();
  };
}

function validateParams<T extends z.ZodTypeAny>(schema: T) {
  return async (c: Context, next: Next) => {
    const params = c.req.param();
    const result = schema.safeParse(params);
    
    if (!result.success) {
      const details = result.error.issues.map(issue => ({
        field: issue.path.join('.'),
        message: issue.message
      }));
      
      return c.json<ApiErrorResponse>(createErrorResponse(details), 400);
    }
    
    c.set('validatedParams', result.data);
    await next();
  };
}

function validateQuery<T extends z.ZodTypeAny>(schema: T) {
  return async (c: Context, next: Next) => {
    const query = c.req.query();
    const result = schema.safeParse(query);
    
    if (!result.success) {
      const details = result.error.issues.map(issue => ({
        field: issue.path.join('.'),
        message: issue.message,
        value: query[issue.path.join('.')]
      }));
      
      return c.json<ApiErrorResponse>(createErrorResponse(details), 400);
    }
    
    c.set('validatedQuery', result.data);
    await next();
  };
}

export { validateBody, validateParams, validateQuery };
