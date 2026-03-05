'use client';

import { useMemo } from 'react';
import type { ActivityEntry } from '@/types/task';

interface ActivityCalendarProps {
  activity: ActivityEntry[];
  className?: string;
}

interface DayData {
  date: string;
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
}

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

const DAY_NAMES = ['Mon', 'Wed', 'Fri'];

export function ActivityCalendar({ activity, className }: ActivityCalendarProps) {
  const calendarData = useMemo(() => {
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - 364); // 52 weeks * 7 days = 364 days

    // Create a map for quick lookup
    const activityMap = new Map<string, number>();
    activity.forEach(entry => {
      activityMap.set(entry.date, entry.count);
    });

    // Generate all days
    const days: DayData[] = [];
    const currentDate = new Date(startDate);
    
    while (currentDate <= today) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const count = activityMap.get(dateStr) || 0;
      
      // Determine level based on count
      let level: 0 | 1 | 2 | 3 | 4 = 0;
      if (count > 0) level = 1;
      if (count >= 2) level = 2;
      if (count >= 4) level = 3;
      if (count >= 6) level = 4;

      days.push({
        date: dateStr,
        count,
        level,
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Organize into weeks (columns)
    const weeks: DayData[][] = [];
    let currentWeek: DayData[] = [];
    
    // Pad the first week if it doesn't start on Sunday
    const startDayOfWeek = startDate.getDay();
    
    days.forEach((day, index) => {
      currentWeek.push(day);
      
      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    });

    if (currentWeek.length > 0) {
      weeks.push(currentWeek);
    }

    // Get month labels
    const monthLabels: { month: string; index: number }[] = [];
    let lastMonth = -1;
    
    weeks.forEach((week, weekIndex) => {
      if (week.length === 0) return;
      const firstDay = week[0];
      const month = new Date(firstDay.date).getMonth();
      
      if (month !== lastMonth) {
        monthLabels.push({ month: MONTH_NAMES[month], index: weekIndex });
        lastMonth = month;
      }
    });

    return { weeks, monthLabels };
  }, [activity]);

  const getLevelColor = (level: 0 | 1 | 2 | 3 | 4) => {
    switch (level) {
      case 0: return 'bg-muted';
      case 1: return 'bg-green-700';
      case 2: return 'bg-green-600';
      case 3: return 'bg-green-500';
      case 4: return 'bg-green-400';
      default: return 'bg-muted';
    }
  };

  const totalContributions = activity.reduce((sum, entry) => sum + entry.count, 0);

  return (
    <div className={className}>
      <div className="text-xs text-muted-foreground mb-2">
        {totalContributions} contributions in the last year
      </div>
      
      <div className="relative">
        {/* Month labels */}
        <div className="flex mb-1 ml-6">
          {calendarData.monthLabels.map(({ month, index }) => (
            <div
              key={`${month}-${index}`}
              className="text-xs text-muted-foreground"
              style={{ 
                width: '12px',
                marginRight: index < calendarData.monthLabels.length - 1 ? `${(calendarData.monthLabels[index + 1].index - index - 1) * 16 + 16}px` : '0'
              }}
            >
              {month}
            </div>
          ))}
        </div>

        <div className="flex gap-1">
          {/* Day labels */}
          <div className="flex flex-col gap-1 pt-1">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
              index % 2 === 0 && (
                <div key={day} className="h-3 w-3 text-xs text-muted-foreground flex items-center justify-center">
                  {day === 'Mon' || day === 'Wed' || day === 'Fri' ? day : ''}
                </div>
              )
            ))}
          </div>

          {/* Activity grid */}
          <div className="flex gap-1">
            {calendarData.weeks.map((week, weekIndex) => (
              <div key={weekIndex} className="flex flex-col gap-1">
                {week.map((day, dayIndex) => (
                  <div
                    key={day.date}
                    className={`h-3 w-3 rounded-sm ${getLevelColor(day.level)} transition-colors`}
                    title={`${day.count} contributions on ${day.date}`}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground justify-end">
        <span>Less</span>
        <div className="h-3 w-3 rounded-sm bg-muted" />
        <div className="h-3 w-3 rounded-sm bg-green-700" />
        <div className="h-3 w-3 rounded-sm bg-green-600" />
        <div className="h-3 w-3 rounded-sm bg-green-500" />
        <div className="h-3 w-3 rounded-sm bg-green-400" />
        <span>More</span>
      </div>
    </div>
  );
}
