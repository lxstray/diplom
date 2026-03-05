import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import {
  getTasksSchema,
  taskSlugSchema,
  completeTaskSchema,
} from '../schemas/task.js';
import * as taskService from '../services/task.service.js';
import { requireAuth } from '../auth.js';

export async function taskRoutes(fastify: FastifyInstance) {
  // Get all tasks with optional filtering
  fastify.get(
    '/api/tasks',
    {
      preHandler: requireAuth,
    },
    async (request, reply) => {
      try {
        const parsed = getTasksSchema.safeParse(request.query);
        
        if (!parsed.success) {
          reply.code(400).send({ 
            error: 'Validation failed', 
            details: parsed.error.errors 
          });
          return;
        }

        const tasks = await taskService.getAllTasks({
          language: parsed.data.language,
          difficulty: parsed.data.difficulty,
          status: parsed.data.status,
          userId: request.authUser!.id,
        });

        return { tasks };
      } catch (error) {
        fastify.log.error({ error: 'Failed to get tasks' }, (error as Error).message);
        reply.code(500).send({ error: 'Failed to fetch tasks' });
      }
    },
  );

  // Get single task by slug
  fastify.get(
    '/api/tasks/:slug',
    {
      preHandler: requireAuth,
    },
    async (request, reply) => {
      try {
        const parsed = taskSlugSchema.safeParse(request.params);
        
        if (!parsed.success) {
          reply.code(400).send({ 
            error: 'Validation failed', 
            details: parsed.error.errors 
          });
          return;
        }

        const language = (request.query as any)?.language || 'javascript';
        const task = await taskService.getTaskBySlug(parsed.data.slug, language);

        if (!task) {
          reply.code(404).send({ error: 'Task not found' });
          return;
        }

        return { task };
      } catch (error) {
        fastify.log.error({ error: 'Failed to get task' }, (error as Error).message);
        reply.code(500).send({ error: 'Failed to fetch task' });
      }
    },
  );

  // Mark task as completed
  fastify.post(
    '/api/tasks/:slug/complete',
    {
      preHandler: requireAuth,
    },
    async (request, reply) => {
      try {
        const params = taskSlugSchema.parse(request.params);
        const body = completeTaskSchema.parse(request.body);

        const result = await taskService.completeTask(
          request.authUser!.id,
          params.slug,
          body.language || 'javascript'
        );

        return { success: true, alreadyCompleted: result.alreadyCompleted };
      } catch (error) {
        if (error instanceof z.ZodError) {
          reply.code(400).send({ error: 'Validation failed', details: error.errors });
          return;
        }
        fastify.log.error({ error: 'Failed to complete task' }, (error as Error).message);
        reply.code(500).send({ error: 'Failed to mark task as completed' });
      }
    },
  );

  // Record task attempt
  fastify.post(
    '/api/tasks/:slug/attempt',
    {
      preHandler: requireAuth,
    },
    async (request, reply) => {
      try {
        const params = taskSlugSchema.parse(request.params);
        const body = z.object({ language: z.string().optional() }).parse(request.body);

        await taskService.recordTaskAttempt(
          request.authUser!.id,
          params.slug,
          body.language || 'javascript'
        );

        return { success: true };
      } catch (error) {
        if (error instanceof z.ZodError) {
          reply.code(400).send({ error: 'Validation failed', details: error.errors });
          return;
        }
        fastify.log.error({ error: 'Failed to record attempt' }, (error as Error).message);
        reply.code(500).send({ error: 'Failed to record attempt' });
      }
    },
  );

  // Get user task statistics
  fastify.get(
    '/api/tasks/stats',
    {
      preHandler: requireAuth,
    },
    async (request, reply) => {
      try {
        const language = (request.query as any)?.language || 'javascript';
        const stats = await taskService.getUserTaskStats(
          request.authUser!.id,
          language
        );

        return { stats };
      } catch (error) {
        fastify.log.error({ error: 'Failed to get stats' }, (error as Error).message);
        reply.code(500).send({ error: 'Failed to fetch statistics' });
      }
    },
  );

  // Get user task progress
  fastify.get(
    '/api/tasks/progress',
    {
      preHandler: requireAuth,
    },
    async (request, reply) => {
      try {
        const language = (request.query as any)?.language || 'javascript';
        const progress = await taskService.getUserTaskProgress(
          request.authUser!.id,
          language
        );

        return { progress: Object.fromEntries(progress) };
      } catch (error) {
        fastify.log.error({ error: 'Failed to get progress' }, (error as Error).message);
        reply.code(500).send({ error: 'Failed to fetch progress' });
      }
    },
  );
}
