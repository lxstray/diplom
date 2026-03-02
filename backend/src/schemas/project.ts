import { z } from 'zod';

export const createProjectSchema = z.object({
  name: z.string().min(1, 'Project name is required').max(100, 'Project name is too long'),
});

export const updateProjectSchema = z.object({
  name: z.string().min(1, 'Project name is required').max(100, 'Project name is too long').optional(),
});

export const projectParamsSchema = z.object({
  projectId: z.string().cuid('Invalid project ID'),
});

export const createRoomSchema = z.object({
  projectId: z.string().cuid('Invalid project ID'),
  name: z.string().min(1, 'Room name is required').max(100, 'Room name is too long').optional(),
});

export const roomParamsSchema = z.object({
  roomId: z.string().cuid('Invalid room ID'),
});
