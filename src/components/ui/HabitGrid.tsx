'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';

interface HabitGridProps {
  completedDates: string[]; // Array of YYYY-MM-DD strings
  color?: 'health' | 'wealth' | 'work' | 'growth' | 'relationships' | 'vision';
}

const colorMap = {
  health: 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.4)]',
  wealth: 'bg-violet-500 shadow-[0_0_6px_rgba(139,92,246,0.4)]',
  work: 'bg-blue-500 shadow-[0_0_6px_rgba(59,130,246,0.4)]',
  growth: 'bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.4)]',
  relationships: 'bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.4)]',
  vision: 'bg-indigo-500 shadow-[0_0_6px_rgba(99,102,241,0.4)]',
};

export default function HabitGrid({
  completedDates,
  color = 'growth',
}: HabitGridProps) {
  // Generate list of the last 90 dates (starting from 90 days ago ending today)
  const days = useMemo(() => {
    const list = [];
    const today = new Date();
    // Get date 89 days ago
    for (let i = 89; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const dateStr = `${yyyy}-${mm}-${dd}`;
      list.push({
        dateStr,
        dayOfWeek: d.getDay(),
        formattedDate: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      });
    }
    return list;
  }, []);

  const completedSet = useMemo(() => new Set(completedDates), [completedDates]);
  const activeColorClass = colorMap[color] || colorMap.growth;

  return (
    <div className="flex flex-col space-y-1">
      {/* Heatmap Grid Wrapper */}
      <div className="grid grid-flow-col grid-rows-7 gap-1 w-fit bg-[#111] p-2 rounded-lg border border-[#1f1f1f]">
        {days.map((day) => {
          const isCompleted = completedSet.has(day.dateStr);

          return (
            <div
              key={day.dateStr}
              className={cn(
                "heatmap-cell h-2.5 w-2.5 rounded-sm cursor-pointer transition-all duration-150",
                isCompleted 
                  ? activeColorClass 
                  : "bg-[#1f1f1f] hover:bg-[#2c2c2c]"
              )}
              title={`${day.formattedDate}: ${isCompleted ? 'Completed' : 'Not completed'}`}
            />
          );
        })}
      </div>
      <div className="flex justify-between items-center text-[10px] text-muted px-1">
        <span>90 days ago</span>
        <span>Today</span>
      </div>
    </div>
  );
}
