import { z } from 'zod';

export const executeCodeSchema = z.object({
  code: z.string().min(1, 'Code is required'),
  language: z.enum(['javascript', 'typescript', 'python', 'java', 'cpp', 'go', 'rust']),
  roomId: z.string().optional(),
  fileId: z.string().optional(),
});

export const executionParamsSchema = z.object({
  executionId: z.string().cuid('Invalid execution ID'),
});
