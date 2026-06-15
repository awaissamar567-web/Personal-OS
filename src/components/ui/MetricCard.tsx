'use client';

import { useEffect } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MetricCardProps {
  title: string;
  value: number;
  prefix?: string;
  suffix?: string;
  trend?: string;
  trendDirection?: 'up' | 'down' | 'neutral';
  section: 'health' | 'wealth' | 'work' | 'growth' | 'relationships' | 'vision';
  isDecimal?: boolean;
}

const sectionGlowMap = {
  health: 'glow-health hover:border-emerald-500',
  wealth: 'glow-wealth hover:border-violet-500',
  work: 'glow-work hover:border-blue-500',
  growth: 'glow-growth hover:border-amber-500',
  relationships: 'glow-relationships hover:border-rose-500',
  vision: 'glow-vision hover:border-indigo-500',
};



function CountUp({ value, prefix = '', suffix = '', isDecimal = false }: { value: number; prefix?: string; suffix?: string; isDecimal?: boolean }) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (latest) => {
    const formatted = isDecimal ? latest.toFixed(1) : Math.round(latest).toLocaleString('en-US');
    return `${prefix}${formatted}${suffix}`;
  });

  useEffect(() => {
    const controls = animate(count, value, { duration: 1.2, ease: 'easeOut' });
    return () => controls.stop();
  }, [count, value]);

  return <motion.span>{rounded}</motion.span>;
}

export default function MetricCard({
  title,
  value,
  prefix = '',
  suffix = '',
  trend,
  trendDirection = 'neutral',
  section,
  isDecimal = false,
}: MetricCardProps) {
  const glowClass = sectionGlowMap[section] || 'glow-vision';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.01 }}
      transition={{ duration: 0.3 }}
      className={cn(
        "base-card flex flex-col justify-between p-6 cursor-pointer",
        glowClass
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted">
          {title}
        </span>
        {trend && (
          <div className={cn(
            "flex items-center gap-0.5 rounded px-1.5 py-0.5 text-xs font-medium border",
            trendDirection === 'up' && "bg-emerald-950/20 text-emerald-400 border-emerald-900/30",
            trendDirection === 'down' && "bg-rose-950/20 text-rose-400 border-rose-900/30",
            trendDirection === 'neutral' && "bg-[#161616] text-[#888888] border-[#222222]"
          )}>
            {trendDirection === 'up' && <ArrowUpRight className="h-3 w-3" />}
            {trendDirection === 'down' && <ArrowDownRight className="h-3 w-3" />}
            {trendDirection === 'neutral' && <Minus className="h-3 w-3" />}
            <span>{trend}</span>
          </div>
        )}
      </div>

      <div className="mt-4">
        <h3 className="bg-gradient-to-r from-white via-neutral-200 to-neutral-400 bg-clip-text text-3xl font-extrabold tracking-tight text-transparent">
          <CountUp value={value} prefix={prefix} suffix={suffix} isDecimal={isDecimal} />
        </h3>
      </div>
    </motion.div>
  );
}
