import { prisma } from '../../services/prisma.js';

export interface CreateRoomInput {
  name: string;
  projectId: string;
}

export interface RoomWithProject {
  id: string;
  name: string;
  projectId: string;
  access: 'OWNER' | 'ANYONE_WITH_LINK';
  project: {
    id: string;
    name: string;
    ownerId: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface RoomAccessHistory {
  id: string;
  roomId: string;
  room: RoomWithProject;
  lastAccessed: Date;
  accessedAt: Date;
}

export async function createRoom(input: CreateRoomInput): Promise<RoomWithProject> {
  const room = await prisma.room.create({
    data: {
      name: input.name || `Room ${new Date().toLocaleTimeString()}`,
      projectId: input.projectId,
    },
    include: {
      project: {
        select: {
          id: true,
          name: true,
          ownerId: true,
        },
      },
    },
  });

  return room;
}

export async function getRoomById(roomId: string): Promise<RoomWithProject | null> {
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    include: {
      project: {
        select: {
          id: true,
          name: true,
          ownerId: true,
        },
      },
    },
  });

  return room;
}

export async function getProjectRooms(projectId: string): Promise<RoomWithProject[]> {
  const rooms = await prisma.room.findMany({
    where: { projectId },
    include: {
      project: {
        select: {
          id: true,
          name: true,
          ownerId: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return rooms;
}

export async function deleteRoom(roomId: string): Promise<void> {
  await prisma.room.delete({
    where: { id: roomId },
  });
}

export async function canAccessRoom(
  roomId: string,
  userId: string,
): Promise<{ canAccess: boolean; room: RoomWithProject | null }> {
  const room = await getRoomById(roomId);

  if (!room) {
    return { canAccess: false, room: null };
  }

  const isOwner = room.project.ownerId === userId;
  const anyoneWithLink = room.access === 'ANYONE_WITH_LINK';

  if (isOwner || anyoneWithLink) {
    // Track room access for history
    await trackRoomAccess(roomId, userId);
  }

  return {
    canAccess: isOwner || anyoneWithLink,
    room: isOwner || anyoneWithLink ? room : null,
  };
}

export async function updateRoomAccess(
  roomId: string,
  access: 'OWNER' | 'ANYONE_WITH_LINK',
): Promise<RoomWithProject> {
  const room = await prisma.room.update({
    where: { id: roomId },
    data: { access },
    include: {
      project: {
        select: {
          id: true,
          name: true,
          ownerId: true,
        },
      },
    },
  });

  return room;
}

export async function trackRoomAccess(roomId: string, userId: string): Promise<void> {
  await prisma.roomAccess.upsert({
    where: {
      roomId_userId: {
        roomId,
        userId,
      },
    },
    update: {
      lastAccessed: new Date(),
    },
    create: {
      roomId,
      userId,
      accessedAt: new Date(),
      lastAccessed: new Date(),
    },
  });
}

export async function getUserRoomHistory(userId: string): Promise<RoomAccessHistory[]> {
  const accesses = await prisma.roomAccess.findMany({
    where: { userId },
    include: {
      room: {
        include: {
          project: {
            select: {
              id: true,
              name: true,
              ownerId: true,
            },
          },
        },
      },
    },
    orderBy: { lastAccessed: 'desc' },
  });

  return accesses.map((access) => ({
    id: access.id,
    roomId: access.roomId,
    room: access.room as unknown as RoomWithProject,
    lastAccessed: access.lastAccessed,
    accessedAt: access.accessedAt,
  }));
}

export async function removeRoomAccessFromHistory(
  historyId: string,
  userId: string,
): Promise<void> {
  const access = await prisma.roomAccess.findUnique({
    where: { id: historyId },
  });

  if (!access || access.userId !== userId) {
    throw new Error('Access not found or unauthorized');
  }

  await prisma.roomAccess.delete({
    where: { id: historyId },
  });
}
