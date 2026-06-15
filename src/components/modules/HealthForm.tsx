'use client';

import { useEffect, useState, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as zod from 'zod';
import { Heart, Dumbbell, Save, Loader2 } from 'lucide-react';
import { createSupabaseClient } from '@/lib/supabase-client';
import SliderInput from '../ui/SliderInput';
import { formatInputDate } from '@/lib/utils';

const healthSchema = zod.object({
  date: zod.string(),
  weight_kg: zod.number().min(0).nullable().optional(),
  body_fat_pct: zod.number().min(0).max(100).nullable().optional(),
  sleep_hours: zod.number().min(0).max(24).nullable().optional(),
  water_ml: zod.number().int().min(0).nullable().optional(),
  calories: zod.number().int().min(0).nullable().optional(),
  steps: zod.number().int().min(0).nullable().optional(),
  gym_workout: zod.boolean(),
  mood: zod.number().min(1).max(10),
  energy: zod.number().min(1).max(10),
  notes: zod.string().optional(),
});

type HealthFormValues = zod.infer<typeof healthSchema>;

interface HealthFormProps {
  onSuccess?: () => void;
}

export default function HealthForm({ onSuccess }: HealthFormProps) {
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const supabase = useMemo(() => createSupabaseClient(), []);
  const todayStr = formatInputDate(new Date());

  const { register, handleSubmit, control, watch, reset, setValue } = useForm<HealthFormValues>({
    resolver: zodResolver(healthSchema),
    defaultValues: {
      date: todayStr,
      weight_kg: null,
      body_fat_pct: null,
      sleep_hours: null,
      water_ml: null,
      calories: null,
      steps: null,
      gym_workout: false,
      mood: 5,
      energy: 5,
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
        .from('health_logs')
        .select('*')
        .eq('date', selectedDate)
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        setErrorMsg('Failed to load logs for date');
      } else if (data) {
        // Pre-populate
        reset({
          date: selectedDate,
          weight_kg: data.weight_kg ? Number(data.weight_kg) : null,
          body_fat_pct: data.body_fat_pct ? Number(data.body_fat_pct) : null,
          sleep_hours: data.sleep_hours ? Number(data.sleep_hours) : null,
          water_ml: data.water_ml ? Number(data.water_ml) : null,
          calories: data.calories ? Number(data.calories) : null,
          steps: data.steps ? Number(data.steps) : null,
          gym_workout: !!data.gym_workout,
          mood: data.mood ? Number(data.mood) : 5,
          energy: data.energy ? Number(data.energy) : 5,
          notes: data.notes || '',
        });
      } else {
        // Reset to empty for that date
        reset({
          date: selectedDate,
          weight_kg: null,
          body_fat_pct: null,
          sleep_hours: null,
          water_ml: null,
          calories: null,
          steps: null,
          gym_workout: false,
          mood: 5,
          energy: 5,
          notes: '',
        });
      }
      setFetching(false);
    }

    fetchLog();
  }, [selectedDate, reset, supabase]);

  const onSubmit = async (values: HealthFormValues) => {
    setLoading(true);
    setErrorMsg(null);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setErrorMsg('User not authenticated');
      setLoading(false);
      return;
    }

    // Clean payload: empty strings -> null
    const payload = {
      user_id: user.id,
      date: values.date,
      weight_kg: values.weight_kg !== undefined ? values.weight_kg : null,
      body_fat_pct: values.body_fat_pct !== undefined ? values.body_fat_pct : null,
      sleep_hours: values.sleep_hours !== undefined ? values.sleep_hours : null,
      water_ml: values.water_ml !== undefined ? values.water_ml : null,
      calories: values.calories !== undefined ? values.calories : null,
      steps: values.steps !== undefined ? values.steps : null,
      gym_workout: values.gym_workout,
      mood: values.mood,
      energy: values.energy,
      notes: values.notes || null,
    };

    // Check if record exists to update, or insert
    const { error } = await supabase
      .from('health_logs')
      .upsert(payload, { onConflict: 'user_id,date' });

    if (error) {
      setErrorMsg(error.message);
    } else {
      if (onSuccess) onSuccess();
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 bg-[#111111] p-6 rounded-xl border border-[#1f1f1f] shadow-lg">
      <div className="flex items-center justify-between border-b border-[#1f1f1f] pb-4">
        <div className="flex items-center gap-2">
          <Heart className="h-5 w-5 text-emerald-500" />
          <h3 className="font-bold text-white text-lg">Log Vitals</h3>
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
            className="rounded-lg border border-[#1f1f1f] bg-[#0c0c0c] px-4 py-2.5 text-sm text-white placeholder-neutral-600 outline-none focus:border-emerald-500"
          />
        </div>

        {/* Weight Field */}
        <div className="flex flex-col space-y-1">
          <label className="text-xs font-semibold uppercase tracking-wider text-[#888]">
            Weight (kg)
          </label>
          <input
            type="number"
            step="0.1"
            placeholder="e.g. 78.5"
            onChange={(e) => setValue('weight_kg', e.target.value ? parseFloat(e.target.value) : null)}
            value={watch('weight_kg') ?? ''}
            className="rounded-lg border border-[#1f1f1f] bg-[#0c0c0c] px-4 py-2.5 text-sm text-white outline-none focus:border-emerald-500"
          />
        </div>

        {/* Body Fat Field */}
        <div className="flex flex-col space-y-1">
          <label className="text-xs font-semibold uppercase tracking-wider text-[#888]">
            Body Fat %
          </label>
          <input
            type="number"
            step="0.1"
            placeholder="e.g. 15.4"
            onChange={(e) => setValue('body_fat_pct', e.target.value ? parseFloat(e.target.value) : null)}
            value={watch('body_fat_pct') ?? ''}
            className="rounded-lg border border-[#1f1f1f] bg-[#0c0c0c] px-4 py-2.5 text-sm text-white outline-none focus:border-emerald-500"
          />
        </div>

        {/* Sleep Hours Field */}
        <div className="flex flex-col space-y-1">
          <label className="text-xs font-semibold uppercase tracking-wider text-[#888]">
            Sleep Hours
          </label>
          <input
            type="number"
            step="0.5"
            placeholder="e.g. 7.5"
            onChange={(e) => setValue('sleep_hours', e.target.value ? parseFloat(e.target.value) : null)}
            value={watch('sleep_hours') ?? ''}
            className="rounded-lg border border-[#1f1f1f] bg-[#0c0c0c] px-4 py-2.5 text-sm text-white outline-none focus:border-emerald-500"
          />
        </div>

        {/* Water Intake Field */}
        <div className="flex flex-col space-y-1">
          <label className="text-xs font-semibold uppercase tracking-wider text-[#888]">
            Water (ml)
          </label>
          <input
            type="number"
            placeholder="e.g. 2500"
            onChange={(e) => setValue('water_ml', e.target.value ? parseInt(e.target.value) : null)}
            value={watch('water_ml') ?? ''}
            className="rounded-lg border border-[#1f1f1f] bg-[#0c0c0c] px-4 py-2.5 text-sm text-white outline-none focus:border-emerald-500"
          />
        </div>

        {/* Calories Field */}
        <div className="flex flex-col space-y-1">
          <label className="text-xs font-semibold uppercase tracking-wider text-[#888]">
            Calories (kcal)
          </label>
          <input
            type="number"
            placeholder="e.g. 2100"
            onChange={(e) => setValue('calories', e.target.value ? parseInt(e.target.value) : null)}
            value={watch('calories') ?? ''}
            className="rounded-lg border border-[#1f1f1f] bg-[#0c0c0c] px-4 py-2.5 text-sm text-white outline-none focus:border-emerald-500"
          />
        </div>

        {/* Steps Field */}
        <div className="flex flex-col space-y-1">
          <label className="text-xs font-semibold uppercase tracking-wider text-[#888]">
            Steps Taken
          </label>
          <input
            type="number"
            placeholder="e.g. 10000"
            onChange={(e) => setValue('steps', e.target.value ? parseInt(e.target.value) : null)}
            value={watch('steps') ?? ''}
            className="rounded-lg border border-[#1f1f1f] bg-[#0c0c0c] px-4 py-2.5 text-sm text-white outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Gym Workout Toggle */}
      <div className="flex items-center gap-3 bg-[#0c0c0c] p-4 rounded-lg border border-[#1f1f1f]">
        <input
          type="checkbox"
          id="gym_workout"
          {...register('gym_workout')}
          className="h-4.5 w-4.5 rounded accent-emerald-500 cursor-pointer"
        />
        <label htmlFor="gym_workout" className="flex items-center gap-2 text-sm font-bold text-white cursor-pointer select-none">
          <Dumbbell className="h-4 w-4 text-emerald-400" />
          <span>Gym Workout Session Completed</span>
        </label>
      </div>

      {/* Sliders */}
      <div className="space-y-4">
        <Controller
          name="mood"
          control={control}
          render={({ field }) => (
            <SliderInput
              label="Today's Mood"
              value={field.value}
              onChange={field.onChange}
              section="health"
            />
          )}
        />

        <Controller
          name="energy"
          control={control}
          render={({ field }) => (
            <SliderInput
              label="Today's Energy Level"
              value={field.value}
              onChange={field.onChange}
              section="health"
            />
          )}
        />
      </div>

      {/* Notes */}
      <div className="flex flex-col space-y-1">
        <label className="text-xs font-semibold uppercase tracking-wider text-[#888]">
          Daily Context / Notes
        </label>
        <textarea
          rows={3}
          {...register('notes')}
          placeholder="Log gym focus, meal info, or physical symptoms..."
          className="rounded-lg border border-[#1f1f1f] bg-[#0c0c0c] px-4 py-2.5 text-sm text-white placeholder-neutral-600 outline-none focus:border-emerald-500 resize-none"
        />
      </div>

      {errorMsg && (
        <div className="text-xs text-red-500 font-medium bg-red-950/15 border border-red-900/30 rounded p-2.5">
          {errorMsg}
        </div>
      )}

      <button
        type="submit"
        disabled={loading || fetching}
        className="w-full rounded-lg bg-emerald-500 py-3 text-sm font-bold text-black hover:bg-emerald-400 disabled:opacity-50 disabled:pointer-events-none transition duration-200 flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Saving vitals...</span>
          </>
        ) : (
          <>
            <Save className="h-4 w-4" />
            <span>SAVE DAILY VITALS</span>
          </>
        )}
      </button>
    </form>
  );
}
