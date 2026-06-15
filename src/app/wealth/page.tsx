'use client';

import { useEffect, useMemo, useState } from 'react';
import { 
  AreaChart, Area, 
  BarChart, Bar, 
  LineChart, Line, 
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend 
} from 'recharts';
import { DollarSign, TrendingUp, PiggyBank, Briefcase, Target, Loader2 } from 'lucide-react';
import { createSupabaseClient } from '@/lib/supabase-client';
import WealthForm from '@/components/modules/WealthForm';
import { formatUSD, formatInputDate } from '@/lib/utils';
import StatDelta from '@/components/ui/StatDelta';

export default function WealthPage() {
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<any[]>([]);
  const [goals, setGoals] = useState<any[]>([]);
  const [deltas, setDeltas] = useState({
    netWorth: 0,
    income: 0,
    expenses: 0,
  });

  const supabase = useMemo(() => createSupabaseClient(), []);

  const fetchWealthData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Fetch wealth logs
    const { data: wealthData, error: wealthErr } = await supabase
      .from('wealth_logs')
      .select('*')
      .eq('user_id', user.id)
      .order('month', { ascending: true });

    // Fetch wealth goals
    const { data: goalsData } = await supabase
      .from('goals')
      .select('*')
      .eq('user_id', user.id)
      .eq('category', 'wealth')
      .eq('status', 'active');

    if (!wealthErr && wealthData) {
      setLogs(wealthData);
      setGoals(goalsData || []);

      // Calculate Month-over-Month (MoM) Deltas
      if (wealthData.length >= 2) {
        const current = wealthData[wealthData.length - 1];
        const previous = wealthData[wealthData.length - 2];

        const calcDelta = (cur: number | null, prev: number | null) => {
          if (!prev || !cur) return 0;
          return ((cur - prev) / prev) * 100;
        };

        setDeltas({
          netWorth: calcDelta(current.net_worth, previous.net_worth),
          income: calcDelta(current.monthly_income, previous.monthly_income),
          expenses: calcDelta(current.expenses, previous.expenses),
        });
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchWealthData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Current values
  const currentLog = logs.length > 0 ? logs[logs.length - 1] : null;

  // Chart data formatting: format "YYYY-MM-01" to "MMM YY" (e.g. "Jun 26")
  const chartData = logs.map((log: any) => {
    const d = new Date(log.month);
    const label = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    const income = log.monthly_income ? Number(log.monthly_income) : 0;
    const savings = log.savings ? Number(log.savings) : 0;
    
    return {
      ...log,
      chartMonth: label,
      netWorthVal: log.net_worth ? Number(log.net_worth) : 0,
      incomeVal: income,
      expenseVal: log.expenses ? Number(log.expenses) : 0,
      savingsRate: income > 0 ? (savings / income) * 100 : 0,
    };
  });

  const customTooltipStyle = {
    contentStyle: { backgroundColor: '#111', borderColor: '#1f1f1f', borderRadius: '8px' },
    labelStyle: { color: '#888', fontSize: '12px', fontStyle: 'bold' },
    itemStyle: { color: '#fff', fontSize: '13px' }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Wealth Indicators Strip */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Net Worth */}
        <div className="base-card p-6 flex flex-col justify-between space-y-4 hover:border-violet-500 glow-wealth">
          <div className="flex justify-between items-center">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted">Net Worth</span>
            {deltas.netWorth !== 0 && (
              <StatDelta value={deltas.netWorth} type={deltas.netWorth >= 0 ? 'up' : 'down'} />
            )}
          </div>
          <h3 className="bg-gradient-to-r from-white via-neutral-200 to-neutral-400 bg-clip-text text-2xl font-black text-transparent">
            {currentLog ? formatUSD(currentLog.net_worth) : '$0'}
          </h3>
        </div>

        {/* Monthly Income */}
        <div className="base-card p-6 flex flex-col justify-between space-y-4 hover:border-violet-500 glow-wealth">
          <div className="flex justify-between items-center">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted">Monthly Income</span>
            {deltas.income !== 0 && (
              <StatDelta value={deltas.income} type={deltas.income >= 0 ? 'up' : 'down'} />
            )}
          </div>
          <h3 className="text-2xl font-black text-white">
            {currentLog ? formatUSD(currentLog.monthly_income) : '$0'}
          </h3>
        </div>

        {/* Expenses */}
        <div className="base-card p-6 flex flex-col justify-between space-y-4 hover:border-violet-500 glow-wealth">
          <div className="flex justify-between items-center">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted">Expenses</span>
            {deltas.expenses !== 0 && (
              <StatDelta value={deltas.expenses} type={deltas.expenses >= 0 ? 'down' : 'up'} /> // Lower expenses is positive
            )}
          </div>
          <h3 className="text-2xl font-black text-white">
            {currentLog ? formatUSD(currentLog.expenses) : '$0'}
          </h3>
        </div>

        {/* Savings */}
        <div className="base-card p-6 flex flex-col justify-between space-y-4 hover:border-violet-500 glow-wealth">
          <div className="flex justify-between items-center border-[#1f1f1f]">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted">Savings & Investments</span>
            <PiggyBank className="h-4 w-4 text-violet-400" />
          </div>
          <h3 className="text-2xl font-black text-white">
            {currentLog ? formatUSD(Number(currentLog.savings) + Number(currentLog.investments)) : '$0'}
          </h3>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Form & Goals */}
        <div className="space-y-6">
          <WealthForm onSuccess={fetchWealthData} />
          
          {/* Financial goals */}
          <div className="bg-[#111111] p-6 rounded-xl border border-[#1f1f1f] space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Target className="h-4 w-4 text-violet-400" />
              <span>Financial Objectives</span>
            </h3>
            
            {goals.length === 0 ? (
              <p className="text-xs text-muted">No active wealth goals set. Create a wealth category goal in Vision.</p>
            ) : (
              <div className="space-y-4">
                {goals.map((goal) => (
                  <div key={goal.id} className="space-y-2 bg-[#0c0c0c] border border-[#1f1f1f] p-4 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-white">{goal.title}</span>
                      <span className="text-xs font-bold text-violet-400">{goal.progress}%</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-[#1c1c1c] overflow-hidden">
                      <div className="h-full rounded-full bg-violet-500" style={{ width: `${goal.progress}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Charts */}
        <div className="lg:col-span-2 space-y-6">
          {loading ? (
            <div className="flex h-[400px] items-center justify-center text-xs text-muted gap-2 bg-[#111] border border-[#1f1f1f] rounded-xl">
              <Loader2 className="h-4 w-4 animate-spin text-violet-500" />
              <span>Recalculating ledger balances...</span>
            </div>
          ) : logs.length === 0 ? (
            <div className="flex h-[400px] items-center justify-center text-xs text-muted bg-[#111] border border-[#1f1f1f] rounded-xl">
              No data logged. Complete the form to view charts.
            </div>
          ) : (
            <div className="space-y-6">
              
              {/* Net Worth Chart */}
              <div className="bg-[#111] p-6 rounded-xl border border-[#1f1f1f]">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-violet-400" />
                  <span>Net Worth Progression</span>
                </h4>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <XAxis dataKey="chartMonth" stroke="#555" fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis stroke="#555" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(val) => `$${(val / 1000).toLocaleString()}k`} />
                      <Tooltip {...customTooltipStyle} formatter={(val) => [formatUSD(Number(val)), 'Net Worth']} />
                      <Area type="monotone" dataKey="netWorthVal" stroke="#8b5cf6" fill="rgba(139, 92, 246, 0.15)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Side-by-side: Income vs Expenses & Savings Rate */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Income vs Expenses */}
                <div className="bg-[#111] p-5 rounded-xl border border-[#1f1f1f]">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-4">Income vs Expenses</h4>
                  <div className="h-48 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData}>
                        <XAxis dataKey="chartMonth" stroke="#555" fontSize={10} tickLine={false} axisLine={false} />
                        <YAxis stroke="#555" fontSize={10} tickLine={false} axisLine={false} />
                        <Tooltip {...customTooltipStyle} formatter={(val) => formatUSD(Number(val))} />
                        <Bar dataKey="incomeVal" fill="#8b5cf6" radius={[2, 2, 0, 0]} name="Income" />
                        <Bar dataKey="expenseVal" fill="#1f1f1f" stroke="#222" radius={[2, 2, 0, 0]} name="Expenses" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Savings Rate */}
                <div className="bg-[#111] p-5 rounded-xl border border-[#1f1f1f]">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-4">Savings Rate %</h4>
                  <div className="h-48 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <XAxis dataKey="chartMonth" stroke="#555" fontSize={10} tickLine={false} axisLine={false} />
                        <YAxis stroke="#555" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(val) => `${val}%`} />
                        <Tooltip {...customTooltipStyle} formatter={(val) => [`${Number(val).toFixed(1)}%`, 'Savings Rate']} />
                        <Line type="monotone" dataKey="savingsRate" stroke="#8b5cf6" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
}
