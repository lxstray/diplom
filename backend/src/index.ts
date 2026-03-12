import Fastify from 'fastify';
import cors from '@fastify/cors';
import { Server } from '@hocuspocus/server';
import { Database } from '@hocuspocus/extension-database';
import { supabaseAdmin } from './supabase.js';
import { prisma } from './services/prisma.js';
import { projectRoutes } from './modules/projects/project.routes.js';
import { executionRoutes } from './modules/execution/execution.routes.js';
import { signalingRoutes } from './modules/webrtc/signaling.routes.js';
import { taskRoutes } from './routes/task.routes.js';
import * as roomService from './modules/projects/room.service.js';
import * as taskRoomSessionService from './services/taskRoomSession.service.js';

const collabPort = parseInt(process.env.COLLAB_PORT || '3002', 10);

// Check if a room is a task room (no persistence needed)
const isTaskRoom = (roomId: string) => {
  return roomId.startsWith('task:') || roomId.startsWith('task-') || roomId.startsWith('tasks:');
};

const collabServer = new Server({
  port: collabPort,
  extensions: [
    new Database({
      // Persist document state in Postgres (via Prisma), keyed by roomId (= documentName).
      // Task rooms are not persisted - they are ephemeral collaborative sessions.
      fetch: async ({ documentName }) => {
        if (!documentName) return null;
        if (isTaskRoom(documentName)) return null; // No persistence for task rooms

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
        if (isTaskRoom(documentName)) return; // No persistence for task rooms

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

      const userId = userData.user.id;

      // Check task room access
      if (isTaskRoom(roomId)) {
        const { canAccess, session } = await taskRoomSessionService.canAccessTaskRoom(
          roomId,
          userId
        );

        if (!canAccess) {
          console.warn(
            `[hocuspocus] Access denied to task room. Room: ${roomId}, user: ${userId}, accessLevel: ${session?.accessLevel}, owner: ${session?.ownerId}`,
          );
          // Reject authentication by returning false - this properly closes the WebSocket
          return false;
        }

        // Create session if it doesn't exist (first user to join becomes owner)
        if (!session) {
          // Extract task slug from room ID: task-{slug}-{sessionId}
          const parts = roomId.split('-');
          const taskSlug = parts.slice(1, parts.length - 1).join('-');
          await taskRoomSessionService.createOrGetTaskRoomSession(roomId, taskSlug, userId);
          console.log(`[hocuspocus] Created task room session. Room: ${roomId}, owner: ${userId}, taskSlug: ${taskSlug}`);
        }

        console.log(
          `[hocuspocus] Task room access granted. Room: ${roomId}, user: ${userId}, accessLevel: ${session?.accessLevel}`,
        );
      } else {
        // Regular rooms require access control check
        try {
          const { canAccess } = await roomService.canAccessRoom(
            roomId,
            userId,
          );

          if (!canAccess) {
            console.warn(
              `[hocuspocus] Access denied. Room: ${roomId}, user: ${userId}`,
            );
            throw new Error('Access denied');
          }
        } catch (err) {
          if ((err as Error).message === 'Access denied') {
            throw err;
          }
          console.warn(
            `[hocuspocus] Error while checking room access, closing. Room: ${roomId}, user: ${userId}`,
            err
          );
          throw new Error('Access check failed');
        }
      }

      console.log(
        `Client authenticated and authorized. Room: ${roomId}, user: ${userId}`,
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

  // Register WebRTC signaling routes
  await fastify.register(signalingRoutes);

  // Register task routes
  await fastify.register(taskRoutes);

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
