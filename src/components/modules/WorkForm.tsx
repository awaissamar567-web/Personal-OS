'use client';

import { useEffect, useState, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as zod from 'zod';
import { Briefcase, Target, Save, Loader2, Check } from 'lucide-react';
import { createSupabaseClient } from '@/lib/supabase-client';
import SliderInput from '../ui/SliderInput';
import { formatInputDate, cn } from '@/lib/utils';

const workSchema = zod.object({
  date: zod.string(),
  deep_work_hours: zod.number().min(0).max(24).nullable().optional(),
  tasks_completed: zod.number().int().min(0).nullable().optional(),
  focus_score: zod.number().min(1).max(10),
  learning_hours: zod.number().min(0).max(24).nullable().optional(),
  weekly_goals_met: zod.boolean(),
  notes: zod.string().optional(),
});

type WorkFormValues = zod.infer<typeof workSchema>;

interface WorkFormProps {
  onSuccess?: () => void;
}

export default function WorkForm({ onSuccess }: WorkFormProps) {
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const supabase = useMemo(() => createSupabaseClient(), []);
  const todayStr = formatInputDate(new Date());

  const { register, handleSubmit, control, watch, reset, setValue } = useForm<WorkFormValues>({
    resolver: zodResolver(workSchema),
    defaultValues: {
      date: todayStr,
      deep_work_hours: null,
      tasks_completed: null,
      focus_score: 5,
      learning_hours: null,
      weekly_goals_met: false,
      notes: '',
    },
  });

  const selectedDate = watch('date');

  // Fetch log if it exists for the selected date
  useEffect(() => {
    async function fetchLog() {
      if (!selectedDate) return;
      setFetching(true);
      setErrorMsg(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('work_logs')
        .select('*')
        .eq('date', selectedDate)
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        setErrorMsg('Failed to load logs for this date');
      } else if (data) {
        reset({
          date: selectedDate,
          deep_work_hours: data.deep_work_hours ? Number(data.deep_work_hours) : null,
          tasks_completed: data.tasks_completed ? Number(data.tasks_completed) : null,
          focus_score: data.focus_score ? Number(data.focus_score) : 5,
          learning_hours: data.learning_hours ? Number(data.learning_hours) : null,
          weekly_goals_met: !!data.weekly_goals_met,
          notes: data.notes || '',
        });
      } else {
        reset({
          date: selectedDate,
          deep_work_hours: null,
          tasks_completed: null,
          focus_score: 5,
          learning_hours: null,
          weekly_goals_met: false,
          notes: '',
        });
      }
      setFetching(false);
    }

    fetchLog();
  }, [selectedDate, reset, supabase]);

  const onSubmit = async (values: WorkFormValues) => {
    setLoading(true);
    setErrorMsg(null);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setErrorMsg('User not authenticated');
      setLoading(false);
      return;
    }

    const payload = {
      user_id: user.id,
      date: values.date,
      deep_work_hours: values.deep_work_hours !== undefined ? values.deep_work_hours : null,
      tasks_completed: values.tasks_completed !== undefined ? values.tasks_completed : null,
      focus_score: values.focus_score,
      learning_hours: values.learning_hours !== undefined ? values.learning_hours : null,
      weekly_goals_met: values.weekly_goals_met,
      notes: values.notes || null,
    };

    const { error } = await supabase
      .from('work_logs')
      .upsert(payload, { onConflict: 'user_id,date' });

    if (error) {
      setErrorMsg(error.message);
    } else {
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      reset({
        date: values.date,
        deep_work_hours: null,
        tasks_completed: null,
        focus_score: 5,
        learning_hours: null,
        weekly_goals_met: false,
        notes: '',
      });
      if (onSuccess) onSuccess();
    }
    setLoading(false);
  };

  const handleClear = () => {
    reset({
      date: selectedDate,
      deep_work_hours: null,
      tasks_completed: null,
      focus_score: 5,
      learning_hours: null,
      weekly_goals_met: false,
      notes: '',
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 bg-[#111111] p-6 rounded-xl border border-[#1f1f1f] shadow-lg">
      <div className="flex items-center justify-between border-b border-[#1f1f1f] pb-4">
        <div className="flex items-center gap-2">
          <Briefcase className="h-5 w-5 text-blue-500" />
          <h3 className="font-bold text-white text-lg">Log Work Performance</h3>
        </div>
        {fetching && <Loader2 className="h-4 w-4 animate-spin text-muted" />}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Date Field */}
        <div className="flex flex-col space-y-1 md:col-span-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-[#888]">
            Log Date
          </label>
          <input
            type="date"
            {...register('date')}
            required
            className="rounded-lg border border-[#1f1f1f] bg-[#0c0c0c] px-4 py-2.5 text-sm text-white placeholder-neutral-600 outline-none focus:border-blue-500"
          />
        </div>

        {/* Deep Work Hours */}
        <div className="flex flex-col space-y-1">
          <label className="text-xs font-semibold uppercase tracking-wider text-[#888]">
            Deep Work Hours
          </label>
          <input
            type="number"
            step="0.5"
            placeholder="e.g. 4.5"
            onChange={(e) => setValue('deep_work_hours', e.target.value ? parseFloat(e.target.value) : null)}
            value={watch('deep_work_hours') ?? ''}
            className="rounded-lg border border-[#1f1f1f] bg-[#0c0c0c] px-4 py-2.5 text-sm text-white outline-none focus:border-blue-500"
          />
        </div>

        {/* Tasks Completed */}
        <div className="flex flex-col space-y-1">
          <label className="text-xs font-semibold uppercase tracking-wider text-[#888]">
            Tasks Completed
          </label>
          <input
            type="number"
            placeholder="e.g. 8"
            onChange={(e) => setValue('tasks_completed', e.target.value ? parseInt(e.target.value) : null)}
            value={watch('tasks_completed') ?? ''}
            className="rounded-lg border border-[#1f1f1f] bg-[#0c0c0c] px-4 py-2.5 text-sm text-white outline-none focus:border-blue-500"
          />
        </div>

        {/* Learning Hours */}
        <div className="flex flex-col space-y-1 md:col-span-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-[#888]">
            Learning & Research Hours
          </label>
          <input
            type="number"
            step="0.5"
            placeholder="e.g. 1.5"
            onChange={(e) => setValue('learning_hours', e.target.value ? parseFloat(e.target.value) : null)}
            value={watch('learning_hours') ?? ''}
            className="rounded-lg border border-[#1f1f1f] bg-[#0c0c0c] px-4 py-2.5 text-sm text-white outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* Weekly Goals Met Toggle */}
      <div className="flex items-center gap-3 bg-[#0c0c0c] p-4 rounded-lg border border-[#1f1f1f]">
        <input
          type="checkbox"
          id="weekly_goals_met"
          {...register('weekly_goals_met')}
          className="h-4.5 w-4.5 rounded accent-blue-500 cursor-pointer"
        />
        <label htmlFor="weekly_goals_met" className="flex items-center gap-2 text-sm font-bold text-white cursor-pointer select-none">
          <Target className="h-4 w-4 text-blue-400" />
          <span>Weekly Objectives / Goals Achieved</span>
        </label>
      </div>

      {/* Focus Slider */}
      <Controller
        name="focus_score"
        control={control}
        render={({ field }) => (
          <SliderInput
            label="Focus / Concentration Score"
            value={field.value}
            onChange={field.onChange}
            section="work"
          />
        )}
      />

      {/* Notes */}
      <div className="flex flex-col space-y-1">
        <label className="text-xs font-semibold uppercase tracking-wider text-[#888]">
          Work Log Notes / Blockers
        </label>
        <textarea
          rows={3}
          {...register('notes')}
          placeholder="Note down tasks completed, distractions, code bugs, or learnings..."
          className="rounded-lg border border-[#1f1f1f] bg-[#0c0c0c] px-4 py-2.5 text-sm text-white placeholder-neutral-600 outline-none focus:border-blue-500 resize-none"
        />
      </div>

      {errorMsg && (
        <div className="text-xs text-red-500 font-medium bg-red-950/15 border border-red-900/30 rounded p-2.5">
          {errorMsg}
        </div>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={handleClear}
          className="px-4 py-3 rounded-lg border border-[#1f1f1f] bg-[#0c0c0c] text-xs font-bold text-neutral-400 hover:text-white hover:bg-neutral-900 transition duration-200"
        >
          CLEAR
        </button>
        <button
          type="submit"
          disabled={loading || fetching}
          className={cn(
            "flex-1 rounded-lg py-3 text-xs font-bold transition duration-200 flex items-center justify-center gap-2",
            success 
              ? "bg-emerald-600 text-white hover:bg-emerald-500" 
              : "bg-blue-500 text-black hover:bg-blue-400 disabled:opacity-50 disabled:pointer-events-none"
          )}
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Logging progress...</span>
            </>
          ) : success ? (
            <>
              <Check className="h-4 w-4" />
              <span>SAVED SUCCESSFULLY!</span>
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              <span>SAVE DAILY LOGS</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}
