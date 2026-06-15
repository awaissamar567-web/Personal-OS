import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatDeltaProps {
  value: number | string;
  type?: 'up' | 'down' | 'neutral';
  className?: string;
  showIcon?: boolean;
}

export default function StatDelta({
  value,
  type = 'neutral',
  className,
  showIcon = true,
}: StatDeltaProps) {
  const isPositive = type === 'up';
  const isNegative = type === 'down';
  const isNeutral = type === 'neutral';

  const text = typeof value === 'number' 
    ? `${isPositive ? '+' : ''}${value.toFixed(1)}%`
    : value;

  return (
    <span className={cn(
      "inline-flex items-center gap-0.5 font-bold text-xs",
      isPositive && "text-emerald-400",
      isNegative && "text-rose-400",
      isNeutral && "text-[#888888]",
      className
    )}>
      {showIcon && isPositive && <ArrowUpRight className="h-3 w-3" />}
      {showIcon && isNegative && <ArrowDownRight className="h-3 w-3" />}
      {showIcon && isNeutral && <Minus className="h-3 w-3" />}
      <span>{text}</span>
    </span>
  );
}
