'use client';

import { useEffect, useState, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as zod from 'zod';
import { Book, Sun, Moon, Save, Loader2 } from 'lucide-react';
import { createSupabaseClient } from '@/lib/supabase-client';
import SliderInput from '../ui/SliderInput';
import { formatInputDate, formatDate } from '@/lib/utils';
import { cn } from '@/lib/utils';

const journalSchema = zod.object({
  date: zod.string(),
  type: zod.enum(['morning', 'night']),
  content: zod.string().min(1, 'Reflections cannot be empty'),
  wins: zod.string().optional(),
  mistakes: zod.string().optional(),
  mood: zod.number().min(1).max(10),
  progress_score: zod.number().min(1).max(10),
});

type JournalFormValues = zod.infer<typeof journalSchema>;

interface JournalFormProps {
  onSuccess?: () => void;
  initialType?: 'morning' | 'night';
}

export default function JournalForm({ onSuccess, initialType = 'morning' }: JournalFormProps) {
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const supabase = useMemo(() => createSupabaseClient(), []);
  const todayStr = formatInputDate(new Date());

  const { register, handleSubmit, control, watch, reset, setValue } = useForm<JournalFormValues>({
    resolver: zodResolver(journalSchema),
    defaultValues: {
      date: todayStr,
      type: initialType,
      content: '',
      wins: '',
      mistakes: '',
      mood: 5,
      progress_score: 5,
    },
  });

  const selectedDate = watch('date');
  const selectedType = watch('type');

  // Fetch journal entry if it exists for the selected date and type
  useEffect(() => {
    async function fetchEntry() {
      if (!selectedDate || !selectedType) return;
      setFetching(true);
      setErrorMsg(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('journal_entries')
        .select('*')
        .eq('date', selectedDate)
        .eq('type', selectedType)
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        setErrorMsg('Failed to load journal entry');
      } else if (data) {
        reset({
          date: selectedDate,
          type: selectedType,
          content: data.content || '',
          wins: data.wins || '',
          mistakes: data.mistakes || '',
          mood: data.mood ? Number(data.mood) : 5,
          progress_score: data.progress_score ? Number(data.progress_score) : 5,
        });
      } else {
        reset({
          date: selectedDate,
          type: selectedType,
          content: '',
          wins: '',
          mistakes: '',
          mood: 5,
          progress_score: 5,
        });
      }
      setFetching(false);
    }

    fetchEntry();
  }, [selectedDate, selectedType, reset, supabase]);

  const onSubmit = async (values: JournalFormValues) => {
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
      type: values.type,
      content: values.content,
      wins: values.wins || null,
      mistakes: values.mistakes || null,
      mood: values.mood,
      progress_score: values.progress_score,
    };

    // Upsert based on user_id, date, and type. 
    // Since unique constraint is not explicit in schema, we will first check if entry exists and update, or insert.
    // However, we can use a select and insert/update to be safe.
    const { data: existing } = await supabase
      .from('journal_entries')
      .select('id')
      .eq('user_id', user.id)
      .eq('date', values.date)
      .eq('type', values.type)
      .maybeSingle();

    let error;
    if (existing) {
      const { error: updateError } = await supabase
        .from('journal_entries')
        .update(payload)
        .eq('id', existing.id);
      error = updateError;
    } else {
      const { error: insertError } = await supabase
        .from('journal_entries')
        .insert(payload);
      error = insertError;
    }

    if (error) {
      setErrorMsg(error.message);
    } else {
      if (onSuccess) onSuccess();
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 bg-[#111111] p-6 rounded-xl border border-[#1f1f1f] shadow-lg">
      <input type="hidden" {...register('date')} />
      <input type="hidden" {...register('type')} />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#1f1f1f] pb-4 gap-4">
        <div className="flex items-center gap-2">
          <Book className="h-5 w-5 text-indigo-500 flex-shrink-0" />
          <div>
            <h3 className="font-bold text-white text-base leading-tight">Daily Reflection</h3>
            <p className="text-[10px] text-muted font-bold tracking-wider mt-0.5">
              DATE: {formatDate(selectedDate)}
            </p>
          </div>
          {fetching && <Loader2 className="h-4 w-4 animate-spin text-muted ml-1" />}
        </div>

        {/* Sleek Toggle Switcher */}
        <div className="flex bg-[#0c0c0c] border border-[#1f1f1f] rounded-lg p-0.5 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setValue('type', 'morning')}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-bold transition-all duration-200",
              selectedType === 'morning'
                ? "bg-[#1f160c] text-amber-500 border border-amber-500/20 shadow-sm"
                : "text-neutral-400 hover:text-white border border-transparent"
            )}
          >
            <Sun className="h-3.5 w-3.5" />
            <span>Morning</span>
          </button>
          <button
            type="button"
            onClick={() => setValue('type', 'night')}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-bold transition-all duration-200",
              selectedType === 'night'
                ? "bg-[#0f1124] text-indigo-500 border border-indigo-500/20 shadow-sm"
                : "text-neutral-400 hover:text-white border border-transparent"
            )}
          >
            <Moon className="h-3.5 w-3.5" />
            <span>Night</span>
          </button>
        </div>
      </div>

      {/* Main Journal Content */}
      <div className="flex flex-col space-y-1">
        <label className="text-xs font-semibold uppercase tracking-wider text-[#888]">
          {selectedType === 'morning' ? 'Intention & Focus for the Day' : 'Reflections & What Happened'}
        </label>
        <textarea
          rows={5}
          {...register('content')}
          required
          placeholder={selectedType === 'morning' 
            ? "What are you excited about? What is the main priority today?" 
            : "Review your day. How did it go? What did you achieve?"}
          className="rounded-lg border border-[#1f1f1f] bg-[#0c0c0c] px-4 py-2.5 text-sm text-white placeholder-neutral-600 outline-none focus:border-indigo-500 resize-none"
        />
      </div>

      {selectedType === 'night' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Wins */}
          <div className="flex flex-col space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
              Daily Wins (What went well)
            </label>
            <textarea
              rows={3}
              {...register('wins')}
              placeholder="1. Did a great workout&#10;2. Solved a tough coding bug..."
              className="rounded-lg border border-[#1f1f1f] bg-[#0c0c0c] px-4 py-2.5 text-sm text-white placeholder-neutral-600 outline-none focus:border-emerald-500 resize-none"
            />
          </div>

          {/* Mistakes */}
          <div className="flex flex-col space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wider text-rose-400">
              Mistakes / Improvements
            </label>
            <textarea
              rows={3}
              {...register('mistakes')}
              placeholder="1. Ate too much sugar&#10;2. Wasted time on YouTube..."
              className="rounded-lg border border-[#1f1f1f] bg-[#0c0c0c] px-4 py-2.5 text-sm text-white placeholder-neutral-600 outline-none focus:border-rose-500 resize-none"
            />
          </div>
        </div>
      )}

      {/* Slider inputs for Night reflection */}
      {selectedType === 'night' && (
        <div className="space-y-4 border-t border-[#1f1f1f] pt-4">
          <Controller
            name="mood"
            control={control}
            render={({ field }) => (
              <SliderInput
                label="Day Mood Rating"
                value={field.value}
                onChange={field.onChange}
                section="vision"
              />
            )}
          />

          <Controller
            name="progress_score"
            control={control}
            render={({ field }) => (
              <SliderInput
                label="Productivity / Progress Score"
                value={field.value}
                onChange={field.onChange}
                section="vision"
              />
            )}
          />
        </div>
      )}

      {errorMsg && (
        <div className="text-xs text-red-500 font-medium bg-red-950/15 border border-red-900/30 rounded p-2.5">
          {errorMsg}
        </div>
      )}

      <button
        type="submit"
        disabled={loading || fetching}
        className="w-full rounded-lg bg-indigo-500 py-3 text-sm font-bold text-black hover:bg-indigo-400 disabled:opacity-50 disabled:pointer-events-none transition duration-200 flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Saving entry...</span>
          </>
        ) : (
          <>
            <Save className="h-4 w-4" />
            <span>SAVE JOURNAL ENTRY</span>
          </>
        )}
      </button>
    </form>
  );
}
