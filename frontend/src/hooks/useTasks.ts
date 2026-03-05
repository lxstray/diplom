import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type { Task, TaskListEntry, UserTaskStats, TaskProgress } from '@/types/task';

export interface UseTasksResult {
  tasks: TaskListEntry[];
  loading: boolean;
  error: string | null;
  loadTasks: (options?: GetTasksOptions) => Promise<void>;
  completeTask: (slug: string, language?: string) => Promise<{ success: boolean; alreadyCompleted?: boolean }>;
  recordAttempt: (slug: string, language?: string) => Promise<void>;
  getTaskBySlug: (slug: string, language?: string) => Promise<Task | null>;
  getStats: () => Promise<UserTaskStats>;
  getProgress: () => Promise<Record<string, TaskProgress>>;
}

export interface GetTasksOptions {
  language?: string;
  difficulty?: string;
  status?: 'all' | 'completed' | 'not_completed';
}

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

export function useTasks(): UseTasksResult {
  const [tasks, setTasks] = useState<TaskListEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getAccessToken = useCallback(async (): Promise<string | null> => {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  }, []);

  const loadTasks = useCallback(async (options?: GetTasksOptions) => {
    setLoading(true);
    setError(null);

    try {
      const token = await getAccessToken();
      if (!token) {
        setError('Authentication required');
        setLoading(false);
        return;
      }

      const params = new URLSearchParams();
      if (options?.language) params.set('language', options.language);
      // Treat "all" as "no filter" so we don't accidentally filter out everything.
      if (options?.difficulty && options.difficulty !== 'all') {
        params.set('difficulty', options.difficulty);
      }
      if (options?.status && options.status !== 'all') {
        params.set('status', options.status);
      }

      const response = await fetch(`${BACKEND_URL}/api/tasks?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to load tasks (${response.status})`);
      }

      const data = await response.json();
      setTasks(data.tasks);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }, [getAccessToken]);

  const getTaskBySlug = useCallback(async (slug: string, language = 'javascript'): Promise<Task | null> => {
    try {
      const token = await getAccessToken();
      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await fetch(`${BACKEND_URL}/api/tasks/${slug}?language=${language}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error(`Failed to load task (${response.status})`);
      }

      const data = await response.json();
      return data.task;
    } catch (err) {
      console.error('Failed to get task:', err);
      return null;
    }
  }, [getAccessToken]);

  const completeTask = useCallback(async (slug: string, language = 'javascript') => {
    try {
      const token = await getAccessToken();
      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await fetch(`${BACKEND_URL}/api/tasks/${slug}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ slug, language }),
      });

      if (!response.ok) {
        throw new Error(`Failed to complete task (${response.status})`);
      }

      const data = await response.json();
      return data;
    } catch (err) {
      console.error('Failed to complete task:', err);
      return { success: false };
    }
  }, [getAccessToken]);

  const recordAttempt = useCallback(async (slug: string, language = 'javascript') => {
    try {
      const token = await getAccessToken();
      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await fetch(`${BACKEND_URL}/api/tasks/${slug}/attempt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ language }),
      });

      if (!response.ok) {
        throw new Error(`Failed to record attempt (${response.status})`);
      }
    } catch (err) {
      console.error('Failed to record attempt:', err);
    }
  }, [getAccessToken]);

  const getStats = useCallback(async (): Promise<UserTaskStats> => {
    try {
      const token = await getAccessToken();
      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await fetch(`${BACKEND_URL}/api/tasks/stats`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to load stats (${response.status})`);
      }

      const data = await response.json();
      return data.stats;
    } catch (err) {
      console.error('Failed to get stats:', err);
      throw err;
    }
  }, [getAccessToken]);

  const getProgress = useCallback(async (): Promise<Record<string, TaskProgress>> => {
    try {
      const token = await getAccessToken();
      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await fetch(`${BACKEND_URL}/api/tasks/progress`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to load progress (${response.status})`);
      }

      const data = await response.json();
      return data.progress;
    } catch (err) {
      console.error('Failed to get progress:', err);
      throw err;
    }
  }, [getAccessToken]);

  return {
    tasks,
    loading,
    error,
    loadTasks,
    completeTask,
    recordAttempt,
    getTaskBySlug,
    getStats,
    getProgress,
  };
}
