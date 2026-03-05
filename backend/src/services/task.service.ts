import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { prisma } from './prisma.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Root directory of the Exercism JavaScript track.
 *
 * You can override this by setting the EXERCISM_ROOT environment variable,
 * for example:
 *  EXERCISM_ROOT=/home/your-user/exercism/javascript
 */
const EXERCISM_ROOT =
  process.env.EXERCISM_ROOT && process.env.EXERCISM_ROOT.trim().length > 0
    ? path.resolve(process.env.EXERCISM_ROOT)
    : path.resolve(__dirname, '../../../exercism/javascript');

export interface Task {
  slug: string;
  name: string;
  difficulty: number;
  description: string;
  instructions: string;
  starterCode: string;
  testCode?: string;
  topics: string[];
  type: 'practice' | 'concept';
}

export interface TaskListEntry {
  slug: string;
  name: string;
  difficulty: number;
  topics: string[];
  type: 'practice' | 'concept';
  completed?: boolean;
}

export interface UserTaskStats {
  totalCompleted: number;
  totalAttempts: number;
  difficultyStats: {
    easy: number;
    medium: number;
    hard: number;
  };
  recentActivity: ActivityEntry[];
}

export interface ActivityEntry {
  date: string;
  count: number;
}

/**
 * Parse the Exercism config.json to get all exercises
 */
async function parseExercismConfig(): Promise<{
  practice: any[];
  concept: any[];
}> {
  const configPath = path.join(EXERCISM_ROOT, 'config.json');

  let configContent: string;
  try {
    configContent = await fs.readFile(configPath, 'utf-8');
  } catch (err) {
    console.error(
      `[tasks] Failed to read Exercism config.json at ${configPath}. ` +
        'Set EXERCISM_ROOT env var to your Exercism JavaScript track directory.',
      err,
    );
    return {
      practice: [],
      concept: [],
    };
  }

  const config = JSON.parse(configContent);
 
  return {
    practice: config.exercises.practice || [],
    concept: config.exercises.concept || [],
  };
}

/**
 * Read and parse a markdown file
 */
async function readMarkdownFile(filePath: string): Promise<string> {
  try {
    return await fs.readFile(filePath, 'utf-8');
  } catch {
    return '';
  }
}

/**
 * Read a JavaScript file
 */
async function readJsFile(filePath: string): Promise<string> {
  try {
    return await fs.readFile(filePath, 'utf-8');
  } catch {
    return '';
  }
}

/**
 * Get difficulty level from numeric difficulty
 */
function getDifficultyLevel(difficulty: number): 'easy' | 'medium' | 'hard' {
  if (difficulty <= 3) return 'easy';
  if (difficulty <= 6) return 'medium';
  return 'hard';
}

/**
 * Get all available tasks
 */
export async function getAllTasks(options?: {
  language?: string;
  difficulty?: string;
  status?: 'all' | 'completed' | 'not_completed';
  userId?: string;
}): Promise<TaskListEntry[]> {
  const { language = 'javascript', difficulty, status, userId } = options || {};
  
  if (language !== 'javascript') {
    return [];
  }

  const config = await parseExercismConfig();
  const allExercises = [
    ...config.practice.map(e => ({ ...e, type: 'practice' as const })),
    ...config.concept.map(e => ({ ...e, type: 'concept' as const })),
  ];

  // Get user progress if userId provided
  let userProgress: Map<string, boolean> = new Map();
  if (userId) {
    const progress = await prisma.taskProgress.findMany({
      where: {
        userId,
        language,
        completed: true,
      },
      select: { taskSlug: true },
    });
    userProgress = new Map(progress.map((p: { taskSlug: string }) => [p.taskSlug, true]));
  }

  // Filter by difficulty
  let filtered = allExercises;
  if (difficulty) {
    const diffLevel = difficulty.toLowerCase();
    filtered = filtered.filter(ex => {
      const level = getDifficultyLevel(ex.difficulty || 1);
      return level === diffLevel;
    });
  }

  // Filter by completion status
  if (userId && status && status !== 'all') {
    filtered = filtered.filter(ex => {
      const isCompleted = userProgress.has(ex.slug);
      return status === 'completed' ? isCompleted : !isCompleted;
    });
  }

  return filtered.map(ex => ({
    slug: ex.slug,
    name: ex.name,
    difficulty: ex.difficulty || 1,
    topics: ex.topics || [],
    type: ex.type,
    completed: userId ? userProgress.has(ex.slug) : undefined,
  }));
}

/**
 * Get a single task by slug with full details
 */
export async function getTaskBySlug(
  slug: string,
  language: string = 'javascript'
): Promise<Task | null> {
  if (language !== 'javascript') {
    return null;
  }

  const config = await parseExercismConfig();
  const allExercises = [...config.practice, ...config.concept];
  const exercise = allExercises.find(e => e.slug === slug);

  if (!exercise) {
    return null;
  }

  const exercisePath = path.join(EXERCISM_ROOT, 'exercises', exercise.type === 'concept' ? 'concept' : 'practice', slug);
  
  // Read instructions
  const instructionsPath = path.join(exercisePath, '.docs', 'instructions.md');
  const instructions = await readMarkdownFile(instructionsPath);

  // Read introduction for concept exercises
  const introductionPath = path.join(exercisePath, '.docs', 'introduction.md');
  const introduction = await readMarkdownFile(introductionPath);
  
  const description = introduction || instructions;

  // Read starter code
  const starterCodePath = path.join(exercisePath, `${slug}.js`);
  const starterCode = await readJsFile(starterCodePath);

  // Read test code
  const testCodePath = path.join(exercisePath, `${slug}.spec.js`);
  const testCode = await readJsFile(testCodePath) || undefined;

  return {
    slug: exercise.slug,
    name: exercise.name,
    difficulty: exercise.difficulty || 1,
    description,
    instructions,
    starterCode,
    testCode,
    topics: exercise.topics || [],
    type: exercise.type || 'practice',
  };
}

/**
 * Mark a task as completed
 */
export async function completeTask(
  userId: string,
  slug: string,
  language: string
): Promise<{ success: boolean; alreadyCompleted?: boolean }> {
  const existing = await prisma.taskProgress.findUnique({
    where: {
      userId_taskSlug_language: {
        userId,
        taskSlug: slug,
        language,
      },
    },
  });

  if (existing?.completed) {
    return { success: true, alreadyCompleted: true };
  }

  const now = new Date();

  if (existing) {
    await prisma.taskProgress.update({
      where: { id: existing.id },
      data: {
        completed: true,
        attempts: existing.attempts + 1,
        lastAttemptAt: now,
        completedAt: now,
      },
    });
  } else {
    await prisma.taskProgress.create({
      data: {
        userId,
        taskSlug: slug,
        language,
        completed: true,
        attempts: 1,
        lastAttemptAt: now,
        completedAt: now,
      },
    });
  }

  // Log activity
  await prisma.activityLog.create({
    data: {
      userId,
      taskSlug: slug,
      language,
      action: 'COMPLETED',
    },
  });

  return { success: true, alreadyCompleted: false };
}

/**
 * Record a task attempt
 */
export async function recordTaskAttempt(
  userId: string,
  slug: string,
  language: string
): Promise<void> {
  const existing = await prisma.taskProgress.findUnique({
    where: {
      userId_taskSlug_language: {
        userId,
        taskSlug: slug,
        language,
      },
    },
  });

  const now = new Date();

  if (existing) {
    await prisma.taskProgress.update({
      where: { id: existing.id },
      data: {
        attempts: existing.attempts + 1,
        lastAttemptAt: now,
      },
    });
  } else {
    await prisma.taskProgress.create({
      data: {
        userId,
        taskSlug: slug,
        language,
        completed: false,
        attempts: 1,
        lastAttemptAt: now,
      },
    });
  }

  // Log activity
  await prisma.activityLog.create({
    data: {
      userId,
      taskSlug: slug,
      language,
      action: 'STARTED',
    },
  });
}

/**
 * Get user statistics for tasks
 */
export async function getUserTaskStats(
  userId: string,
  language: string = 'javascript'
): Promise<UserTaskStats> {
  // Get all user progress
  const progress = await prisma.taskProgress.findMany({
    where: { userId, language },
  });

  const completed = progress.filter((p: { completed: boolean }) => p.completed);

  // Get difficulty stats
  const config = await parseExercismConfig();
  const allExercises = [...config.practice, ...config.concept];
  const exerciseMap = new Map(allExercises.map(e => [e.slug, e]));

  const difficultyStats = { easy: 0, medium: 0, hard: 0 };
  completed.forEach((p: { taskSlug: string; completed: boolean }) => {
    const exercise = exerciseMap.get(p.taskSlug);
    if (exercise) {
      const level = getDifficultyLevel(exercise.difficulty || 1);
      difficultyStats[level]++;
    }
  });

  // Get recent activity (last 365 days)
  const oneYearAgo = new Date();
  oneYearAgo.setDate(oneYearAgo.getDate() - 365);

  const activityLogs = await prisma.activityLog.findMany({
    where: {
      userId,
      createdAt: { gte: oneYearAgo },
    },
    orderBy: { createdAt: 'asc' },
  });

  // Group by date
  const activityByDate = new Map<string, number>();
  activityLogs.forEach((log: { createdAt: Date }) => {
    const date = log.createdAt.toISOString().split('T')[0];
    activityByDate.set(date, (activityByDate.get(date) || 0) + 1);
  });

  // Convert to array
  const recentActivity: ActivityEntry[] = Array.from(activityByDate.entries()).map(([date, count]) => ({
    date,
    count,
  }));

  return {
    totalCompleted: completed.length,
    totalAttempts: progress.reduce((sum: number, p: { attempts: number }) => sum + p.attempts, 0),
    difficultyStats,
    recentActivity,
  };
}

/**
 * Get task progress for a user
 */
export async function getUserTaskProgress(
  userId: string,
  language: string = 'javascript'
): Promise<Map<string, { completed: boolean; attempts: number; completedAt?: Date }>> {
  const progress = await prisma.taskProgress.findMany({
    where: { userId, language },
    select: {
      taskSlug: true,
      completed: true,
      attempts: true,
      completedAt: true,
    },
  });

  return new Map(
    progress.map((p: { taskSlug: string; completed: boolean; attempts: number; completedAt: Date | null }) => [
      p.taskSlug,
      {
        completed: p.completed,
        attempts: p.attempts,
        completedAt: p.completedAt ?? undefined,
      },
    ])
  );
}
