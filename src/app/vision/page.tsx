'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import { Compass, FileText, CheckCircle2, Award, List, Plus, Trash2, Edit, Loader2 } from 'lucide-react';
import { createSupabaseClient } from '@/lib/supabase-client';
import { formatInputDate, formatDate } from '@/lib/utils';
import GoalCard from '@/components/ui/GoalCard';
import { cn } from '@/lib/utils';

interface Goal {
  id: string;
  title: string;
  description: string | null;
  category: string;
  timeframe: 'daily' | 'weekly' | 'monthly' | 'quarterly' | '1yr' | '5yr';
  target_date: string | null;
  progress: number;
  status: 'active' | 'completed' | 'paused';
}

interface BucketItem {
  id: string;
  item: string;
  category: string | null;
  completed: boolean;
  completed_date: string | null;
}

const quoteCards = [
  { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
  { text: "Your life is the creation of your thoughts.", author: "Marcus Aurelius" },
  { text: "Frugality without creativity is deprivation.", author: "Naval Ravikant" },
  { text: "Amor Fati: Love your fate, which is in fact your life.", author: "Nietzsche" },
];

export default function VisionPage() {
  const [loading, setLoading] = useState(true);
  const supabase = useMemo(() => createSupabaseClient(), []);
  const todayStr = formatInputDate(new Date());

  // Manifesto states
  const [manifestoContent, setManifestoContent] = useState('');
  const [manifestoSaving, setManifestoSaving] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Goals states
  const [goals, setGoals] = useState<Goal[]>([]);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  
  // Goal Form fields
  const [goalTitle, setGoalTitle] = useState('');
  const [goalDesc, setGoalDesc] = useState('');
  const [goalCategory, setGoalCategory] = useState('vision');
  const [goalTimeframe, setGoalTimeframe] = useState<Goal['timeframe']>('monthly');
  const [goalProgress, setGoalProgress] = useState(0);
  const [goalStatus, setGoalStatus] = useState<Goal['status']>('active');
  const [goalTargetDate, setGoalTargetDate] = useState('');
  const [savingGoal, setSavingGoal] = useState(false);

  // Bucket list states
  const [bucketList, setBucketList] = useState<BucketItem[]>([]);
  const [showBucketForm, setShowBucketForm] = useState(false);
  const [bucketItemName, setBucketItemName] = useState('');
  const [bucketCategory, setBucketCategory] = useState('travel');
  const [savingBucket, setSavingBucket] = useState(false);

  const fetchVisionData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // 1. Fetch manifesto
    const { data: manifestoData } = await supabase
      .from('manifesto')
      .select('content')
      .eq('user_id', user.id)
      .maybeSingle();
    
    if (manifestoData) {
      setManifestoContent(manifestoData.content || '');
    }

    // 2. Fetch goals
    const { data: goalsData } = await supabase
      .from('goals')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    setGoals(goalsData || []);

    // 3. Fetch bucket list
    const { data: bucketData } = await supabase
      .from('bucket_list')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    setBucketList(bucketData || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchVisionData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced auto-save for Manifesto
  const handleManifestoChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setManifestoContent(val);
    setManifestoSaving(true);

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: existing } = await supabase
        .from('manifesto')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing) {
        await supabase
          .from('manifesto')
          .update({ content: val, updated_at: new Date().toISOString() })
          .eq('id', existing.id);
      } else {
        await supabase
          .from('manifesto')
          .insert({ user_id: user.id, content: val });
      }
      setManifestoSaving(false);
    }, 1000); // 1-second debounce
  };

  // Goals crud
  const handleOpenGoalModal = (goal?: Goal) => {
    if (goal) {
      setEditingGoal(goal);
      setGoalTitle(goal.title);
      setGoalDesc(goal.description || '');
      setGoalCategory(goal.category);
      setGoalTimeframe(goal.timeframe);
      setGoalProgress(goal.progress);
      setGoalStatus(goal.status);
      setGoalTargetDate(goal.target_date || '');
    } else {
      setEditingGoal(null);
      setGoalTitle('');
      setGoalDesc('');
      setGoalCategory('vision');
      setGoalTimeframe('monthly');
      setGoalProgress(0);
      setGoalStatus('active');
      setGoalTargetDate('');
    }
    setShowGoalModal(true);
  };

  const handleSaveGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!goalTitle.trim()) return;
    setSavingGoal(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const payload = {
      user_id: user.id,
      title: goalTitle,
      description: goalDesc || null,
      category: goalCategory,
      timeframe: goalTimeframe,
      progress: Number(goalProgress),
      status: goalStatus,
      target_date: goalTargetDate || null,
    };

    if (editingGoal) {
      await supabase
        .from('goals')
        .update(payload)
        .eq('id', editingGoal.id);
    } else {
      await supabase
        .from('goals')
        .insert(payload);
    }

    setShowGoalModal(false);
    setSavingGoal(false);
    fetchVisionData();
  };

  const handleDeleteGoal = async (goalId: string) => {
    if (!confirm('Are you sure you want to delete this goal?')) return;
    await supabase.from('goals').delete().eq('id', goalId);
    fetchVisionData();
  };

  // Bucket list triggers
  const handleSaveBucketItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bucketItemName.trim()) return;
    setSavingBucket(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const payload = {
      user_id: user.id,
      item: bucketItemName,
      category: bucketCategory,
      completed: false,
    };

    await supabase.from('bucket_list').insert(payload);

    setBucketItemName('');
    setShowBucketForm(false);
    setSavingBucket(false);
    fetchVisionData();
  };

  const handleToggleBucketItem = async (id: string, currentStatus: boolean) => {
    const newStatus = !currentStatus;
    
    // Optimistic Update
    setBucketList(prev => prev.map(item => item.id === id ? { ...item, completed: newStatus, completed_date: newStatus ? todayStr : null } : item));

    await supabase
      .from('bucket_list')
      .update({
        completed: newStatus,
        completed_date: newStatus ? todayStr : null,
      })
      .eq('id', id);

    fetchVisionData();
  };

  const handleDeleteBucketItem = async (id: string) => {
    if (!confirm('Delete this bucket list item?')) return;
    await supabase.from('bucket_list').delete().eq('id', id);
    fetchVisionData();
  };

  const timeframes: Goal['timeframe'][] = ['daily', 'weekly', 'monthly', '1yr', '5yr'];

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center text-xs text-muted gap-2">
        <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
        <span>Loading vision alignment board...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      
      {/* Split top layout: Manifesto on left, Quote board on right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Manifesto Editor (2 cols wide) */}
        <div className="lg:col-span-2 bg-[#111111] p-6 rounded-xl border border-[#1f1f1f] flex flex-col justify-between space-y-4">
          <div className="flex justify-between items-center border-b border-[#1f1f1f] pb-3">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-indigo-400" />
              <h3 className="font-bold text-white text-sm">PERSONAL MANIFESTO</h3>
            </div>
            {manifestoSaving ? (
              <span className="text-[10px] text-muted flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin text-indigo-500" />
                <span>Auto-saving...</span>
              </span>
            ) : (
              <span className="text-[10px] text-[#555] font-semibold">Changes Saved</span>
            )}
          </div>

          <textarea
            value={manifestoContent}
            onChange={handleManifestoChange}
            rows={10}
            placeholder="Write your core philosophy, daily rules, and personal mission statement. This auto-saves as you type..."
            className="w-full bg-[#0c0c0c] border border-[#1f1f1f] rounded-lg p-4 text-sm text-neutral-300 placeholder-neutral-700 outline-none focus:border-indigo-500 resize-none font-sans leading-relaxed"
          />
        </div>

        {/* Vision board quotes card deck */}
        <div className="bg-[#111] p-6 rounded-xl border border-[#1f1f1f] flex flex-col justify-between">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
            <Compass className="h-4 w-4 text-indigo-500" />
            <span>Core Pillars</span>
          </h3>

          <div className="space-y-4">
            {quoteCards.map((quote, idx) => (
              <div key={idx} className="bg-[#0c0c0c] border border-[#1f1f1f] p-4 rounded-lg space-y-1 hover:border-[#2b2b2b] transition duration-200">
                <p className="text-xs text-neutral-300 italic font-medium">"{quote.text}"</p>
                <span className="text-[10px] text-muted font-bold block text-right">— {quote.author}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Goals by Timeframe */}
      <div className="bg-[#111] p-6 rounded-xl border border-[#1f1f1f] space-y-6">
        <div className="flex justify-between items-center border-b border-[#1f1f1f] pb-3">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Award className="h-4 w-4 text-indigo-500" />
            <span>Timeframed Goals Matrix</span>
          </h3>
          <button
            onClick={() => handleOpenGoalModal()}
            className="rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-black hover:bg-neutral-200 flex items-center gap-1 transition"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>NEW GOAL</span>
          </button>
        </div>

        <div className="space-y-8">
          {timeframes.map((timeframe) => {
            const timeGoals = goals.filter(g => g.timeframe === timeframe);

            return (
              <div key={timeframe} className="space-y-3">
                <h4 className="text-xs font-black text-indigo-400 uppercase tracking-widest pl-1">{timeframe} Objectives</h4>
                {timeGoals.length === 0 ? (
                  <p className="text-xs text-muted pl-1">No goals scheduled for this timeframe.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {timeGoals.map((goal) => (
                      <div key={goal.id} className="relative group">
                        <GoalCard
                          title={goal.title}
                          description={goal.description || undefined}
                          category={goal.category}
                          timeframe={goal.timeframe}
                          targetDate={goal.target_date || undefined}
                          progress={goal.progress}
                          status={goal.status}
                          onEdit={() => handleOpenGoalModal(goal)}
                        />
                        <button
                          onClick={() => handleDeleteGoal(goal.id)}
                          className="absolute top-4 right-10 opacity-0 group-hover:opacity-100 text-muted hover:text-red-400 p-1 bg-[#111]/85 border border-[#1f1f1f] rounded transition duration-200"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Goal Edit Modal */}
      {showGoalModal && (
        <div className="fixed inset-0 z-50 bg-[#000]/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleSaveGoal} className="bg-[#111] border border-[#1f1f1f] p-6 rounded-xl w-full max-w-md space-y-4 shadow-xl">
            <h3 className="font-bold text-white text-sm">{editingGoal ? 'EDIT GOAL' : 'CREATE NEW GOAL'}</h3>
            <div className="flex flex-col space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted">Title</label>
              <input
                type="text"
                required
                value={goalTitle}
                onChange={(e) => setGoalTitle(e.target.value)}
                placeholder="e.g. Save PKR 200,000, Build CRM, Read 2 Books..."
                className="rounded-lg border border-[#1f1f1f] bg-[#0c0c0c] px-4 py-2.5 text-sm text-white outline-none focus:border-indigo-500"
              />
            </div>
            <div className="flex flex-col space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted">Description</label>
              <textarea
                rows={2}
                value={goalDesc}
                onChange={(e) => setGoalDesc(e.target.value)}
                placeholder="Key action steps to achieve this..."
                className="rounded-lg border border-[#1f1f1f] bg-[#0c0c0c] px-4 py-2 text-sm text-white outline-none focus:border-indigo-500 resize-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted">Category</label>
                <select
                  value={goalCategory}
                  onChange={(e) => setGoalCategory(e.target.value)}
                  className="rounded-lg border border-[#1f1f1f] bg-[#0c0c0c] px-4 py-2.5 text-sm text-white outline-none focus:border-indigo-500"
                >
                  <option value="vision">Vision / General</option>
                  <option value="health">Health</option>
                  <option value="wealth">Wealth</option>
                  <option value="work">Work / Productivity</option>
                  <option value="growth">Intellectual Growth</option>
                  <option value="relationships">Relationships</option>
                </select>
              </div>
              <div className="flex flex-col space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted">Timeframe</label>
                <select
                  value={goalTimeframe}
                  onChange={(e) => setGoalTimeframe(e.target.value as any)}
                  className="rounded-lg border border-[#1f1f1f] bg-[#0c0c0c] px-4 py-2.5 text-sm text-white outline-none focus:border-indigo-500"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="1yr">1 Year</option>
                  <option value="5yr">5 Year</option>
                </select>
              </div>
              <div className="flex flex-col space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted">Progress ({goalProgress}%)</label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={goalProgress}
                  onChange={(e) => setGoalProgress(Number(e.target.value))}
                  className="accent-indigo-500 cursor-pointer h-10"
                />
              </div>
              <div className="flex flex-col space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted">Status</label>
                <select
                  value={goalStatus}
                  onChange={(e) => setGoalStatus(e.target.value as any)}
                  className="rounded-lg border border-[#1f1f1f] bg-[#0c0c0c] px-4 py-2.5 text-sm text-white outline-none focus:border-indigo-500"
                >
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="paused">Paused</option>
                </select>
              </div>
            </div>
            <div className="flex flex-col space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted">Target Date</label>
              <input
                type="date"
                value={goalTargetDate}
                onChange={(e) => setGoalTargetDate(e.target.value)}
                className="rounded-lg border border-[#1f1f1f] bg-[#0c0c0c] px-4 py-2.5 text-sm text-white outline-none focus:border-indigo-500"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowGoalModal(false)}
                className="flex-1 rounded-lg border border-[#1f1f1f] py-2 text-xs font-bold text-white hover:bg-[#1a1a1a]"
              >
                CANCEL
              </button>
              <button
                type="submit"
                disabled={savingGoal}
                className="flex-1 rounded-lg bg-white py-2 text-xs font-bold text-black hover:bg-neutral-200"
              >
                {savingGoal ? 'SAVING...' : 'SAVE GOAL'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Bucket List */}
      <div className="bg-[#111111] p-6 rounded-xl border border-[#1f1f1f] space-y-4 shadow-lg">
        <div className="flex justify-between items-center border-b border-[#1f1f1f] pb-3">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <List className="h-4 w-4 text-indigo-500" />
            <span>Bucket List Archives</span>
          </h3>
          <button
            onClick={() => setShowBucketForm(!showBucketForm)}
            className="rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-black hover:bg-neutral-200 flex items-center gap-1 transition"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>ADD ITEM</span>
          </button>
        </div>

        {/* Bucket list form */}
        {showBucketForm && (
          <form onSubmit={handleSaveBucketItem} className="bg-[#0c0c0c] border border-[#1f1f1f] p-4 rounded-lg max-w-sm space-y-3">
            <div className="flex flex-col space-y-1">
              <label className="text-[9px] font-bold uppercase text-muted">Item Name</label>
              <input
                type="text"
                required
                value={bucketItemName}
                onChange={(e) => setBucketItemName(e.target.value)}
                placeholder="e.g. Skydive in Dubai, Visit Hunza..."
                className="rounded-lg border border-[#1f1f1f] bg-[#111] px-3 py-2 text-xs text-white outline-none focus:border-indigo-500"
              />
            </div>
            <div className="flex flex-col space-y-1">
              <label className="text-[9px] font-bold uppercase text-muted">Category</label>
              <input
                type="text"
                value={bucketCategory}
                onChange={(e) => setBucketCategory(e.target.value)}
                placeholder="e.g. Travel, Experience, Finance..."
                className="rounded-lg border border-[#1f1f1f] bg-[#111] px-3 py-2 text-xs text-white outline-none focus:border-indigo-500"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowBucketForm(false)}
                className="flex-1 rounded border border-[#1f1f1f] py-1 text-[10px] font-bold text-white hover:bg-[#111]"
              >
                CANCEL
              </button>
              <button
                type="submit"
                disabled={savingBucket}
                className="flex-1 rounded bg-white py-1 text-[10px] font-bold text-black hover:bg-neutral-200"
              >
                SAVE
              </button>
            </div>
          </form>
        )}

        {bucketList.length === 0 ? (
          <p className="text-xs text-muted">No items logged yet. Add your life bucket items here.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {bucketList.map((item) => (
              <div
                key={item.id}
                className={cn(
                  "flex items-center justify-between p-3.5 rounded-lg border transition",
                  item.completed
                    ? "bg-[#0c0c0c] border-[#1d1d1d] text-[#444]"
                    : "bg-[#0c0c0c] border-[#1f1f1f] text-white hover:border-[#2b2b2b]"
                )}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={item.completed}
                    onChange={() => handleToggleBucketItem(item.id, item.completed)}
                    className="h-4 w-4 rounded accent-indigo-500 cursor-pointer"
                  />
                  <div className="space-y-0.5">
                    <span className={cn("text-xs font-bold", item.completed && "line-through text-muted")}>
                      {item.item}
                    </span>
                    {item.completed && item.completed_date && (
                      <span className="text-[9px] text-emerald-500 block">Completed: {formatDate(item.completed_date)}</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {item.category && (
                    <span className="text-[9px] uppercase font-bold text-muted bg-[#111] border border-[#1f1f1f] px-2 py-0.5 rounded">
                      {item.category}
                    </span>
                  )}
                  <button
                    onClick={() => handleDeleteBucketItem(item.id)}
                    className="text-muted hover:text-red-400 p-1 hover:bg-[#111] rounded transition"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
