'use client';

import { useEffect, useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as zod from 'zod';
import { DollarSign, Save, Loader2, Check } from 'lucide-react';
import { createSupabaseClient } from '@/lib/supabase-client';
import { cn } from '@/lib/utils';

const wealthSchema = zod.object({
  month: zod.string(), // Format: YYYY-MM
  net_worth: zod.number().nullable().optional(),
  monthly_income: zod.number().min(0).nullable().optional(),
  business_revenue: zod.number().min(0).nullable().optional(),
  savings: zod.number().min(0).nullable().optional(),
  investments: zod.number().min(0).nullable().optional(),
  expenses: zod.number().min(0).nullable().optional(),
  notes: zod.string().optional(),
});

type WealthFormValues = zod.infer<typeof wealthSchema>;

interface WealthFormProps {
  onSuccess?: () => void;
}

export default function WealthForm({ onSuccess }: WealthFormProps) {
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const supabase = useMemo(() => createSupabaseClient(), []);
  const currentMonthStr = (() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    return `${yyyy}-${mm}`;
  })();

  const { register, handleSubmit, watch, reset, setValue } = useForm<WealthFormValues>({
    resolver: zodResolver(wealthSchema),
    defaultValues: {
      month: currentMonthStr,
      net_worth: null,
      monthly_income: null,
      business_revenue: null,
      savings: null,
      investments: null,
      expenses: null,
      notes: '',
    },
  });

  const selectedMonth = watch('month');

  // Fetch wealth log if it exists for the selected month
  useEffect(() => {
    async function fetchLog() {
      if (!selectedMonth) return;
      setFetching(true);
      setErrorMsg(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Database month is stored as date, convert YYYY-MM to YYYY-MM-01
      const dbDate = `${selectedMonth}-01`;

      const { data, error } = await supabase
        .from('wealth_logs')
        .select('*')
        .eq('month', dbDate)
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        setErrorMsg('Failed to load logs for this month');
      } else if (data) {
        reset({
          month: selectedMonth,
          net_worth: data.net_worth ? Number(data.net_worth) : null,
          monthly_income: data.monthly_income ? Number(data.monthly_income) : null,
          business_revenue: data.business_revenue ? Number(data.business_revenue) : null,
          savings: data.savings ? Number(data.savings) : null,
          investments: data.investments ? Number(data.investments) : null,
          expenses: data.expenses ? Number(data.expenses) : null,
          notes: data.notes || '',
        });
      } else {
        reset({
          month: selectedMonth,
          net_worth: null,
          monthly_income: null,
          business_revenue: null,
          savings: null,
          investments: null,
          expenses: null,
          notes: '',
        });
      }
      setFetching(false);
    }

    fetchLog();
  }, [selectedMonth, reset, supabase]);

  const onSubmit = async (values: WealthFormValues) => {
    setLoading(true);
    setErrorMsg(null);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setErrorMsg('User not authenticated');
      setLoading(false);
      return;
    }

    // Convert YYYY-MM to YYYY-MM-01
    const dbDate = `${values.month}-01`;

    const payload = {
      user_id: user.id,
      month: dbDate,
      net_worth: values.net_worth !== undefined ? values.net_worth : null,
      monthly_income: values.monthly_income !== undefined ? values.monthly_income : null,
      business_revenue: values.business_revenue !== undefined ? values.business_revenue : null,
      savings: values.savings !== undefined ? values.savings : null,
      investments: values.investments !== undefined ? values.investments : null,
      expenses: values.expenses !== undefined ? values.expenses : null,
      notes: values.notes || null,
    };

    const { error } = await supabase
      .from('wealth_logs')
      .upsert(payload, { onConflict: 'user_id,month' });

    if (error) {
      setErrorMsg(error.message);
    } else {
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      if (onSuccess) onSuccess();
    }
    setLoading(false);
  };

  const handleClear = () => {
    reset({
      month: selectedMonth,
      net_worth: null,
      monthly_income: null,
      business_revenue: null,
      savings: null,
      investments: null,
      expenses: null,
      notes: '',
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 bg-[#111111] p-6 rounded-xl border border-[#1f1f1f] shadow-lg">
      <div className="flex items-center justify-between border-b border-[#1f1f1f] pb-4">
        <div className="flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-violet-500" />
          <h3 className="font-bold text-white text-lg">Log Wealth Metrics</h3>
        </div>
        {fetching && <Loader2 className="h-4 w-4 animate-spin text-muted" />}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Month Selector */}
        <div className="flex flex-col space-y-1 md:col-span-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-[#888]">
            Log Month
          </label>
          <input
            type="month"
            {...register('month')}
            required
            className="rounded-lg border border-[#1f1f1f] bg-[#0c0c0c] px-4 py-2.5 text-sm text-white placeholder-neutral-600 outline-none focus:border-violet-500"
          />
        </div>

        {/* Net Worth */}
        <div className="flex flex-col space-y-1">
          <label className="text-xs font-semibold uppercase tracking-wider text-[#888]">
            Net Worth ($)
          </label>
          <input
            type="number"
            placeholder="e.g. 5000000"
            onChange={(e) => setValue('net_worth', e.target.value ? parseFloat(e.target.value) : null)}
            value={watch('net_worth') ?? ''}
            className="rounded-lg border border-[#1f1f1f] bg-[#0c0c0c] px-4 py-2.5 text-sm text-white outline-none focus:border-violet-500"
          />
        </div>

        {/* Monthly Income */}
        <div className="flex flex-col space-y-1">
          <label className="text-xs font-semibold uppercase tracking-wider text-[#888]">
            Monthly Income ($)
          </label>
          <input
            type="number"
            placeholder="e.g. 250000"
            onChange={(e) => setValue('monthly_income', e.target.value ? parseFloat(e.target.value) : null)}
            value={watch('monthly_income') ?? ''}
            className="rounded-lg border border-[#1f1f1f] bg-[#0c0c0c] px-4 py-2.5 text-sm text-white outline-none focus:border-violet-500"
          />
        </div>

        {/* Business Revenue */}
        <div className="flex flex-col space-y-1">
          <label className="text-xs font-semibold uppercase tracking-wider text-[#888]">
            Business Revenue ($)
          </label>
          <input
            type="number"
            placeholder="e.g. 150000"
            onChange={(e) => setValue('business_revenue', e.target.value ? parseFloat(e.target.value) : null)}
            value={watch('business_revenue') ?? ''}
            className="rounded-lg border border-[#1f1f1f] bg-[#0c0c0c] px-4 py-2.5 text-sm text-white outline-none focus:border-violet-500"
          />
        </div>

        {/* Savings */}
        <div className="flex flex-col space-y-1">
          <label className="text-xs font-semibold uppercase tracking-wider text-[#888]">
            Monthly Savings ($)
          </label>
          <input
            type="number"
            placeholder="e.g. 50000"
            onChange={(e) => setValue('savings', e.target.value ? parseFloat(e.target.value) : null)}
            value={watch('savings') ?? ''}
            className="rounded-lg border border-[#1f1f1f] bg-[#0c0c0c] px-4 py-2.5 text-sm text-white outline-none focus:border-violet-500"
          />
        </div>

        {/* Investments */}
        <div className="flex flex-col space-y-1">
          <label className="text-xs font-semibold uppercase tracking-wider text-[#888]">
            Total Investments ($)
          </label>
          <input
            type="number"
            placeholder="e.g. 1200000"
            onChange={(e) => setValue('investments', e.target.value ? parseFloat(e.target.value) : null)}
            value={watch('investments') ?? ''}
            className="rounded-lg border border-[#1f1f1f] bg-[#0c0c0c] px-4 py-2.5 text-sm text-white outline-none focus:border-violet-500"
          />
        </div>

        {/* Expenses */}
        <div className="flex flex-col space-y-1">
          <label className="text-xs font-semibold uppercase tracking-wider text-[#888]">
            Monthly Expenses ($)
          </label>
          <input
            type="number"
            placeholder="e.g. 100000"
            onChange={(e) => setValue('expenses', e.target.value ? parseFloat(e.target.value) : null)}
            value={watch('expenses') ?? ''}
            className="rounded-lg border border-[#1f1f1f] bg-[#0c0c0c] px-4 py-2.5 text-sm text-white outline-none focus:border-violet-500"
          />
        </div>
      </div>

      {/* Notes */}
      <div className="flex flex-col space-y-1">
        <label className="text-xs font-semibold uppercase tracking-wider text-[#888]">
          Financial Context / Notes
        </label>
        <textarea
          rows={3}
          {...register('notes')}
          placeholder="Note down major purchases, asset shifts, or new business contracts..."
          className="rounded-lg border border-[#1f1f1f] bg-[#0c0c0c] px-4 py-2.5 text-sm text-white placeholder-neutral-600 outline-none focus:border-violet-500 resize-none"
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
              : "bg-violet-500 text-black hover:bg-violet-400 disabled:opacity-50 disabled:pointer-events-none"
          )}
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Saving ledger...</span>
            </>
          ) : success ? (
            <>
              <Check className="h-4 w-4" />
              <span>SAVED SUCCESSFULLY!</span>
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              <span>SAVE MONTHLY LEDGER</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}
