import { z } from 'zod';

// Schema for task query parameters
export const getTasksSchema = z.object({
  language: z.string().optional(),
  difficulty: z.string().optional(),
  status: z.enum(['all', 'completed', 'not_completed']).optional(),
});

// Schema for task slug parameter
export const taskSlugSchema = z.object({
  slug: z.string(),
});

// Schema for task completion
export const completeTaskSchema = z.object({
  slug: z.string(),
  language: z.string(),
});
