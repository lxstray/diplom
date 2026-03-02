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
