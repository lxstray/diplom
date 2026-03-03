import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { supabaseAdmin } from '../../supabase.js';

const authSchema = z.object({
  authorization: z.string().optional(),
});

const signalingBodySchema = z.object({
  type: z.enum(['offer', 'answer', 'ice-candidate']),
  to: z.string(),
  payload: z.any().optional(),
});

/**
 * WebRTC Signaling Routes
 * 
 * Note: Primary WebRTC signaling happens through Yjs Awareness via Hocuspocus.
 * These endpoints provide a fallback signaling mechanism.
 */
export async function signalingRoutes(fastify: FastifyInstance) {
  // Get peers in a room
  fastify.get(
    '/api/rooms/:roomId/peers',
    async (
      request: FastifyRequest<{ Params: { roomId: string } }>,
      reply: FastifyReply,
    ) => {
      try {
        const { roomId } = request.params;

        // Extract token
        const authHeader = (request.headers.authorization as string) || '';
        const token = authHeader.replace('Bearer ', '');

        if (!token) {
          return reply.status(401).send({ error: 'Unauthorized' });
        }

        // Verify token with Supabase
        const { data, error } = await supabaseAdmin.auth.getUser(
          token,
        );

        if (error || !data?.user) {
          return reply.status(401).send({ error: 'Invalid token' });
        }

        // In a full implementation, we would query connected peers from Hocuspocus
        // For now, return empty array - peers are discovered via Yjs Awareness
        return reply.send({
          roomId,
          peers: [],
          message: 'Use Yjs Awareness for peer discovery',
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: 'Internal server error' });
      }
    },
  );

  // Send signaling message to a peer
  fastify.post(
    '/api/rooms/:roomId/signaling',
    async (
      request: FastifyRequest<{
        Params: { roomId: string };
        Body: {
          type: string;
          to: string;
          payload?: any;
        };
      }>,
      reply: FastifyReply,
    ) => {
      try {
        const { roomId } = request.params;
        const body = request.body;

        // Validate body
        const parsed = signalingBodySchema.safeParse(body);
        if (!parsed.success) {
          return reply.status(400).send({ error: 'Invalid request body' });
        }

        // Extract token
        const authHeader = (request.headers.authorization as string) || '';
        const token = authHeader.replace('Bearer ', '');

        if (!token) {
          return reply.status(401).send({ error: 'Unauthorized' });
        }

        // Verify token with Supabase
        const { data, error } = await supabaseAdmin.auth.getUser(
          token,
        );

        if (error || !data?.user) {
          return reply.status(401).send({ error: 'Invalid token' });
        }

        // In a full implementation, we would forward this to the target peer
        // via WebSocket. For now, this is handled by Yjs Awareness.
        return reply.send({
          success: true,
          message: 'Use Yjs Awareness for signaling',
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: 'Internal server error' });
      }
    },
  );

  return fastify;
}
