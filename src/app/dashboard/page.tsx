'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Sun, 
  Moon, 
  CheckCircle2, 
  Activity, 
  Focus, 
  Calendar as CalendarIcon, 
  ArrowRight,
  TrendingUp,
  Award,
  Sparkles,
  Droplets,
  Zap,
  Loader2,
  Trash2
} from 'lucide-react';
import { createSupabaseClient } from '@/lib/supabase-client';
import { formatInputDate, formatDate, getPKTDateString, getYesterdayPKTDateString, getPKTDate7DaysAgoString } from '@/lib/utils';
import MetricCard from '@/components/ui/MetricCard';
import SparkLine from '@/components/ui/SparkLine';
import JournalForm from '@/components/modules/JournalForm';
import { cn } from '@/lib/utils';

export default function DashboardPage() {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseClient(), []);
  
  const [todayStr, setTodayStr] = useState(() => getPKTDateString());
  const [yesterdayStr, setYesterdayStr] = useState(() => getYesterdayPKTDateString());

  const [loading, setLoading] = useState(true);
  const [isMorning, setIsMorning] = useState(true);
  const [quickPrompt, setQuickPrompt] = useState('');
  
  // Dashboard states
  const [metrics, setMetrics] = useState({
    mood: 0,
    sleep: 0,
    steps: 0,
    focus: 0,
    water: 0,
  });

  const [habits, setHabits] = useState<any[]>([]);
  const [goals, setGoals] = useState<any[]>([]);
  const [sparklineHealth, setSparklineHealth] = useState<number[]>([]);
  const [sparklineWork, setSparklineWork] = useState<number[]>([]);
  
  // Daily To-Do states
  const [todos, setTodos] = useState<any[]>([]);
  const [yesterdayTodos, setYesterdayTodos] = useState<any[]>([]);
  const [historyTodos, setHistoryTodos] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // Group history by date
  const groupedHistory = useMemo(() => {
    const groups: Record<string, any[]> = {};
    historyTodos.forEach(todo => {
      const date = todo.target_date;
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(todo);
    });
    // Sort dates in descending order
    return Object.keys(groups)
      .sort((a, b) => b.localeCompare(a))
      .reduce((acc, key) => {
        acc[key] = groups[key];
        return acc;
      }, {} as Record<string, any[]>);
  }, [historyTodos]);
  
  useEffect(() => {
    // Dynamic morning/night view check based on local hours
    const hour = new Date().getHours();
    setIsMorning(hour < 12);

    // Schedule automatic reset at midnight PKT
    const getMsUntilMidnightPKT = () => {
      const now = new Date();
      // Format current time in Asia/Karachi timezone
      const pktString = now.toLocaleString('en-US', { timeZone: 'Asia/Karachi' });
      const pktDate = new Date(pktString);
      
      const midnightPKT = new Date(pktDate);
      midnightPKT.setHours(24, 0, 0, 0); // Next midnight
      
      const diffMs = midnightPKT.getTime() - pktDate.getTime();
      return diffMs > 0 ? diffMs : 0;
    };

    const msToMidnight = getMsUntilMidnightPKT();
    
    const timeoutId = setTimeout(() => {
      setTodayStr(getPKTDateString());
      setYesterdayStr(getYesterdayPKTDateString());
      
      const intervalId = setInterval(() => {
        setTodayStr(getPKTDateString());
        setYesterdayStr(getYesterdayPKTDateString());
      }, 24 * 60 * 60 * 1000);
      
      return () => clearInterval(intervalId);
    }, msToMidnight);

    return () => clearTimeout(timeoutId);
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // Calculate dynamic PKT strings for queries
      const tStr = getPKTDateString();
      const yStr = getYesterdayPKTDateString();
      const h7Str = getPKTDate7DaysAgoString();

      setTodayStr(tStr);
      setYesterdayStr(yStr);

      // 1. Fetch today's health logs
      const { data: todayHealth } = await supabase
        .from('health_logs')
        .select('mood,sleep_hours,steps,water_ml')
        .eq('date', tStr)
        .eq('user_id', user.id)
        .maybeSingle();

      // 2. Fetch today's work logs
      const { data: todayWork } = await supabase
        .from('work_logs')
        .select('focus_score')
        .eq('date', tStr)
        .eq('user_id', user.id)
        .maybeSingle();

      setMetrics({
        mood: todayHealth?.mood || 0,
        sleep: todayHealth?.sleep_hours ? Number(todayHealth.sleep_hours) : 0,
        steps: todayHealth?.steps || 0,
        focus: todayWork?.focus_score || 0,
        water: todayHealth?.water_ml || 0,
      });

      // 3. Fetch sparklines (last 7 days)
      const { data: last7Health } = await supabase
        .from('health_logs')
        .select('date,steps')
        .eq('user_id', user.id)
        .gte('date', h7Str)
        .order('date', { ascending: true });

      const { data: last7Work } = await supabase
        .from('work_logs')
        .select('date,deep_work_hours')
        .eq('user_id', user.id)
        .gte('date', h7Str)
        .order('date', { ascending: true });

      // Fill array (at least 7 items for sparklines)
      const stepsData = last7Health?.map(d => d.steps || 0) || [];
      const workData = last7Work?.map(d => Number(d.deep_work_hours) || 0) || [];
      
      setSparklineHealth(stepsData.length ? stepsData : [0, 0, 0, 0, 0, 0, 0]);
      setSparklineWork(workData.length ? workData : [0, 0, 0, 0, 0, 0, 0]);

      // 4. Fetch today's habits
      const { data: activeHabits } = await supabase
        .from('habits')
        .select('*')
        .eq('user_id', user.id)
        .eq('active', true);

      const { data: todayCompletions } = await supabase
        .from('habit_logs')
        .select('habit_id,completed')
        .eq('user_id', user.id)
        .eq('date', tStr);

      const mappedHabits = activeHabits?.map(h => {
        const logged = todayCompletions?.find(l => l.habit_id === h.id);
        return {
          ...h,
          completed: logged ? logged.completed : false,
        };
      }) || [];

      setHabits(mappedHabits);

      // 5. Fetch active goals
      const { data: activeGoals } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .neq('timeframe', 'daily')
        .limit(4);

      setGoals(activeGoals || []);

      // 6. Fetch today's daily to-dos
      const { data: todayTodos } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', user.id)
        .eq('timeframe', 'daily')
        .eq('target_date', tStr)
        .order('created_at', { ascending: true });

      setTodos(todayTodos || []);

      // 7. Fetch yesterday's daily to-dos
      const { data: yestTodos } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', user.id)
        .eq('timeframe', 'daily')
        .eq('target_date', yStr);

      setYesterdayTodos(yestTodos || []);

      // 8. Fetch daily to-dos history (past 7 days, excluding today)
      const { data: histTodos } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', user.id)
        .eq('timeframe', 'daily')
        .lt('target_date', tStr)
        .gte('target_date', h7Str)
        .order('target_date', { ascending: false });

      setHistoryTodos(histTodos || []);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const addTodo = async (title: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const payload = {
      user_id: user.id,
      title,
      timeframe: 'daily',
      target_date: todayStr,
      progress: 0,
      status: 'active',
    };

    const tempId = `temp-${Math.random()}`;
    const tempTodo = { id: tempId, ...payload };
    setTodos(prev => [...prev, tempTodo]);

    const { data, error } = await supabase
      .from('goals')
      .insert(payload)
      .select()
      .single();

    if (error) {
      setTodos(prev => prev.filter(t => t.id !== tempId));
      console.error('Failed to add todo:', error.message);
    } else if (data) {
      setTodos(prev => prev.map(t => t.id === tempId ? data : t));
    }
  };

  const toggleTodo = async (id: string, completed: boolean) => {
    const newProgress = completed ? 100 : 0;
    const newStatus = completed ? 'completed' : 'active';

    setTodos(prev => prev.map(t => t.id === id ? { ...t, progress: newProgress, status: newStatus } : t));

    const { error } = await supabase
      .from('goals')
      .update({ progress: newProgress, status: newStatus })
      .eq('id', id);

    if (error) {
      console.error('Failed to toggle todo:', error.message);
      setTodos(prev => prev.map(t => t.id === id ? { ...t, progress: completed ? 0 : 100, status: completed ? 'active' : 'completed' } : t));
    }
  };

  const deleteTodo = async (id: string) => {
    const previousTodos = [...todos];
    setTodos(prev => prev.filter(t => t.id !== id));

    const { error } = await supabase
      .from('goals')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Failed to delete todo:', error.message);
      setTodos(previousTodos);
    }
  };

  useEffect(() => {
    loadDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todayStr]);

  const toggleHabit = async (habitId: string, currentStatus: boolean) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const newStatus = !currentStatus;

    // Update locally immediately for speed
    setHabits(prev => prev.map(h => h.id === habitId ? { ...h, completed: newStatus } : h));

    // Persist
    const { data: existing } = await supabase
      .from('habit_logs')
      .select('id')
      .eq('habit_id', habitId)
      .eq('date', todayStr)
      .maybeSingle();

    if (existing) {
      await supabase
        .from('habit_logs')
        .update({ completed: newStatus })
        .eq('id', existing.id);
    } else {
      await supabase
        .from('habit_logs')
        .insert({
          user_id: user.id,
          habit_id: habitId,
          date: todayStr,
          completed: newStatus,
        });
    }
  };

  const handleQuickPromptSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickPrompt.trim()) return;
    router.push(`/coach?prompt=${encodeURIComponent(quickPrompt)}`);
  };

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center text-xs text-muted gap-2">
        <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
        <span>Initializing Control Unit...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Greetings Strip */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#111] border border-[#1f1f1f] p-6 rounded-xl shadow-lg">
        <div className="flex items-center gap-4">
          <div className={cn(
            "p-3 rounded-lg border",
            isMorning 
              ? "bg-amber-950/20 border-amber-900/30 text-amber-400" 
              : "bg-indigo-950/20 border-indigo-900/30 text-indigo-400"
          )}>
            {isMorning ? <Sun className="h-6 w-6" /> : <Moon className="h-6 w-6" />}
          </div>
          <div>
            <h1 className="text-xl font-black text-white tracking-wide uppercase">
              {isMorning ? 'Operator: Morning Checklist Active' : 'Operator: Night Log Active'}
            </h1>
            <p className="text-xs text-secondary mt-0.5">
              {isMorning ? 'Set intentions, load health metrics, check habits.' : 'Complete daily ledger, reflect on wins and losses.'}
            </p>
          </div>
        </div>
        <div className="text-xs text-muted font-bold border border-[#1f1f1f] bg-[#0c0c0c] px-3 py-1.5 rounded-lg flex items-center gap-2">
          <CalendarIcon className="h-3.5 w-3.5" />
          <span>{formatDate(new Date())}</span>
        </div>
      </div>

      {/* Key Metric Strip */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <MetricCard title="Today's Mood" value={metrics.mood} suffix="/10" section="vision" />
        <MetricCard title="Sleep Hours" value={metrics.sleep} suffix=" hrs" section="health" isDecimal />
        <MetricCard title="Steps" value={metrics.steps} section="health" />
        <MetricCard title="Focus score" value={metrics.focus} suffix="/10" section="work" />
        <MetricCard title="Water" value={metrics.water} suffix=" ml" section="health" />
      </div>

      {/* Main Grid: Left is Time-based views, Right is trends/checklist */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Side: Layout (2 cols wide on desktop) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Today's Goals */}
          <div className="bg-[#111111] p-6 rounded-xl border border-[#1f1f1f]">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
              <Award className="h-4 w-4 text-indigo-400" />
              <span>Today's Core Goals</span>
            </h3>
            {goals.length === 0 ? (
              <p className="text-xs text-muted">No active goals found. Go to Vision to set objectives.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {goals.map((goal) => (
                  <div key={goal.id} className="bg-[#0c0c0c] border border-[#1f1f1f] p-4 rounded-lg flex flex-col justify-between">
                    <div>
                      <span className="text-[9px] uppercase font-bold text-muted border border-[#1f1f1f] px-1.5 py-0.5 rounded bg-[#111]">
                        {goal.timeframe}
                      </span>
                      <h4 className="text-xs font-bold text-white mt-2 leading-relaxed">{goal.title}</h4>
                    </div>
                    <div className="mt-4 flex items-center justify-between text-[10px]">
                      <span className="text-muted">Progress</span>
                      <span className="text-white font-bold">{goal.progress}%</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Health Target & Daily Todo Tracker */}
          <div className="bg-[#111111] p-6 rounded-xl border border-[#1f1f1f] grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Left Column: Daily To-Dos */}
            <div className="flex flex-col justify-between space-y-4">
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  <span>Daily Tasks</span>
                </h3>
                <p className="text-xs text-muted">Tasks reset daily. Track yesterday's outcomes.</p>
              </div>

              {/* To-Do List */}
              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                {todos.length === 0 ? (
                  <p className="text-xs text-muted italic">No tasks set for today.</p>
                ) : (
                  todos.map((todo) => (
                    <div key={todo.id} className="flex items-center justify-between group bg-[#0c0c0c] border border-[#1f1f1f] hover:border-neutral-700 px-3 py-2 rounded-lg transition duration-150">
                      <label className="flex items-center gap-2.5 cursor-pointer flex-1">
                        <input
                          type="checkbox"
                          checked={todo.status === 'completed'}
                          onChange={(e) => toggleTodo(todo.id, e.target.checked)}
                          className="h-3.5 w-3.5 rounded border-[#1f1f1f] bg-[#0c0c0c] text-emerald-500 focus:ring-0 cursor-pointer"
                        />
                        <span className={cn(
                          "text-xs font-semibold select-none transition-all duration-200",
                          todo.status === 'completed' ? "text-muted line-through" : "text-white"
                        )}>
                          {todo.title}
                        </span>
                      </label>
                      {todo.id.toString().includes('temp') ? null : (
                        <button
                          onClick={() => deleteTodo(todo.id)}
                          className="text-muted hover:text-red-400 opacity-0 group-hover:opacity-100 transition duration-150 p-1"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Add To-Do Input */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const form = e.currentTarget;
                  const input = form.elements.namedItem('todoInput') as HTMLInputElement;
                  const val = input.value.trim();
                  if (val) {
                    addTodo(val);
                    input.value = '';
                  }
                }}
                className="flex gap-2"
              >
                <input
                  name="todoInput"
                  type="text"
                  placeholder="Add a daily task..."
                  className="flex-1 rounded-lg border border-[#1f1f1f] bg-[#0c0c0c] px-3 py-2 text-xs text-white placeholder-neutral-600 outline-none focus:border-emerald-500"
                />
                <button
                  type="submit"
                  className="rounded-lg bg-white hover:bg-neutral-200 px-3 py-2 text-xs font-bold text-black transition"
                >
                  Add
                </button>
              </form>

              {/* Yesterday's Summary */}
              {yesterdayTodos.length > 0 && (
                <div className="border-t border-[#1f1f1f] pt-3 text-[10px] space-y-1">
                  <span className="font-bold text-muted uppercase tracking-wider block">Yesterday's Reflection:</span>
                  <div className="flex flex-col gap-1.5 mt-1 bg-[#0c0c0c] border border-[#1f1f1f] p-2.5 rounded-lg">
                    {yesterdayTodos.filter(t => t.status === 'completed').length > 0 && (
                      <div className="flex items-start gap-1.5 text-emerald-400">
                        <span className="font-bold shrink-0">✓ Completed:</span>
                        <span className="text-white font-medium break-all">
                          {yesterdayTodos.filter(t => t.status === 'completed').map(t => t.title).join(', ')}
                        </span>
                      </div>
                    )}
                    {yesterdayTodos.filter(t => t.status !== 'completed').length > 0 && (
                      <div className="flex items-start gap-1.5 text-rose-400">
                        <span className="font-bold shrink-0">⚠ Missed:</span>
                        <span className="text-neutral-400 font-medium break-all">
                          {yesterdayTodos.filter(t => t.status !== 'completed').map(t => t.title).join(', ')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Health Targets & Water Intake */}
            <div className="flex flex-col justify-between space-y-4">
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Activity className="h-4 w-4 text-emerald-400" />
                  <span>Health Targets</span>
                </h3>
                <p className="text-xs text-muted">Daily vitals indicators</p>
              </div>
              
              <div className="bg-[#0c0c0c] border border-[#1f1f1f] rounded-lg p-4 flex justify-between items-center h-full min-h-[80px]">
                <div>
                  <span className="text-[10px] text-muted font-bold uppercase block">Water Intake</span>
                  <span className="text-sm font-bold text-emerald-400 mt-1 block">{metrics.water} / 3000 ml</span>
                </div>
                <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
              </div>
            </div>

          </div>

          {/* Daily Tasks History Log */}
          {historyTodos.length > 0 && (
            <div className="bg-[#111111] p-6 rounded-xl border border-[#1f1f1f] shadow-lg">
              <button
                type="button"
                onClick={() => setShowHistory(!showHistory)}
                className="w-full flex items-center justify-between text-sm font-bold text-white uppercase tracking-wider group outline-none"
              >
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-indigo-400" />
                  <span>Daily Tasks History Log</span>
                </div>
                <span className="text-xs text-muted group-hover:text-white transition duration-150 font-bold">
                  {showHistory ? 'HIDE HISTORY' : 'SHOW PAST 7 DAYS'}
                </span>
              </button>

              {showHistory && (
                <div className="mt-6 space-y-4 border-t border-[#1f1f1f] pt-4">
                  {Object.entries(groupedHistory).map(([date, dayTodos]) => {
                    const completed = dayTodos.filter(t => t.status === 'completed');
                    const missed = dayTodos.filter(t => t.status !== 'completed');
                    const percent = Math.round((completed.length / dayTodos.length) * 100) || 0;

                    return (
                      <div key={date} className="bg-[#0c0c0c] border border-[#1f1f1f] p-4 rounded-lg space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white">{formatDate(date)}</span>
                          <span className={cn(
                            "text-[10px] font-bold px-2 py-0.5 rounded border",
                            percent === 100
                              ? "bg-emerald-950/20 border-emerald-900/30 text-emerald-400"
                              : percent >= 50
                              ? "bg-amber-950/20 border-amber-900/30 text-amber-400"
                              : "bg-rose-950/20 border-rose-900/30 text-rose-400"
                          )}>
                            {completed.length}/{dayTodos.length} Completed ({percent}%)
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-1">
                          {completed.length > 0 && (
                            <div className="space-y-1">
                              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-500">✓ Accomplished:</span>
                              <ul className="list-disc list-inside text-neutral-300 space-y-0.5 font-medium">
                                {completed.map(t => (
                                  <li key={t.id} className="break-all">{t.title}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {missed.length > 0 && (
                            <div className="space-y-1">
                              <span className="text-[10px] font-black uppercase tracking-wider text-rose-500">⚠ Missed:</span>
                              <ul className="list-disc list-inside text-neutral-500 space-y-0.5 font-medium">
                                {missed.map(t => (
                                  <li key={t.id} className="line-through break-all">{t.title}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Night Reflection Journal */}
          {!isMorning && (
            <div className="bg-[#111111] p-6 rounded-xl border border-[#1f1f1f] space-y-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Moon className="h-4 w-4 text-indigo-400" />
                <span>Night Reflection</span>
              </h3>
              <JournalForm onSuccess={loadDashboardData} initialType="night" />
            </div>
          )}
        </div>

        {/* Right Side: Habit checklist & Sparkline trends */}
        <div className="space-y-6">
          {/* Today's Habits Checklist */}
          <div className="bg-[#111111] p-6 rounded-xl border border-[#1f1f1f] shadow-lg">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-amber-400" />
              <span>Habit Checklist</span>
            </h3>
            
            {habits.length === 0 ? (
              <p className="text-xs text-muted">No active habits. Create habits in the Habits tab.</p>
            ) : (
              <div className="space-y-2">
                {habits.map((habit) => (
                  <button
                    key={habit.id}
                    onClick={() => toggleHabit(habit.id, habit.completed)}
                    className={cn(
                      "w-full flex items-center justify-between p-3 rounded-lg border text-left transition duration-200",
                      habit.completed
                        ? "bg-amber-950/10 border-amber-900/30 text-white"
                        : "bg-[#0c0c0c] border-[#1f1f1f] text-[#888888] hover:text-white"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "h-2 w-2 rounded-full",
                        habit.completed ? "bg-amber-500 shadow-[0_0_8px_#f59e0b]" : "bg-neutral-800"
                      )} />
                      <span className="text-xs font-semibold">{habit.name}</span>
                    </div>
                    <span className="text-[10px] font-bold uppercase text-muted tracking-wider bg-[#111] border border-[#1f1f1f] px-2 py-0.5 rounded">
                      {habit.category || 'personal'}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Sparkline trends */}
          <div className="bg-[#111] p-6 rounded-xl border border-[#1f1f1f] space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-blue-400" />
              <span>7-Day Log Activity</span>
            </h3>
            
            {/* Steps Sparkline */}
            <div className="flex justify-between items-center p-3 bg-[#0c0c0c] rounded-lg border border-[#1f1f1f]">
              <div>
                <span className="text-[10px] text-muted uppercase font-bold block">Steps Trend</span>
                <span className="text-xs font-bold text-white mt-1 block">Health Metric</span>
              </div>
              <SparkLine data={sparklineHealth} color="#10b981" />
            </div>

            {/* Deep Work Sparkline */}
            <div className="flex justify-between items-center p-3 bg-[#0c0c0c] rounded-lg border border-[#1f1f1f]">
              <div>
                <span className="text-[10px] text-muted uppercase font-bold block">Deep Work Trend</span>
                <span className="text-xs font-bold text-white mt-1 block">Work hours</span>
              </div>
              <SparkLine data={sparklineWork} color="#3b82f6" />
            </div>
          </div>
        </div>
      </div>

      {/* AI Coach Quick Prompt Box */}
      <div className="bg-[#111111] border border-[#1f1f1f] rounded-xl p-6 shadow-xl">
        <form onSubmit={handleQuickPromptSubmit} className="space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Consult AI Coach</h3>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={quickPrompt}
              onChange={(e) => setQuickPrompt(e.target.value)}
              placeholder="Ask: Why was my productivity low this week? Or seek immediate feedback..."
              className="flex-1 rounded-lg border border-[#1f1f1f] bg-[#0c0c0c] px-4 py-3 text-sm text-white placeholder-neutral-600 outline-none transition duration-200 focus:border-purple-500"
            />
            <button
              type="submit"
              disabled={!quickPrompt.trim()}
              className="rounded-lg bg-white px-4 text-black hover:bg-neutral-200 active:scale-95 transition duration-200 disabled:opacity-50 disabled:pointer-events-none flex items-center gap-2 text-xs font-bold"
            >
              <span>COACH</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
