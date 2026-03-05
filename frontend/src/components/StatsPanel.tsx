'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { UserTaskStats } from '@/types/task';
import { CheckCircle2, BookOpen, TrendingUp } from 'lucide-react';

interface StatsPanelProps {
  stats: UserTaskStats;
}

export function StatsPanel({ stats }: StatsPanelProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
      {/* Total Completed */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Completed
          </CardTitle>
          <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalCompleted}</div>
          <p className="text-xs text-muted-foreground">
            {stats.totalAttempts - stats.totalCompleted > 0 
              ? `${stats.totalAttempts - stats.totalCompleted} in progress` 
              : 'All started tasks completed'}
          </p>
        </CardContent>
      </Card>

      {/* Easy Tasks */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Easy
          </CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.difficultyStats.easy}</div>
          <p className="text-xs text-muted-foreground">
            Beginner-friendly tasks
          </p>
        </CardContent>
      </Card>

      {/* Medium Tasks */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Medium
          </CardTitle>
          <BookOpen className="h-4 w-4 text-muted-foreground text-yellow-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.difficultyStats.medium}</div>
          <p className="text-xs text-muted-foreground">
            Intermediate challenges
          </p>
        </CardContent>
      </Card>

      {/* Hard Tasks */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Hard
          </CardTitle>
          <BookOpen className="h-4 w-4 text-muted-foreground text-red-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.difficultyStats.hard}</div>
          <p className="text-xs text-muted-foreground">
            Advanced problems
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
