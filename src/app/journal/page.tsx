'use client';

import { useEffect, useMemo, useState } from 'react';
import { 
  AreaChart, Area, 
  XAxis, YAxis, Tooltip, ResponsiveContainer 
} from 'recharts';
import { Book, Search, Calendar, Sun, Moon, Loader2 } from 'lucide-react';
import { createSupabaseClient } from '@/lib/supabase-client';
import { formatInputDate, formatDate } from '@/lib/utils';
import JournalForm from '@/components/modules/JournalForm';
import { cn } from '@/lib/utils';

interface JournalEntry {
  id: string;
  date: string;
  type: 'morning' | 'night';
  content: string;
  wins: string | null;
  mistakes: string | null;
  mood: number | null;
  progress_score: number | null;
}

export default function JournalPage() {
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // States to pass down to form to force a reload / edit
  const [selectedDate, setSelectedDate] = useState(formatInputDate(new Date()));
  const [selectedType, setSelectedType] = useState<'morning' | 'night'>('morning');
  const [formKey, setFormKey] = useState(0); // Incrementing this forces form re-render

  const supabase = useMemo(() => createSupabaseClient(), []);

  const fetchJournalData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('journal_entries')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .order('type', { ascending: false });

    if (!error && data) {
      setEntries(data as JournalEntry[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchJournalData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleEntrySelect = (date: string, type: 'morning' | 'night') => {
    setSelectedDate(date);
    setSelectedType(type);
    setFormKey(prev => prev + 1); // Trigger form component reset
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Filter entries based on search
  const filteredEntries = entries.filter(entry => {
    const q = searchQuery.toLowerCase();
    return (
      entry.content.toLowerCase().includes(q) ||
      (entry.wins && entry.wins.toLowerCase().includes(q)) ||
      (entry.mistakes && entry.mistakes.toLowerCase().includes(q)) ||
      entry.date.includes(q)
    );
  });

  // Prepare chart data (mood trend, chronological order, limit last 30)
  const chartData = [...entries]
    .filter(e => e.mood !== null)
    .slice(0, 30)
    .reverse()
    .map(entry => {
      const parts = entry.date.split('-');
      const label = parts.length === 3 ? `${parts[2]}/${parts[1]}` : entry.date;
      return {
        dateLabel: label,
        mood: entry.mood,
        progress: entry.progress_score,
      };
    });

  const customTooltipStyle = {
    contentStyle: { backgroundColor: '#111', borderColor: '#1f1f1f', borderRadius: '8px' },
    labelStyle: { color: '#888', fontSize: '12px', fontWeight: 'bold' },
    itemStyle: { color: '#fff', fontSize: '13px' }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Title */}
      <div className="bg-[#111] border border-[#1f1f1f] p-6 rounded-xl">
        <h1 className="text-xl font-black text-white tracking-wide uppercase">DEEP JOURNAL</h1>
        <p className="text-xs text-secondary mt-0.5">Dual-mode morning alignment and nightly retrospective logs.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left column: Journal form (takes 1 col, standard format) */}
        <div className="space-y-6">
          <JournalForm 
            key={`${selectedDate}-${selectedType}-${formKey}`} 
            onSuccess={fetchJournalData} 
            initialType={selectedType}
          />
        </div>

        {/* Right columns: Mood Trend & Search History (takes 2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Mood Trend Chart */}
          <div className="bg-[#111111] p-6 rounded-xl border border-[#1f1f1f] shadow-lg">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-indigo-400" />
              <span>Mood & Progress History (Last 30 Logs)</span>
            </h3>

            {chartData.length === 0 ? (
              <p className="text-xs text-muted py-12 text-center">No data logged. Write night reflections to generate mood charts.</p>
            ) : (
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <XAxis dataKey="dateLabel" stroke="#555" fontSize={9} tickLine={false} axisLine={false} />
                    <YAxis stroke="#555" fontSize={9} domain={[1, 10]} tickLine={false} axisLine={false} />
                    <Tooltip {...customTooltipStyle} />
                    <Area type="monotone" dataKey="mood" stroke="#6366f1" fill="rgba(99, 102, 241, 0.1)" strokeWidth={2} name="Mood" />
                    <Area type="monotone" dataKey="progress" stroke="#3b82f6" fill="rgba(59, 130, 246, 0.03)" strokeWidth={2} name="Progress" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Search Logs & History */}
          <div className="bg-[#111111] p-6 rounded-xl border border-[#1f1f1f] space-y-4 shadow-lg flex flex-col min-h-[400px]">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#1f1f1f] pb-3">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Historical reflections</h3>
              
              {/* Search Bar */}
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#555]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search contents, wins, dates..."
                  className="w-full rounded-lg border border-[#1f1f1f] bg-[#0c0c0c] pl-9 pr-4 py-2 text-xs text-white placeholder-neutral-600 outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Logs List */}
            {loading ? (
              <div className="flex-1 flex items-center justify-center text-xs text-muted gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
                <span>Reading archives...</span>
              </div>
            ) : filteredEntries.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-xs text-muted py-12">
                No entries match your search query
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto max-h-[400px] space-y-4 pr-1">
                {filteredEntries.map((entry) => {
                  const isMorning = entry.type === 'morning';
                  return (
                    <div 
                      key={entry.id} 
                      onClick={() => handleEntrySelect(entry.date, entry.type)}
                      className="group bg-[#0c0c0c] border border-[#1f1f1f] hover:border-neutral-700 p-4 rounded-lg cursor-pointer transition duration-200 space-y-3"
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white">{formatDate(entry.date)}</span>
                          <span className={cn(
                            "text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border flex items-center gap-1",
                            isMorning 
                              ? "bg-amber-950/20 text-amber-400 border-amber-900/30" 
                              : "bg-indigo-950/20 text-indigo-400 border-indigo-900/30"
                          )}>
                            {isMorning ? <Sun className="h-2.5 w-2.5" /> : <Moon className="h-2.5 w-2.5" />}
                            <span>{entry.type}</span>
                          </span>
                        </div>

                        {entry.mood && (
                          <div className="text-[10px] text-muted">
                            Mood: <span className="font-bold text-indigo-400">{entry.mood}/10</span>
                          </div>
                        )}
                      </div>

                      <p className="text-xs text-neutral-300 whitespace-pre-wrap line-clamp-3">{entry.content}</p>

                      {/* Display Wins/Mistakes if they exist on cards */}
                      {!isMorning && (entry.wins || entry.mistakes) && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[10px] border-t border-[#1f1f1f]/50 pt-2 group-hover:border-neutral-800 transition">
                          {entry.wins && (
                            <div>
                              <span className="text-emerald-400 font-bold block uppercase tracking-wider">Wins</span>
                              <p className="text-neutral-400 line-clamp-1 mt-0.5">{entry.wins}</p>
                            </div>
                          )}
                          {entry.mistakes && (
                            <div>
                              <span className="text-rose-400 font-bold block uppercase tracking-wider">Mistakes</span>
                              <p className="text-neutral-400 line-clamp-1 mt-0.5">{entry.mistakes}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
