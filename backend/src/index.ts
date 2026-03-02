import Fastify from 'fastify';
import cors from '@fastify/cors';
import { Hocuspocus } from '@hocuspocus/server';

const hocuspocus = new Hocuspocus({
  async onConnect(data) {
    console.log(`Client connected. Room: ${data.documentName}`);
  },
  async onDisconnect(data) {
    console.log(`Client disconnected. Room: ${data.documentName}`);
  },
});

async function buildHttpServer() {
  const fastify = Fastify({
    logger: {
      level: 'info',
    },
  });

  await fastify.register(cors, {
    origin: true,
  });

  // Health check endpoint
  fastify.get('/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
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
  const fastify = await buildHttpServer();
  const port = parseInt(process.env.PORT || '3001', 10);
  const collabPort = parseInt(process.env.COLLAB_PORT || '3002', 10);

  try {
    await fastify.listen({ port, host: '0.0.0.0' });
    console.log(`🚀 Backend HTTP server running on http://localhost:${port}`);

    await hocuspocus.listen(collabPort);
    console.log(
      `📡 Hocuspocus collaboration server running on ws://localhost:${collabPort}`,
    );
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
