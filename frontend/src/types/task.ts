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

export interface TaskProgress {
  completed: boolean;
  attempts: number;
  completedAt?: Date;
}

export type DifficultyLevel = 'easy' | 'medium' | 'hard';

export type TaskStatus = 'all' | 'completed' | 'not_completed';
