import Fastify from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import { Hocuspocus } from '@hocuspocus/server';
import type { FastifyInstance } from 'fastify';

const hocuspocus = new Hocuspocus({
  async onConnect({ context }: { context: { connectionId: string } }) {
    console.log(`Client connected. Room: ${context.connectionId}`);
  },
  async onDisconnect({ context }: { context: { connectionId: string } }) {
    console.log(`Client disconnected. Room: ${context.connectionId}`);
  },
});

async function buildServer() {
  const fastify = Fastify({
    logger: {
      level: 'info',
    },
  });

  await fastify.register(cors, {
    origin: true,
  });

  await fastify.register(websocket);

  // Health check endpoint
  fastify.get('/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  // WebSocket endpoint for Hocuspocus
  fastify.register(async (fastifyInstance: FastifyInstance) => {
    fastifyInstance.get('/collaboration', { websocket: true }, (connection, req) => {
      hocuspocus.handleConnection(connection.socket, req as unknown as Parameters<typeof hocuspocus.handleConnection>[1]);
    });
  });

  // Basic room API (no auth for v0)
  fastify.post('/api/rooms', async (request, reply) => {
    const roomId = Math.random().toString(36).substring(2, 8);
    return { roomId };
  });

  fastify.get('/api/rooms/:roomId', async (request, reply) => {
    const { roomId } = request.params as { roomId: string };
    return { roomId, exists: true };
  });

  return fastify;
}

const start = async () => {
  const fastify = await buildServer();
  const port = parseInt(process.env.PORT || '3001', 10);

  try {
    await fastify.listen({ port, host: '0.0.0.0' });
    console.log(`🚀 Backend server running on http://localhost:${port}`);
    console.log(`📡 Hocuspocus collaboration on ws://localhost:${port}/collaboration`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
