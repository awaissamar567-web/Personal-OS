'use client';

import { motion } from 'framer-motion';
import { Edit2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GoalCardProps {
  title: string;
  description?: string;
  category?: string;
  timeframe: 'daily' | 'weekly' | 'monthly' | 'quarterly' | '1yr' | '5yr';
  targetDate?: string;
  progress: number;
  status: 'active' | 'completed' | 'paused';
  onEdit?: () => void;
}

const categoryGlowMap: Record<string, string> = {
  health: 'glow-health hover:border-emerald-500',
  wealth: 'glow-wealth hover:border-violet-500',
  work: 'glow-work hover:border-blue-500',
  growth: 'glow-growth hover:border-amber-500',
  relationships: 'glow-relationships hover:border-rose-500',
  vision: 'glow-vision hover:border-indigo-500',
};

const categoryBarMap: Record<string, string> = {
  health: 'bg-emerald-500',
  wealth: 'bg-violet-500',
  work: 'bg-blue-500',
  growth: 'bg-amber-500',
  relationships: 'bg-rose-500',
  vision: 'bg-indigo-500',
};

export default function GoalCard({
  title,
  description,
  category = 'vision',
  timeframe,
  targetDate,
  progress,
  status,
  onEdit,
}: GoalCardProps) {
  const normCategory = category.toLowerCase();
  const glowClass = categoryGlowMap[normCategory] || 'glow-vision';
  const barColorClass = categoryBarMap[normCategory] || 'bg-indigo-500';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.01 }}
      className={cn(
        "base-card p-5 flex flex-col justify-between space-y-4",
        glowClass
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted border border-[#1f1f1f] bg-[#1a1a1a] px-2 py-0.5 rounded">
              {timeframe}
            </span>
            <span className={cn(
              "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded",
              status === 'completed' && "bg-emerald-950/20 text-emerald-400 border border-emerald-900/30",
              status === 'paused' && "bg-amber-950/20 text-amber-400 border border-amber-900/30",
              status === 'active' && "bg-blue-950/20 text-blue-400 border border-blue-900/30"
            )}>
              {status}
            </span>
          </div>
          <h4 className="font-bold text-white text-base leading-snug mt-2">{title}</h4>
          {description && <p className="text-xs text-secondary line-clamp-2">{description}</p>}
        </div>

        {onEdit && (
          <button
            onClick={onEdit}
            className="text-muted hover:text-white transition-colors duration-200 p-1 hover:bg-[#1f1f1f] rounded"
          >
            <Edit2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Progress Section */}
      <div className="space-y-2">
        <div className="flex justify-between items-center text-xs">
          <span className="text-secondary font-medium">Progress</span>
          <span className="text-white font-bold">{progress}%</span>
        </div>
        
        {/* Progress Bar Track */}
        <div className="w-full h-1.5 rounded-full bg-[#1c1c1c] overflow-hidden">
          <div
            className={cn("h-full rounded-full transition-all duration-500", barColorClass)}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {targetDate && (
        <div className="flex justify-between items-center text-[10px] text-muted border-t border-[#1f1f1f] pt-2">
          <span>Target Date</span>
          <span>{new Date(targetDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
        </div>
      )}
    </motion.div>
  );
}
