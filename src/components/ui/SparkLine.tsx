'use client';

import { Line, LineChart, ResponsiveContainer } from 'recharts';

interface SparkLineProps {
  data: number[] | { value: number }[];
  color?: string;
  strokeWidth?: number;
}

export default function SparkLine({
  data,
  color = '#3b82f6',
  strokeWidth = 2,
}: SparkLineProps) {
  // Normalize data format
  const chartData = data.map((item, index) => {
    if (typeof item === 'number') {
      return { id: index, val: item };
    }
    return { id: index, val: item.value };
  });

  if (chartData.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center text-xs text-muted">
        No Data
      </div>
    );
  }

  return (
    <div className="h-10 w-24">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
          <Line
            type="monotone"
            dataKey="val"
            stroke={color}
            strokeWidth={strokeWidth}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
