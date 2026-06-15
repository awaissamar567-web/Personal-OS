'use client';

import { useEffect, useMemo, useState } from 'react';
import { CheckSquare, Square, Plus, Trash2, Edit2, Flame, Loader2 } from 'lucide-react';
import { createSupabaseClient } from '@/lib/supabase-client';
import { formatInputDate } from '@/lib/utils';
import HabitGrid from '@/components/ui/HabitGrid';
import { cn } from '@/lib/utils';

interface Habit {
  id: string;
  name: string;
  category: 'health' | 'work' | 'personal';
  frequency: string;
  active: boolean;
}

export default function HabitsPage() {
  const [loading, setLoading] = useState(true);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [habitLogs, setHabitLogs] = useState<any[]>([]);
  
  // Form states
  const [showForm, setShowForm] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [habitName, setHabitName] = useState('');
  const [habitCategory, setHabitCategory] = useState<'health' | 'work' | 'personal'>('personal');
  const [formLoading, setFormLoading] = useState(false);

  const supabase = useMemo(() => createSupabaseClient(), []);
  const todayStr = formatInputDate(new Date());

  const fetchHabitsData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Fetch habits
    const { data: habitsData } = await supabase
      .from('habits')
      .select('*')
      .eq('user_id', user.id)
      .eq('active', true)
      .order('created_at', { ascending: true });

    // Fetch last 90 days habit logs
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const ninetyDaysAgoStr = formatInputDate(ninetyDaysAgo);

    const { data: logsData } = await supabase
      .from('habit_logs')
      .select('*')
      .eq('user_id', user.id)
      .gte('date', ninetyDaysAgoStr);

    setHabits(habitsData || []);
    setHabitLogs(logsData || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchHabitsData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleHabitComplete = async (habitId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const existingLog = habitLogs.find(l => l.habit_id === habitId && l.date === todayStr);
    const isCompleted = existingLog ? existingLog.completed : false;
    const newStatus = !isCompleted;

    // Optimistic Update
    if (existingLog) {
      setHabitLogs(prev => prev.map(l => l.id === existingLog.id ? { ...l, completed: newStatus } : l));
      await supabase
        .from('habit_logs')
        .update({ completed: newStatus })
        .eq('id', existingLog.id);
    } else {
      const tempId = Math.random().toString();
      const newLog = { id: tempId, habit_id: habitId, date: todayStr, completed: newStatus, user_id: user.id };
      setHabitLogs(prev => [...prev, newLog]);
      
      const { data } = await supabase
        .from('habit_logs')
        .insert({ habit_id: habitId, date: todayStr, completed: newStatus, user_id: user.id })
        .select()
        .single();
      
      if (data) {
        setHabitLogs(prev => prev.map(l => l.id === tempId ? data : l));
      }
    }
  };

  const handleSaveHabit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!habitName.trim()) return;
    setFormLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const payload = {
      user_id: user.id,
      name: habitName,
      category: habitCategory,
      frequency: 'daily',
      active: true,
      color: habitCategory === 'health' ? 'emerald' : habitCategory === 'work' ? 'blue' : 'amber',
    };

    if (editingHabit) {
      await supabase
        .from('habits')
        .update(payload)
        .eq('id', editingHabit.id);
    } else {
      await supabase
        .from('habits')
        .insert(payload);
    }

    setHabitName('');
    setShowForm(false);
    setEditingHabit(null);
    setFormLoading(false);
    fetchHabitsData();
  };

  const handleDeleteHabit = async (habitId: string) => {
    if (!confirm('Are you sure you want to archive this habit?')) return;
    
    // Set active to false (soft delete to keep logs in database)
    await supabase
      .from('habits')
      .update({ active: false })
      .eq('id', habitId);

    fetchHabitsData();
  };

  const calculateStreak = (habitId: string) => {
    const completions = new Set(
      habitLogs.filter(l => l.habit_id === habitId && l.completed).map(l => l.date)
    );
    
    let streak = 0;
    const today = new Date();
    const todayStr = formatInputDate(today);
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    const yesterdayStr = formatInputDate(yesterday);

    let checkDate = new Date();
    if (completions.has(todayStr)) {
      checkDate = today;
    } else if (completions.has(yesterdayStr)) {
      checkDate = yesterday;
    } else {
      return 0;
    }

    while (true) {
      const checkStr = formatInputDate(checkDate);
      if (completions.has(checkStr)) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }
    return streak;
  };

  const getCompletedDates = (habitId: string): string[] => {
    return habitLogs.filter(l => l.habit_id === habitId && l.completed).map(l => l.date);
  };

  // Group habits by category
  const categories: ('health' | 'work' | 'personal')[] = ['health', 'work', 'personal'];
  
  const categoryGlowMap = {
    health: 'border-emerald-950/20 hover:border-emerald-500 glow-health',
    work: 'border-blue-950/20 hover:border-blue-500 glow-work',
    personal: 'border-amber-950/20 hover:border-amber-500 glow-growth',
  };

  const categoryTextMap = {
    health: 'text-emerald-400',
    work: 'text-blue-400',
    personal: 'text-amber-400',
  };

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center text-xs text-muted gap-2">
        <Loader2 className="h-4 w-4 animate-spin text-amber-500" />
        <span>Loading daily checklists...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Title & Form Trigger */}
      <div className="flex justify-between items-center bg-[#111] border border-[#1f1f1f] p-6 rounded-xl">
        <div>
          <h1 className="text-xl font-black text-white tracking-wide uppercase">HABIT SYSTEM</h1>
          <p className="text-xs text-secondary mt-0.5">Maintain streaks, build systems, visualize consistency.</p>
        </div>
        <button
          onClick={() => {
            setEditingHabit(null);
            setHabitName('');
            setHabitCategory('personal');
            setShowForm(!showForm);
          }}
          className="rounded-lg bg-white px-4 py-2 text-xs font-bold text-black hover:bg-neutral-200 flex items-center gap-1.5 transition"
        >
          <Plus className="h-4 w-4" />
          <span>NEW HABIT</span>
        </button>
      </div>

      {/* Habit Addition / Editing Form */}
      {showForm && (
        <form onSubmit={handleSaveHabit} className="bg-[#111] border border-[#1f1f1f] p-6 rounded-xl max-w-md space-y-4 shadow-lg">
          <h3 className="font-bold text-white text-sm">{editingHabit ? 'EDIT HABIT' : 'CREATE NEW HABIT'}</h3>
          <div className="flex flex-col space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted">Habit Name</label>
            <input
              type="text"
              required
              value={habitName}
              onChange={(e) => setHabitName(e.target.value)}
              placeholder="e.g. Read 10 Pages, Cold Shower, No Caffeine..."
              className="rounded-lg border border-[#1f1f1f] bg-[#0c0c0c] px-4 py-2.5 text-sm text-white placeholder-neutral-600 outline-none focus:border-amber-500"
            />
          </div>
          <div className="flex flex-col space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted">Category</label>
            <select
              value={habitCategory}
              onChange={(e) => setHabitCategory(e.target.value as any)}
              className="rounded-lg border border-[#1f1f1f] bg-[#0c0c0c] px-4 py-2.5 text-sm text-white outline-none focus:border-amber-500"
            >
              <option value="personal">Personal / Growth (Amber)</option>
              <option value="health">Health / Physiological (Emerald)</option>
              <option value="work">Work / Career (Blue)</option>
            </select>
          </div>
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="flex-1 rounded-lg border border-[#1f1f1f] py-2 text-xs font-bold text-white hover:bg-[#1a1a1a]"
            >
              CANCEL
            </button>
            <button
              type="submit"
              disabled={formLoading}
              className="flex-1 rounded-lg bg-white py-2 text-xs font-bold text-black hover:bg-neutral-200"
            >
              {formLoading ? 'SAVING...' : 'SAVE HABIT'}
            </button>
          </div>
        </form>
      )}

      {/* Checklist section */}
      <div className="bg-[#111111] p-6 rounded-xl border border-[#1f1f1f] space-y-4">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider">Today's Log Checklist</h3>
        {habits.length === 0 ? (
          <p className="text-xs text-muted">Create a habit above to start tracking.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {habits.map((habit) => {
              const isCompleted = habitLogs.some(l => l.habit_id === habit.id && l.date === todayStr && l.completed);
              const textClass = categoryTextMap[habit.category];
              
              return (
                <button
                  key={habit.id}
                  onClick={() => toggleHabitComplete(habit.id)}
                  className={cn(
                    "flex items-center justify-between p-4 rounded-lg border text-left transition duration-200",
                    isCompleted
                      ? "bg-[#0f0f0f] border-neutral-800 text-[#555]"
                      : "bg-[#0c0c0c] border-[#1f1f1f] text-white hover:border-neutral-700"
                  )}
                >
                  <div className="flex items-center gap-3">
                    {isCompleted ? (
                      <CheckSquare className={cn("h-5 w-5", textClass)} />
                    ) : (
                      <Square className="h-5 w-5 text-[#333]" />
                    )}
                    <span className={cn("text-xs font-bold", isCompleted && "line-through text-muted")}>{habit.name}</span>
                  </div>
                  <span className="text-[9px] uppercase font-bold text-muted px-2 py-0.5 rounded bg-[#111] border border-[#1f1f1f]">
                    {habit.category}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Category lists and heatmaps */}
      <div className="space-y-6">
        {categories.map((category) => {
          const catHabits = habits.filter(h => h.category === category);
          if (catHabits.length === 0) return null;

          return (
            <div key={category} className="space-y-4">
              <h2 className={cn("text-xs font-bold uppercase tracking-widest pl-1", categoryTextMap[category])}>
                {category} Systems
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {catHabits.map((habit) => {
                  const streak = calculateStreak(habit.id);
                  const completedDates = getCompletedDates(habit.id);

                  return (
                    <div
                      key={habit.id}
                      className={cn(
                        "base-card p-6 flex flex-col justify-between space-y-6 shadow-md",
                        categoryGlowMap[habit.category]
                      )}
                    >
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <h4 className="font-bold text-white text-sm">{habit.name}</h4>
                          <span className="text-[10px] text-muted capitalize block">Daily habit loop</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1 text-xs font-bold text-white bg-[#0c0c0c] border border-[#1f1f1f] px-2 py-1 rounded">
                            <Flame className="h-3.5 w-3.5 text-amber-500" />
                            <span>{streak} Streak</span>
                          </div>
                          <button
                            onClick={() => {
                              setEditingHabit(habit);
                              setHabitName(habit.name);
                              setHabitCategory(habit.category);
                              setShowForm(true);
                            }}
                            className="p-1.5 hover:bg-[#1a1a1a] rounded text-muted hover:text-white transition duration-200"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteHabit(habit.id)}
                            className="p-1.5 hover:bg-[#1a1a1a] rounded text-muted hover:text-red-400 transition duration-200"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Contribution heatmap */}
                      <div className="pt-2">
                        <HabitGrid 
                          completedDates={completedDates} 
                          color={habit.category === 'personal' ? 'growth' : habit.category} 
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
