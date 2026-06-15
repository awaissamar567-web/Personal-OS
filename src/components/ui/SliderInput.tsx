'use client';

import { cn } from '@/lib/utils';

interface SliderInputProps {
  label: string;
  value: number;
  onChange: (val: number) => void;
  section: 'health' | 'wealth' | 'work' | 'growth' | 'relationships' | 'vision';
  min?: number;
  max?: number;
  step?: number;
  error?: string;
}

const sectionTrackMap = {
  health: 'accent-emerald-500',
  wealth: 'accent-violet-500',
  work: 'accent-blue-500',
  growth: 'accent-amber-500',
  relationships: 'accent-rose-500',
  vision: 'accent-indigo-500',
};

const sectionTextMap = {
  health: 'text-emerald-400',
  wealth: 'text-violet-400',
  work: 'text-blue-400',
  growth: 'text-amber-400',
  relationships: 'text-rose-400',
  vision: 'text-indigo-400',
};

export default function SliderInput({
  label,
  value,
  onChange,
  section,
  min = 1,
  max = 10,
  step = 1,
  error,
}: SliderInputProps) {
  const accentClass = sectionTrackMap[section] || 'accent-indigo-500';
  const textClass = sectionTextMap[section] || 'text-indigo-400';

  const getFeedbackLabel = (val: number) => {
    if (val <= 3) return 'Low';
    if (val <= 6) return 'Moderate';
    if (val <= 8) return 'Optimal';
    return 'Peak';
  };

  return (
    <div className="flex flex-col space-y-2">
      <div className="flex justify-between items-center">
        <label className="text-xs font-semibold uppercase tracking-wider text-[#888]">
          {label}
        </label>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-muted font-medium">({getFeedbackLabel(value)})</span>
          <span className={cn("font-bold text-sm", textClass)}>{value}</span>
          <span className="text-muted">/ {max}</span>
        </div>
      </div>

      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className={cn(
          "w-full h-1.5 rounded-lg bg-[#1a1a1a] cursor-pointer appearance-none outline-none",
          accentClass
        )}
      />
      {error && <span className="text-xs text-red-500 mt-1">{error}</span>}
    </div>
  );
}
