import Fastify from 'fastify';
import cors from '@fastify/cors';
import { Hocuspocus } from '@hocuspocus/server';
import { requireAuth } from './auth.js';
import { supabaseAdmin } from './supabase.js';

const hocuspocus = new Hocuspocus({
  async onConnect(data) {
    const anyData = data as any;
    const token = (anyData.connectionParameters?.token ??
      anyData.token) as string | undefined;

    if (!token) {
      console.warn('[hocuspocus] Missing token on connect, closing.');
      (anyData.connection as any)?.close?.();
      return;
    }

    try {
      const { data: userData, error } = await supabaseAdmin.auth.getUser(token);
      if (error || !userData?.user) {
        console.warn('[hocuspocus] Invalid token, closing connection.');
        (anyData.connection as any)?.close?.();
        return;
      }

      console.log(
        `Client authenticated. Room: ${data.documentName}, user: ${userData.user.id}`,
      );
    } catch (err) {
      console.warn('[hocuspocus] Invalid token, closing connection.');
      (anyData.connection as any)?.close?.();
    }
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

  // Auth-protected room API
  fastify.post(
    '/api/rooms',
    { preHandler: requireAuth },
    async (request, reply) => {
      const roomId = Math.random().toString(36).substring(2, 8);
      return { roomId, userId: request.authUser?.id };
    },
  );

  fastify.get(
    '/api/rooms/:roomId',
    { preHandler: requireAuth },
    async (request, reply) => {
      const { roomId } = request.params as { roomId: string };
      return { roomId, exists: true, userId: request.authUser?.id };
    },
  );

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
