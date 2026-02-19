/**
 * Task Types
 *
 * Type definitions for the Task API domain model
 */

export type Priority = 'low' | 'medium' | 'high';

export interface Task {
  id: number;
  title: string;
  description: string | null;
  completed: number;
  priority: Priority;
  created_at: string;
  updated_at: string;
}

export interface CreateTaskInput {
  title: string;
  description?: string | null;
  priority?: Priority;
}

export interface UpdateTaskInput {
  title: string;
  description: string | null;
  completed: boolean;
  priority: Priority;
}

export interface PatchTaskInput {
  title?: string;
  description?: string | null;
  completed?: boolean;
  priority?: Priority;
}

export interface PaginationQuery {
  completed?: string;
  priority?: Priority;
  limit?: number;
  offset?: number;
}

export interface PaginationMeta {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

export interface ApiResponse<T> {
  data: T;
}

export interface ApiMessageResponse<T> {
  message: string;
  data: T;
}

export interface ApiErrorResponse {
  error: string;
  message: string;
  timestamp: string;
  details?: Array<{ field: string; message: string; value?: unknown }>;
}
