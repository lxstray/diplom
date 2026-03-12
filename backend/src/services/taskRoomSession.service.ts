import { prisma } from './prisma.js';
import type { RoomAccessLevel } from '@prisma/client';

export interface TaskRoomSession {
  id: string;
  roomId: string;
  taskSlug: string;
  ownerId: string;
  accessLevel: RoomAccessLevel;
}

/**
 * Create or get a task room session
 */
export async function createOrGetTaskRoomSession(
  roomId: string,
  taskSlug: string,
  ownerId: string
): Promise<TaskRoomSession> {
  const existing = await prisma.taskRoomSession.findUnique({
    where: { roomId },
  });

  if (existing) {
    return existing;
  }

  const session = await prisma.taskRoomSession.create({
    data: {
      roomId,
      taskSlug,
      ownerId,
      accessLevel: 'ANYONE_WITH_LINK',
    },
  });

  return session;
}

/**
 * Get task room session by room ID
 */
export async function getTaskRoomSession(roomId: string): Promise<TaskRoomSession | null> {
  return prisma.taskRoomSession.findUnique({
    where: { roomId },
  });
}

/**
 * Update task room session access level
 */
export async function updateTaskRoomSessionAccess(
  roomId: string,
  accessLevel: RoomAccessLevel
): Promise<TaskRoomSession | null> {
  return prisma.taskRoomSession.update({
    where: { roomId },
    data: { accessLevel },
  });
}

/**
 * Check if a user can access a task room
 */
export async function canAccessTaskRoom(
  roomId: string,
  userId: string
): Promise<{ canAccess: boolean; session: TaskRoomSession | null }> {
  const session = await getTaskRoomSession(roomId);

  if (!session) {
    // No session exists, allow access (will be created on first join)
    return { canAccess: true, session: null };
  }

  // Owner can always access
  if (session.ownerId === userId) {
    return { canAccess: true, session };
  }

  // Check access level
  if (session.accessLevel === 'ANYONE_WITH_LINK') {
    return { canAccess: true, session };
  }

  // OWNER only and user is not owner
  return { canAccess: false, session };
}

/**
 * Delete task room session (cleanup)
 */
export async function deleteTaskRoomSession(roomId: string): Promise<void> {
  await prisma.taskRoomSession.delete({
    where: { roomId },
  }).catch(() => {
    // Ignore if doesn't exist
  });
}
