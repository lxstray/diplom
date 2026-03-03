import Fastify from 'fastify';
import cors from '@fastify/cors';
import { Server } from '@hocuspocus/server';
import { Database } from '@hocuspocus/extension-database';
import { supabaseAdmin } from './supabase.js';
import { prisma } from './services/prisma.js';
import { projectRoutes } from './modules/projects/project.routes.js';
import { executionRoutes } from './modules/execution/execution.routes.js';
import * as roomService from './modules/projects/room.service.js';

const collabPort = parseInt(process.env.COLLAB_PORT || '3002', 10);

const collabServer = new Server({
  port: collabPort,
  extensions: [
    new Database({
      // Persist document state in Postgres (via Prisma), keyed by roomId (= documentName).
      fetch: async ({ documentName }) => {
        if (!documentName) return null;

        const doc = await prisma.collabDocument.findUnique({
          where: { roomId: documentName },
          select: { state: true },
        });

        if (!doc?.state) return null;

        // Prisma returns Bytes as Buffer in Node.js
        const buf = doc.state as unknown as Buffer;
        return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
      },
      store: async ({ documentName, state }) => {
        if (!documentName) return;

        await prisma.collabDocument.upsert({
          where: { roomId: documentName },
          create: { roomId: documentName, state: Buffer.from(state) },
          update: { state: Buffer.from(state) },
        });
      },
    }),
  ],
  // Use onAuthenticate to receive the token passed from the HocuspocusProvider.
  async onAuthenticate(data) {
    const anyData = data as any;
    const token = anyData.token as string | undefined;

    console.log('[hocuspocus] onAuthenticate - documentName:', anyData.documentName);
    console.log('[hocuspocus] onAuthenticate - token present:', !!token);

    if (!token) {
      console.warn('[hocuspocus] Missing token on authenticate, closing.');
      anyData.connection?.close?.();
      return;
    }

    try {
      const { data: userData, error } = await supabaseAdmin.auth.getUser(token);
      if (error || !userData?.user) {
        console.warn('[hocuspocus] Invalid token, closing connection.');
        anyData.connection?.close?.();
        return;
      }

      const roomId = anyData.documentName as string | undefined;
      if (!roomId) {
        console.warn('[hocuspocus] Missing room id (documentName), closing.');
        anyData.connection?.close?.();
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
          anyData.connection?.close?.();
          return;
        }
      } catch (err) {
        console.warn(
          `[hocuspocus] Error while checking room access, closing. Room: ${roomId}, user: ${userData.user.id}`,
        );
        anyData.connection?.close?.();
        return;
      }

      console.log(
        `Client authenticated and authorized. Room: ${roomId}, user: ${userData.user.id}`,
      );
    } catch (err) {
      console.warn('[hocuspocus] Error during authentication, closing connection.');
      anyData.connection?.close?.();
    }
  },
  async onDisconnect(data) {
    const anyData = data as any;
    console.log(`Client disconnected. Room: ${anyData.documentName}`);
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

  // Register code execution routes
  await fastify.register(executionRoutes);

  return fastify;
}

const start = async () => {
  const fastify = await buildHttpServer();
  const port = parseInt(process.env.PORT || '3001', 10);

  try {
    await fastify.listen({ port, host: '0.0.0.0' });
    console.log(`🚀 Backend HTTP server running on http://localhost:${port}`);

    collabServer.listen();
    console.log(
      `📡 Hocuspocus collaboration server running on ws://localhost:${collabPort}`,
    );
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
