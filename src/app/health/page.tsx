'use client';

import { useEffect, useMemo, useState } from 'react';
import { 
  LineChart, Line, 
  BarChart, Bar, 
  AreaChart, Area, 
  XAxis, YAxis, Tooltip, ResponsiveContainer 
} from 'recharts';
import { Heart, Dumbbell, Award, Flame, Loader2 } from 'lucide-react';
import { createSupabaseClient } from '@/lib/supabase-client';
import { formatInputDate, formatDate } from '@/lib/utils';
import HealthForm from '@/components/modules/HealthForm';

export default function HealthPage() {
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<any[]>([]);
  const [gymStreak, setGymStreak] = useState(0);
  const [personalBests, setPersonalBests] = useState({
    maxSteps: 0,
    maxSleep: 0,
    minBodyFat: 100,
    minWeight: 1000,
  });

  const supabase = useMemo(() => createSupabaseClient(), []);

  const fetchHealthData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoStr = formatInputDate(thirtyDaysAgo);

    // Fetch last 30 days of logs
    const { data, error } = await supabase
      .from('health_logs')
      .select('*')
      .eq('user_id', user.id)
      .gte('date', thirtyDaysAgoStr)
      .order('date', { ascending: true });

    if (!error && data) {
      setLogs(data);

      // 1. Calculate Gym Streak
      const gymDates = new Set(
        data.filter((l: any) => l.gym_workout).map((l: any) => l.date)
      );
      
      let streak = 0;
      const today = new Date();
      const todayStr = formatInputDate(today);
      const yesterday = new Date();
      yesterday.setDate(today.getDate() - 1);
      const yesterdayStr = formatInputDate(yesterday);

      let checkDate: Date | null = new Date();
      if (gymDates.has(todayStr)) {
        checkDate = today;
      } else if (gymDates.has(yesterdayStr)) {
        checkDate = yesterday;
      } else {
        checkDate = null;
      }

      if (checkDate) {
        while (true) {
          const checkStr = formatInputDate(checkDate);
          if (gymDates.has(checkStr)) {
            streak++;
            checkDate.setDate(checkDate.getDate() - 1);
          } else {
            break;
          }
        }
      }
      setGymStreak(streak);

      // 2. Calculate Personal Bests
      let maxSteps = 0;
      let maxSleep = 0;
      let minBodyFat = 100;
      let minWeight = 1000;

      data.forEach((log: any) => {
        if (log.steps && log.steps > maxSteps) maxSteps = log.steps;
        if (log.sleep_hours && Number(log.sleep_hours) > maxSleep) maxSleep = Number(log.sleep_hours);
        if (log.body_fat_pct && Number(log.body_fat_pct) < minBodyFat) minBodyFat = Number(log.body_fat_pct);
        if (log.weight_kg && Number(log.weight_kg) < minWeight) minWeight = Number(log.weight_kg);
      });

      setPersonalBests({
        maxSteps,
        maxSleep,
        minBodyFat: minBodyFat === 100 ? 0 : minBodyFat,
        minWeight: minWeight === 1000 ? 0 : minWeight,
      });
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchHealthData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Format date for chart labels: "DD/MM"
  const chartData = logs.map((log: any) => {
    const parts = log.date.split('-');
    const label = parts.length === 3 ? `${parts[2]}/${parts[1]}` : log.date;
    return {
      ...log,
      chartDate: label,
      weight: log.weight_kg ? Number(log.weight_kg) : null,
      sleep: log.sleep_hours ? Number(log.sleep_hours) : null,
      steps: log.steps ? Number(log.steps) : null,
      mood: log.mood ? Number(log.mood) : null,
      energy: log.energy ? Number(log.energy) : null,
    };
  });

  const customTooltipStyle = {
    contentStyle: { backgroundColor: '#111', borderColor: '#1f1f1f', borderRadius: '8px' },
    labelStyle: { color: '#888', fontSize: '12px', fontWeight: 'bold' },
    itemStyle: { color: '#fff', fontSize: '13px' }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Metrics Header */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Gym Streak */}
        <div className="base-card p-6 flex items-center justify-between border-emerald-950/20 hover:border-emerald-500 shadow-md">
          <div className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted">Gym Streak</span>
            <h3 className="text-3xl font-black text-white">{gymStreak} Days</h3>
            <p className="text-xs text-[#888]">Consecutive workout days</p>
          </div>
          <div className="p-4 bg-emerald-950/20 border border-emerald-900/30 text-emerald-400 rounded-xl">
            <Flame className="h-6 w-6" />
          </div>
        </div>

        {/* Personal Best Steps */}
        <div className="base-card p-6 flex items-center justify-between border-emerald-950/20 hover:border-emerald-500 shadow-md">
          <div className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted">Max Daily Steps</span>
            <h3 className="text-3xl font-black text-white">
              {personalBests.maxSteps.toLocaleString()}
            </h3>
            <p className="text-xs text-[#888]">Highest recorded steps count</p>
          </div>
          <div className="p-4 bg-emerald-950/20 border border-emerald-900/30 text-emerald-400 rounded-xl">
            <Award className="h-6 w-6" />
          </div>
        </div>

        {/* Lowest Body Fat / Weight */}
        <div className="base-card p-6 flex items-center justify-between border-emerald-950/20 hover:border-emerald-500 shadow-md">
          <div className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted">Min Body Fat / Weight</span>
            <h3 className="text-2xl font-black text-white">
              {personalBests.minBodyFat ? `${personalBests.minBodyFat}%` : '--'} / {personalBests.minWeight ? `${personalBests.minWeight}kg` : '--'}
            </h3>
            <p className="text-xs text-[#888]">Lowest body measurements</p>
          </div>
          <div className="p-4 bg-emerald-950/20 border border-emerald-900/30 text-emerald-400 rounded-xl">
            <Heart className="h-6 w-6" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Side: Forms */}
        <div className="space-y-6">
          <HealthForm onSuccess={fetchHealthData} />
        </div>

        {/* Right Side: Charts */}
        <div className="lg:col-span-2 space-y-6">
          {loading ? (
            <div className="flex h-[400px] items-center justify-center text-xs text-muted gap-2 bg-[#111] border border-[#1f1f1f] rounded-xl">
              <Loader2 className="h-4 w-4 animate-spin text-emerald-500" />
              <span>Fetching medical vitals...</span>
            </div>
          ) : logs.length === 0 ? (
            <div className="flex h-[400px] items-center justify-center text-xs text-muted bg-[#111] border border-[#1f1f1f] rounded-xl">
              No data available for the last 30 days. Log data to generate charts.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Weight Trend Chart */}
              <div className="bg-[#111] p-5 rounded-xl border border-[#1f1f1f] flex flex-col justify-between">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-4">Weight Trend (30d)</h4>
                <div className="h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <XAxis dataKey="chartDate" stroke="#555" fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis stroke="#555" fontSize={10} domain={['dataMin - 1', 'dataMax + 1']} tickLine={false} axisLine={false} />
                      <Tooltip {...customTooltipStyle} />
                      <Line type="monotone" dataKey="weight" stroke="#10b981" strokeWidth={2} dot={false} connectNulls />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Sleep Trend Chart */}
              <div className="bg-[#111] p-5 rounded-xl border border-[#1f1f1f] flex flex-col justify-between">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-4">Sleep hours (30d)</h4>
                <div className="h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <XAxis dataKey="chartDate" stroke="#555" fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis stroke="#555" fontSize={10} domain={[0, 12]} tickLine={false} axisLine={false} />
                      <Tooltip {...customTooltipStyle} />
                      <Line type="monotone" dataKey="sleep" stroke="#10b981" strokeWidth={2} dot={false} connectNulls />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Mood & Energy Chart */}
              <div className="bg-[#111] p-5 rounded-xl border border-[#1f1f1f] flex flex-col justify-between">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-4">Mood & Energy (30d)</h4>
                <div className="h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <XAxis dataKey="chartDate" stroke="#555" fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis stroke="#555" fontSize={10} domain={[1, 10]} tickLine={false} axisLine={false} />
                      <Tooltip {...customTooltipStyle} />
                      <Area type="monotone" dataKey="mood" stroke="#10b981" fill="rgba(16, 185, 129, 0.15)" strokeWidth={1.5} connectNulls />
                      <Area type="monotone" dataKey="energy" stroke="#3b82f6" fill="rgba(59, 130, 246, 0.05)" strokeWidth={1.5} connectNulls />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Steps Daily Chart */}
              <div className="bg-[#111] p-5 rounded-xl border border-[#1f1f1f] flex flex-col justify-between">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-4">Daily Steps (30d)</h4>
                <div className="h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <XAxis dataKey="chartDate" stroke="#555" fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis stroke="#555" fontSize={10} tickLine={false} axisLine={false} />
                      <Tooltip {...customTooltipStyle} />
                      <Bar dataKey="steps" fill="#10b981" radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
}
