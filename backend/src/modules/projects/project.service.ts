import { prisma } from '../../services/prisma.js';

export interface CreateProjectInput {
  name: string;
  ownerId: string;
  ownerEmail: string;
}

export interface ProjectWithOwner {
  id: string;
  name: string;
  ownerId: string;
  owner: {
    id: string;
    email: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export async function createProject(input: CreateProjectInput): Promise<ProjectWithOwner> {
  const project = await prisma.project.create({
    data: {
      name: input.name,
      owner: {
        connectOrCreate: {
          where: { id: input.ownerId },
          create: {
            id: input.ownerId,
            email: input.ownerEmail,
          },
        },
      },
    },
    include: {
      owner: {
        select: {
          id: true,
          email: true,
        },
      },
    },
  });

  return project;
}

export async function getProjectById(projectId: string): Promise<ProjectWithOwner | null> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      owner: {
        select: {
          id: true,
          email: true,
        },
      },
    },
  });

  return project;
}

export async function getUserProjects(userId: string): Promise<ProjectWithOwner[]> {
  const projects = await prisma.project.findMany({
    where: { ownerId: userId },
    include: {
      owner: {
        select: {
          id: true,
          email: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return projects;
}

export async function updateProject(
  projectId: string,
  updates: { name?: string },
): Promise<ProjectWithOwner> {
  const project = await prisma.project.update({
    where: { id: projectId },
    data: updates,
    include: {
      owner: {
        select: {
          id: true,
          email: true,
        },
      },
    },
  });

  return project;
}

export async function deleteProject(projectId: string): Promise<void> {
  await prisma.project.delete({
    where: { id: projectId },
  });
}

export async function isProjectOwner(projectId: string, userId: string): Promise<boolean> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { ownerId: true },
  });

  return project?.ownerId === userId;
}
