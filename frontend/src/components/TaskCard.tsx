'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { TaskListEntry } from '@/types/task';
import { CheckCircle2, Circle, ArrowRight } from 'lucide-react';
import Link from 'next/link';

interface TaskCardProps {
  task: TaskListEntry;
}

const getDifficultyColor = (difficulty: number) => {
  if (difficulty <= 3) return 'text-green-500 bg-green-500/10 border-green-500/20';
  if (difficulty <= 6) return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20';
  return 'text-red-500 bg-red-500/10 border-red-500/20';
};

const getDifficultyLabel = (difficulty: number) => {
  if (difficulty <= 3) return 'Easy';
  if (difficulty <= 6) return 'Medium';
  return 'Hard';
};

export function TaskCard({ task }: TaskCardProps) {
  return (
    <Card className="group hover:border-primary/50 transition-colors">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${getDifficultyColor(task.difficulty)}`}>
                {getDifficultyLabel(task.difficulty)}
              </span>
              <Badge variant="secondary" className="text-xs">
                {task.type}
              </Badge>
            </div>
            <h3 className="font-semibold text-lg truncate group-hover:text-primary transition-colors">
              {task.name}
            </h3>
          </div>
          <div className="flex-shrink-0">
            {task.completed ? (
              <CheckCircle2 className="h-6 w-6 text-green-500" />
            ) : (
              <Circle className="h-6 w-6 text-muted-foreground" />
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-1 mb-4">
          {task.topics.slice(0, 4).map((topic) => (
            <Badge key={topic} variant="outline" className="text-xs">
              {topic}
            </Badge>
          ))}
          {task.topics.length > 4 && (
            <Badge variant="outline" className="text-xs">
              +{task.topics.length - 4}
            </Badge>
          )}
        </div>
        <Link href={`/tasks/${task.slug}`}>
          <Button className="w-full" variant="outline" size="sm">
            {task.completed ? 'Review' : 'Start'}
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
