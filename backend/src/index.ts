import Fastify from 'fastify';
import cors from '@fastify/cors';
import { Hocuspocus } from '@hocuspocus/server';
import { supabaseAdmin } from './supabase.js';
import { projectRoutes } from './modules/projects/project.routes.js';
import * as roomService from './modules/projects/room.service.js';

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

      const roomId = data.documentName as string | undefined;
      if (!roomId) {
        console.warn('[hocuspocus] Missing room id (documentName), closing.');
        (anyData.connection as any)?.close?.();
        return;
      }

      try {
        const { canAccess } = await roomService.canAccessRoom(
          roomId,
          userData.user.id,
        );

        if (!canAccess) {
          console.warn(
            `[hocuspocus] Access denied. Room: ${roomId}, user: ${userData.user.id}`,
          );
          (anyData.connection as any)?.close?.();
          return;
        }
      } catch (err) {
        console.warn(
          `[hocuspocus] Error while checking room access, closing. Room: ${roomId}, user: ${userData.user.id}`,
        );
        (anyData.connection as any)?.close?.();
        return;
      }

      console.log(
        `Client authenticated and authorized. Room: ${roomId}, user: ${userData.user.id}`,
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

  // Register project and room routes
  await fastify.register(projectRoutes);

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
