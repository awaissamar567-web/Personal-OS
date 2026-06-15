'use client';

import { useEffect, useMemo, useState } from 'react';
import { 
  BarChart, Bar, 
  LineChart, Line, 
  XAxis, YAxis, Tooltip, ResponsiveContainer 
} from 'recharts';
import { Briefcase, Zap, CheckCircle2, Award, Calendar, Loader2 } from 'lucide-react';
import { createSupabaseClient } from '@/lib/supabase-client';
import WorkForm from '@/components/modules/WorkForm';
import { formatInputDate } from '@/lib/utils';

export default function WorkPage() {
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<any[]>([]);
  const [goals, setGoals] = useState<any[]>([]);
  const [stats, setStats] = useState({
    avgDeepWork: 0,
    avgFocus: 0,
    totalTasks: 0,
    prodScore: 0,
  });

  const supabase = useMemo(() => createSupabaseClient(), []);

  const fetchWorkData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoStr = formatInputDate(thirtyDaysAgo);

    // Fetch last 30 days of logs
    const { data: workLogs, error: workErr } = await supabase
      .from('work_logs')
      .select('*')
      .eq('user_id', user.id)
      .gte('date', thirtyDaysAgoStr)
      .order('date', { ascending: true });

    // Fetch weekly goals
    const { data: weeklyGoals } = await supabase
      .from('goals')
      .select('*')
      .eq('user_id', user.id)
      .eq('timeframe', 'weekly')
      .eq('status', 'active');

    if (!workErr && workLogs) {
      setLogs(workLogs);
      setGoals(weeklyGoals || []);

      // Calculate Averages
      let totalDeepWork = 0;
      let totalFocus = 0;
      let totalTasks = 0;
      let logsWithData = 0;

      workLogs.forEach((log: any) => {
        if (log.deep_work_hours) totalDeepWork += Number(log.deep_work_hours);
        if (log.focus_score) totalFocus += Number(log.focus_score);
        if (log.tasks_completed) totalTasks += Number(log.tasks_completed);
        if (log.deep_work_hours || log.focus_score) logsWithData++;
      });

      const avgDeep = logsWithData > 0 ? totalDeepWork / logsWithData : 0;
      const avgFoc = logsWithData > 0 ? totalFocus / logsWithData : 0;
      
      // Daily productivity score computation: 
      // 40% deep work hours (target 6 hrs), 40% focus (target 10), 20% tasks completed (target 5)
      const calculateDailyScore = (deep: number, focus: number, tasks: number) => {
        const deepContrib = Math.min((deep / 6) * 40, 40);
        const focusContrib = Math.min((focus / 10) * 40, 40);
        const tasksContrib = Math.min((tasks / 5) * 20, 20);
        return Math.round(deepContrib + focusContrib + tasksContrib);
      };

      const avgTasksPerDay = logsWithData > 0 ? totalTasks / logsWithData : 0;
      const calculatedProductivity = calculateDailyScore(avgDeep, avgFoc, avgTasksPerDay);

      setStats({
        avgDeepWork: avgDeep,
        avgFocus: avgFoc,
        totalTasks,
        prodScore: calculatedProductivity,
      });
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchWorkData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleGoalProgress = async (goalId: string, currentProgress: number) => {
    const newProgress = currentProgress === 100 ? 0 : 100;
    const newStatus = newProgress === 100 ? 'completed' : 'active';

    // Optimistic Update
    setGoals(prev => prev.map(g => g.id === goalId ? { ...g, progress: newProgress, status: newStatus } : g));

    await supabase
      .from('goals')
      .update({ progress: newProgress, status: newStatus })
      .eq('id', goalId);

    // Refresh data
    fetchWorkData();
  };

  // Chart data formatting: format "YYYY-MM-DD" to "DD/MM"
  const chartData = logs.map((log: any) => {
    const parts = log.date.split('-');
    const label = parts.length === 3 ? `${parts[2]}/${parts[1]}` : log.date;
    return {
      ...log,
      chartDate: label,
      deepWork: log.deep_work_hours ? Number(log.deep_work_hours) : null,
      focus: log.focus_score ? Number(log.focus_score) : null,
      tasks: log.tasks_completed ? Number(log.tasks_completed) : null,
    };
  });

  const customTooltipStyle = {
    contentStyle: { backgroundColor: '#111', borderColor: '#1f1f1f', borderRadius: '8px' },
    labelStyle: { color: '#888', fontSize: '12px', fontWeight: 'bold' },
    itemStyle: { color: '#fff', fontSize: '13px' }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Productivity Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Productivity Score */}
        <div className="base-card p-6 flex items-center justify-between border-blue-950/20 hover:border-blue-500 shadow-md glow-work">
          <div className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted">Productivity Index</span>
            <h3 className="text-3xl font-black text-white">{stats.prodScore}%</h3>
            <p className="text-xs text-[#888]">Weight composite score</p>
          </div>
          <div className="p-4 bg-blue-950/20 border border-blue-900/30 text-blue-400 rounded-xl">
            <Zap className="h-6 w-6" />
          </div>
        </div>

        {/* Avg Deep Work Hours */}
        <div className="base-card p-6 flex items-center justify-between border-blue-950/20 hover:border-blue-500 shadow-md glow-work">
          <div className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted">Daily Deep Work</span>
            <h3 className="text-3xl font-black text-white">{stats.avgDeepWork.toFixed(1)} Hrs</h3>
            <p className="text-xs text-[#888]">Average deep work duration</p>
          </div>
          <div className="p-4 bg-blue-950/20 border border-blue-900/30 text-blue-400 rounded-xl">
            <Briefcase className="h-6 w-6" />
          </div>
        </div>

        {/* Avg Focus Rating */}
        <div className="base-card p-6 flex items-center justify-between border-blue-950/20 hover:border-blue-500 shadow-md glow-work">
          <div className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted">Average Focus</span>
            <h3 className="text-3xl font-black text-white">{stats.avgFocus.toFixed(1)}/10</h3>
            <p className="text-xs text-[#888]">Concentration rating index</p>
          </div>
          <div className="p-4 bg-blue-950/20 border border-blue-900/30 text-blue-400 rounded-xl">
            <CheckCircle2 className="h-6 w-6" />
          </div>
        </div>

        {/* Tasks Completed */}
        <div className="base-card p-6 flex items-center justify-between border-blue-950/20 hover:border-blue-500 shadow-md glow-work">
          <div className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted">Total Tasks (30d)</span>
            <h3 className="text-3xl font-black text-white">{stats.totalTasks} Done</h3>
            <p className="text-xs text-[#888]">Total tasks completed</p>
          </div>
          <div className="p-4 bg-blue-950/20 border border-blue-900/30 text-blue-400 rounded-xl">
            <Award className="h-6 w-6" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side: Form & Weekly Tracker */}
        <div className="space-y-6">
          <WorkForm onSuccess={fetchWorkData} />

          {/* Weekly Goals Tracker */}
          <div className="bg-[#111111] p-6 rounded-xl border border-[#1f1f1f] space-y-4 shadow-lg">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-400" />
              <span>Weekly Objectives</span>
            </h3>

            {goals.length === 0 ? (
              <p className="text-xs text-muted">No active weekly goals. Create weekly goals in the Vision tab.</p>
            ) : (
              <div className="space-y-2">
                {goals.map((goal) => {
                  const isDone = goal.progress === 100;
                  return (
                    <button
                      key={goal.id}
                      onClick={() => toggleGoalProgress(goal.id, goal.progress)}
                      className={`w-full flex items-center justify-between p-3 rounded-lg border text-left transition duration-200 ${
                        isDone 
                          ? "bg-blue-950/10 border-blue-900/30 text-white" 
                          : "bg-[#0c0c0c] border-[#1f1f1f] text-[#888] hover:text-white"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full ${isDone ? "bg-blue-500 shadow-[0_0_8px_#3b82f6]" : "bg-neutral-800"}`} />
                        <span className="text-xs font-semibold">{goal.title}</span>
                      </div>
                      <span className="text-[10px] font-bold uppercase text-muted tracking-wider bg-[#111] border border-[#1f1f1f] px-2 py-0.5 rounded">
                        {goal.category || 'work'}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Charts */}
        <div className="lg:col-span-2 space-y-6">
          {loading ? (
            <div className="flex h-[400px] items-center justify-center text-xs text-muted gap-2 bg-[#111] border border-[#1f1f1f] rounded-xl">
              <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
              <span>Gathering work output records...</span>
            </div>
          ) : logs.length === 0 ? (
            <div className="flex h-[400px] items-center justify-center text-xs text-muted bg-[#111] border border-[#1f1f1f] rounded-xl">
              No data logged in the last 30 days. Complete the form to generate analytics.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Deep Work Hours */}
              <div className="bg-[#111] p-5 rounded-xl border border-[#1f1f1f]">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-4">Deep Work Hours (30d)</h4>
                <div className="h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <XAxis dataKey="chartDate" stroke="#555" fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis stroke="#555" fontSize={10} tickLine={false} axisLine={false} />
                      <Tooltip {...customTooltipStyle} />
                      <Bar dataKey="deepWork" fill="#3b82f6" radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Focus Trend */}
              <div className="bg-[#111] p-5 rounded-xl border border-[#1f1f1f]">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-4">Focus Score Trend (30d)</h4>
                <div className="h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <XAxis dataKey="chartDate" stroke="#555" fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis stroke="#555" fontSize={10} domain={[1, 10]} tickLine={false} axisLine={false} />
                      <Tooltip {...customTooltipStyle} />
                      <Line type="monotone" dataKey="focus" stroke="#3b82f6" strokeWidth={2} dot={false} connectNulls />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Tasks Completed */}
              <div className="bg-[#111] p-5 rounded-xl border border-[#1f1f1f] md:col-span-2">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-4">Tasks Completed Daily (30d)</h4>
                <div className="h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <XAxis dataKey="chartDate" stroke="#555" fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis stroke="#555" fontSize={10} tickLine={false} axisLine={false} />
                      <Tooltip {...customTooltipStyle} />
                      <Bar dataKey="tasks" fill="#3b82f6" radius={[2, 2, 0, 0]} />
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
