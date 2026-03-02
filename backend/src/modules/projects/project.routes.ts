import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import {
  createProjectSchema,
  updateProjectSchema,
  projectParamsSchema,
  createRoomSchema,
  roomParamsSchema,
} from '../../schemas/project.js';
import * as projectService from './project.service.js';
import * as roomService from './room.service.js';
import { requireAuth } from '../../auth.js';

export async function projectRoutes(fastify: FastifyInstance) {
  // Get all projects for current user
  fastify.get(
    '/api/projects',
    {
      preHandler: requireAuth,
    },
    async (request, reply) => {
      try {
        const projects = await projectService.getUserProjects(request.authUser!.id);
        return { projects };
      } catch (error) {
        fastify.log.error({ error: 'Failed to get projects' }, (error as Error).message);
        reply.code(500).send({ error: 'Failed to fetch projects' });
      }
    },
  );

  // Create new project
  fastify.post(
    '/api/projects',
    {
      preHandler: requireAuth,
    },
    async (request, reply) => {
      try {
        const parsed = createProjectSchema.parse(request.body);
        const project = await projectService.createProject({
          name: parsed.name,
          ownerId: request.authUser!.id,
          ownerEmail: request.authUser!.email ?? '',
        });
        return { project };
      } catch (error) {
        if (error instanceof z.ZodError) {
          reply.code(400).send({ error: 'Validation failed', details: error.errors });
          return;
        }
        fastify.log.error({ error: 'Failed to create project' }, (error as Error).message);
        reply.code(500).send({ error: 'Failed to create project' });
      }
    },
  );

  // Get project by ID
  fastify.get(
    '/api/projects/:projectId',
    {
      preHandler: requireAuth,
    },
    async (request, reply) => {
      try {
        const parsed = projectParamsSchema.parse(request.params);
        const project = await projectService.getProjectById(parsed.projectId);

        if (!project) {
          reply.code(404).send({ error: 'Project not found' });
          return;
        }

        // Check ownership
        if (project.ownerId !== request.authUser!.id) {
          reply.code(403).send({ error: 'Access denied' });
          return;
        }

        return { project };
      } catch (error) {
        if (error instanceof z.ZodError) {
          reply.code(400).send({ error: 'Validation failed', details: error.errors });
          return;
        }
        fastify.log.error({ error: 'Failed to get project' }, (error as Error).message);
        reply.code(500).send({ error: 'Failed to fetch project' });
      }
    },
  );

  // Update project
  fastify.patch(
    '/api/projects/:projectId',
    {
      preHandler: requireAuth,
    },
    async (request, reply) => {
      try {
        const params = projectParamsSchema.parse(request.params);
        const body = updateProjectSchema.parse(request.body);

        // Check ownership
        const isOwner = await projectService.isProjectOwner(params.projectId, request.authUser!.id);
        if (!isOwner) {
          reply.code(403).send({ error: 'Access denied' });
          return;
        }

        const project = await projectService.updateProject(params.projectId, body);
        return { project };
      } catch (error) {
        if (error instanceof z.ZodError) {
          reply.code(400).send({ error: 'Validation failed', details: error.errors });
          return;
        }
        fastify.log.error({ error: 'Failed to update project' }, (error as Error).message);
        reply.code(500).send({ error: 'Failed to update project' });
      }
    },
  );

  // Delete project
  fastify.delete(
    '/api/projects/:projectId',
    {
      preHandler: requireAuth,
    },
    async (request, reply) => {
      try {
        const params = projectParamsSchema.parse(request.params);

        // Check ownership
        const isOwner = await projectService.isProjectOwner(params.projectId, request.authUser!.id);
        if (!isOwner) {
          reply.code(403).send({ error: 'Access denied' });
          return;
        }

        await projectService.deleteProject(params.projectId);
        return { success: true };
      } catch (error) {
        if (error instanceof z.ZodError) {
          reply.code(400).send({ error: 'Validation failed', details: error.errors });
          return;
        }
        fastify.log.error({ error: 'Failed to delete project' }, (error as Error).message);
        reply.code(500).send({ error: 'Failed to delete project' });
      }
    },
  );

  // Create room in project
  fastify.post(
    '/api/projects/:projectId/rooms',
    {
      preHandler: requireAuth,
    },
    async (request, reply) => {
      try {
        const params = projectParamsSchema.parse(request.params);
        const body = createRoomSchema.parse(request.body);

        // Verify project ownership
        const isOwner = await projectService.isProjectOwner(params.projectId, request.authUser!.id);
        if (!isOwner) {
          reply.code(403).send({ error: 'Access denied' });
          return;
        }

        const room = await roomService.createRoom({
          projectId: params.projectId,
          name: body.name || '',
        });
        return { room };
      } catch (error) {
        if (error instanceof z.ZodError) {
          reply.code(400).send({ error: 'Validation failed', details: error.errors });
          return;
        }
        fastify.log.error({ error: 'Failed to create room' }, (error as Error).message);
        reply.code(500).send({ error: 'Failed to create room' });
      }
    },
  );

  // Get rooms for project
  fastify.get(
    '/api/projects/:projectId/rooms',
    {
      preHandler: requireAuth,
    },
    async (request, reply) => {
      try {
        const params = projectParamsSchema.parse(request.params);

        // Verify project ownership
        const isOwner = await projectService.isProjectOwner(params.projectId, request.authUser!.id);
        if (!isOwner) {
          reply.code(403).send({ error: 'Access denied' });
          return;
        }

        const rooms = await roomService.getProjectRooms(params.projectId);
        return { rooms };
      } catch (error) {
        if (error instanceof z.ZodError) {
          reply.code(400).send({ error: 'Validation failed', details: error.errors });
          return;
        }
        fastify.log.error({ error: 'Failed to get rooms' }, (error as Error).message);
        reply.code(500).send({ error: 'Failed to fetch rooms' });
      }
    },
  );

  // Get room by ID (with access control)
  fastify.get(
    '/api/rooms/:roomId',
    {
      preHandler: requireAuth,
    },
    async (request, reply) => {
      try {
        const params = roomParamsSchema.parse(request.params);
        const { canAccess, room } = await roomService.canAccessRoom(params.roomId, request.authUser!.id);

        if (!canAccess || !room) {
          reply.code(403).send({ error: 'Access denied' });
          return;
        }

        return { room };
      } catch (error) {
        if (error instanceof z.ZodError) {
          reply.code(400).send({ error: 'Validation failed', details: error.errors });
          return;
        }
        fastify.log.error({ error: 'Failed to get room' }, (error as Error).message);
        reply.code(500).send({ error: 'Failed to fetch room' });
      }
    },
  );

  // Update room access level (owner only)
  fastify.patch(
    '/api/rooms/:roomId/access',
    {
      preHandler: requireAuth,
    },
    async (request, reply) => {
      try {
        const params = roomParamsSchema.parse(request.params);
        const body = z
          .object({
            access: z.enum(['OWNER', 'ANYONE_WITH_LINK']),
          })
          .parse(request.body);

        const room = await roomService.getRoomById(params.roomId);

        if (!room) {
          reply.code(404).send({ error: 'Room not found' });
          return;
        }

        if (room.project.ownerId !== request.authUser!.id) {
          reply.code(403).send({ error: 'Only the project owner can change room access.' });
          return;
        }

        const updated = await roomService.updateRoomAccess(params.roomId, body.access);
        return { room: updated };
      } catch (error) {
        if (error instanceof z.ZodError) {
          reply.code(400).send({ error: 'Validation failed', details: error.errors });
          return;
        }
        fastify.log.error({ error: 'Failed to update room access' }, (error as Error).message);
        reply.code(500).send({ error: 'Failed to update room access' });
      }
    },
  );

  // Delete room
  fastify.delete(
    '/api/rooms/:roomId',
    {
      preHandler: requireAuth,
    },
    async (request, reply) => {
      try {
        const params = roomParamsSchema.parse(request.params);
        const room = await roomService.getRoomById(params.roomId);

        if (!room) {
          reply.code(404).send({ error: 'Room not found' });
          return;
        }

        // Only project owner can delete rooms
        if (room.project.ownerId !== request.authUser!.id) {
          reply.code(403).send({ error: 'Access denied' });
          return;
        }

        await roomService.deleteRoom(params.roomId);
        return { success: true };
      } catch (error) {
        if (error instanceof z.ZodError) {
          reply.code(400).send({ error: 'Validation failed', details: error.errors });
          return;
        }
        fastify.log.error({ error: 'Failed to delete room' }, (error as Error).message);
        reply.code(500).send({ error: 'Failed to delete room' });
      }
    },
  );
}
