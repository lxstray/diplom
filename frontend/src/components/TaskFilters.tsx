'use client';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface TaskFiltersProps {
  difficulty: string;
  status: string;
  onDifficultyChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onClearFilters: () => void;
  totalTasks: number;
}

export function TaskFilters({
  difficulty,
  status,
  onDifficultyChange,
  onStatusChange,
  onClearFilters,
  totalTasks,
}: TaskFiltersProps) {
  const hasFilters = difficulty !== 'all' || status !== 'all';

  return (
    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between mb-6">
      <div className="flex flex-wrap gap-4 items-center">
        {/* Difficulty Filter */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Сложность:</span>
          <Select value={difficulty} onValueChange={onDifficultyChange}>
            <SelectTrigger className="w-32 h-9">
              <SelectValue placeholder="Все" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все</SelectItem>
              <SelectItem value="easy">Легко</SelectItem>
              <SelectItem value="medium">Средне</SelectItem>
              <SelectItem value="hard">Сложно</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Статус:</span>
          <Select value={status} onValueChange={onStatusChange}>
            <SelectTrigger className="w-32 h-9">
              <SelectValue placeholder="Все" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все</SelectItem>
              <SelectItem value="completed">Завершено</SelectItem>
              <SelectItem value="not_completed">Не завершено</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Clear Filters */}
        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearFilters}
            className="h-9 px-3"
          >
            <X className="h-4 w-4 mr-1" />
            Очистить
          </Button>
        )}
      </div>

      {/* Task Count */}
      <div className="text-sm text-muted-foreground">
        Показано {totalTasks} {totalTasks === 1 ? 'задача' : totalTasks < 5 ? 'задачи' : 'задач'}
      </div>
    </div>
  );
}
