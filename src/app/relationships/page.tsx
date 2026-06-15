'use client';

import { useEffect, useMemo, useState } from 'react';
import { Users, Calendar, Plus, Trash2, Heart, MessageSquare, Loader2, Sparkles } from 'lucide-react';
import { createSupabaseClient } from '@/lib/supabase-client';
import { formatInputDate, formatDate } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface Person {
  id: string;
  name: string;
  relationship_type: 'family' | 'friend' | 'professional' | 'partner' | 'other';
  last_interaction_date: string | null;
  notes: string | null;
  birthday: string | null;
  anniversary: string | null;
}

export default function RelationshipsPage() {
  const [loading, setLoading] = useState(true);
  const [people, setPeople] = useState<Person[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [relationshipType, setRelationshipType] = useState<Person['relationship_type']>('friend');
  const [lastInteractionDate, setLastInteractionDate] = useState('');
  const [birthday, setBirthday] = useState('');
  const [anniversary, setAnniversary] = useState('');
  const [notes, setNotes] = useState('');

  const supabase = useMemo(() => createSupabaseClient(), []);
  const todayStr = formatInputDate(new Date());

  const fetchPeopleData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('people')
      .select('*')
      .eq('user_id', user.id)
      .order('name', { ascending: true });

    setPeople(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchPeopleData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSavePerson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const payload = {
      user_id: user.id,
      name,
      relationship_type: relationshipType,
      last_interaction_date: lastInteractionDate || null,
      birthday: birthday || null,
      anniversary: anniversary || null,
      notes: notes || null,
    };

    await supabase.from('people').insert(payload);

    setName('');
    setRelationshipType('friend');
    setLastInteractionDate('');
    setBirthday('');
    setAnniversary('');
    setNotes('');
    setShowForm(false);
    setSaving(false);
    fetchPeopleData();
  };

  const handleLogInteraction = async (personId: string) => {
    // Optimistic Update
    setPeople(prev => prev.map(p => p.id === personId ? { ...p, last_interaction_date: todayStr } : p));

    await supabase
      .from('people')
      .update({ last_interaction_date: todayStr })
      .eq('id', personId);

    fetchPeopleData();
  };

  const handleDeletePerson = async (personId: string) => {
    if (!confirm('Are you sure you want to delete this contact?')) return;
    await supabase.from('people').delete().eq('id', personId);
    fetchPeopleData();
  };

  // Calculate upcoming birthdays & anniversaries
  const getUpcomingEvents = () => {
    const events: { name: string; type: string; dateStr: string; daysRemaining: number }[] = [];
    const today = new Date();

    people.forEach(p => {
      const checkEvent = (dateField: string | null, label: string) => {
        if (!dateField) return;
        const eventDate = new Date(dateField);
        const nextEvent = new Date(today.getFullYear(), eventDate.getMonth(), eventDate.getDate());
        
        // If date has passed this year, look at next year
        if (nextEvent.getTime() < today.getTime() - 24 * 60 * 60 * 1000) {
          nextEvent.setFullYear(today.getFullYear() + 1);
        }

        const diffTime = nextEvent.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        // Show events within next 60 days
        if (diffDays >= 0 && diffDays <= 60) {
          events.push({
            name: p.name,
            type: label,
            dateStr: eventDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            daysRemaining: diffDays,
          });
        }
      };

      checkEvent(p.birthday, 'Birthday');
      checkEvent(p.anniversary, 'Anniversary');
    });

    return events.sort((a, b) => a.daysRemaining - b.daysRemaining);
  };

  const upcomingEvents = getUpcomingEvents();

  const relationshipColors = {
    family: 'text-emerald-400 bg-emerald-950/20 border-emerald-900/30',
    friend: 'text-amber-400 bg-amber-950/20 border-amber-900/30',
    partner: 'text-rose-400 bg-rose-950/20 border-rose-900/30',
    professional: 'text-blue-400 bg-blue-950/20 border-blue-900/30',
    other: 'text-neutral-400 bg-neutral-900/40 border-neutral-800',
  };

  const getContactGlowClass = (type: Person['relationship_type']) => {
    if (type === 'family') return 'border-emerald-950/20 hover:border-emerald-500 glow-health';
    if (type === 'partner') return 'border-rose-950/20 hover:border-rose-500 glow-relationships';
    if (type === 'professional') return 'border-blue-950/20 hover:border-blue-500 glow-work';
    if (type === 'friend') return 'border-amber-950/20 hover:border-amber-500 glow-growth';
    return 'border-indigo-950/20 hover:border-indigo-500 glow-vision';
  };

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center text-xs text-muted gap-2">
        <Loader2 className="h-4 w-4 animate-spin text-rose-500" />
        <span>Loading contacts ledger...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Title Block */}
      <div className="flex justify-between items-center bg-[#111] border border-[#1f1f1f] p-6 rounded-xl">
        <div>
          <h1 className="text-xl font-black text-white tracking-wide uppercase">RELATIONSHIP CRM</h1>
          <p className="text-xs text-secondary mt-0.5">Nurture connections, log conversations, map milestones.</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="rounded-lg bg-white px-4 py-2.5 text-xs font-bold text-black hover:bg-neutral-200 flex items-center gap-1.5 transition"
        >
          <Plus className="h-4 w-4" />
          <span>ADD CONTACT</span>
        </button>
      </div>

      {/* Add Contact form */}
      {showForm && (
        <form onSubmit={handleSavePerson} className="bg-[#111] border border-[#1f1f1f] p-6 rounded-xl max-w-lg space-y-4 shadow-lg">
          <h3 className="font-bold text-white text-sm">ADD CONNECTION</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted">Full Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Awais Ahmad..."
                className="rounded-lg border border-[#1f1f1f] bg-[#0c0c0c] px-4 py-2.5 text-sm text-white placeholder-neutral-600 outline-none focus:border-rose-500"
              />
            </div>
            <div className="flex flex-col space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted">Relationship Type</label>
              <select
                value={relationshipType}
                onChange={(e) => setRelationshipType(e.target.value as any)}
                className="rounded-lg border border-[#1f1f1f] bg-[#0c0c0c] px-4 py-2.5 text-sm text-white outline-none focus:border-rose-500"
              >
                <option value="friend">Friend</option>
                <option value="family">Family member</option>
                <option value="partner">Partner</option>
                <option value="professional">Professional Network</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="flex flex-col space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted">Last Contact Date</label>
              <input
                type="date"
                value={lastInteractionDate}
                onChange={(e) => setLastInteractionDate(e.target.value)}
                className="rounded-lg border border-[#1f1f1f] bg-[#0c0c0c] px-4 py-2.5 text-sm text-white outline-none focus:border-rose-500"
              />
            </div>
            <div className="flex flex-col space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted">Birthday</label>
              <input
                type="date"
                value={birthday}
                onChange={(e) => setBirthday(e.target.value)}
                className="rounded-lg border border-[#1f1f1f] bg-[#0c0c0c] px-4 py-2.5 text-sm text-white outline-none focus:border-rose-500"
              />
            </div>
            <div className="flex flex-col space-y-1 md:col-span-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted">Anniversary</label>
              <input
                type="date"
                value={anniversary}
                onChange={(e) => setAnniversary(e.target.value)}
                className="rounded-lg border border-[#1f1f1f] bg-[#0c0c0c] px-4 py-2.5 text-sm text-white outline-none focus:border-rose-500"
              />
            </div>
            <div className="flex flex-col space-y-1 md:col-span-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted">Personal Notes</label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Interests, family info, or context for networking..."
                className="rounded-lg border border-[#1f1f1f] bg-[#0c0c0c] px-4 py-2 text-sm text-white outline-none focus:border-rose-500 resize-none"
              />
            </div>
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
              disabled={saving}
              className="flex-1 rounded-lg bg-white py-2 text-xs font-bold text-black hover:bg-neutral-200"
            >
              {saving ? 'SAVING...' : 'SAVE CONTACT'}
            </button>
          </div>
        </form>
      )}

      {/* Main CRM area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left/Middle: Contact List */}
        <div className="lg:col-span-2 space-y-6">
          {people.length === 0 ? (
            <div className="bg-[#111] p-12 rounded-xl border border-[#1f1f1f] text-center text-xs text-muted">
              No contacts logged yet. Click "Add Contact" to build your CRM.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {people.map((person) => {
                const badgeColor = relationshipColors[person.relationship_type] || relationshipColors.other;
                const glowClass = getContactGlowClass(person.relationship_type);

                return (
                  <div key={person.id} className={cn("base-card p-5 flex flex-col justify-between space-y-4 shadow-sm", glowClass)}>
                    <div className="space-y-2">
                      <div className="flex justify-between items-start">
                        <h4 className="font-bold text-white text-base">{person.name}</h4>
                        <span className={cn("text-[9px] uppercase font-bold px-2 py-0.5 rounded border", badgeColor)}>
                          {person.relationship_type}
                        </span>
                      </div>
                      
                      {person.notes && <p className="text-[11px] text-secondary line-clamp-2">{person.notes}</p>}
                    </div>

                    <div className="border-t border-[#1f1f1f]/50 pt-3 flex flex-col space-y-2">
                      <div className="flex justify-between items-center text-[10px] text-muted">
                        <span>Last Contact</span>
                        <span className="font-semibold text-neutral-300">
                          {person.last_interaction_date ? formatDate(person.last_interaction_date) : 'Never'}
                        </span>
                      </div>
                      {person.birthday && (
                        <div className="flex justify-between items-center text-[10px] text-muted">
                          <span>Birthday</span>
                          <span>{new Date(person.birthday).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 pt-2 border-t border-[#1f1f1f]/30">
                      <button
                        onClick={() => handleLogInteraction(person.id)}
                        className="flex-1 rounded-lg bg-[#0c0c0c] hover:bg-white border border-[#1f1f1f] hover:text-black py-2 text-[10px] font-bold text-white flex items-center justify-center gap-1.5 transition duration-200"
                      >
                        <MessageSquare className="h-3 w-3" />
                        <span>LOG INTERACTION</span>
                      </button>
                      <button
                        onClick={() => handleDeletePerson(person.id)}
                        className="rounded-lg border border-[#1f1f1f] hover:border-red-900/30 hover:bg-red-950/10 px-3 py-2 text-muted hover:text-red-400 transition"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Sidebar: Important Dates & Network Log */}
        <div className="space-y-6">
          
          {/* Important Dates Sidebar */}
          <div className="bg-[#111111] p-6 rounded-xl border border-[#1f1f1f] space-y-4 shadow-lg">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Calendar className="h-4 w-4 text-rose-500" />
              <span>Upcoming Milestones</span>
            </h3>

            {upcomingEvents.length === 0 ? (
              <p className="text-xs text-muted">No upcoming birthdays or anniversaries in the next 60 days.</p>
            ) : (
              <div className="space-y-2">
                {upcomingEvents.map((evt, idx) => (
                  <div key={idx} className="bg-[#0c0c0c] border border-[#1f1f1f] p-3 rounded-lg flex justify-between items-center">
                    <div>
                      <span className="text-xs font-bold text-white block">{evt.name}</span>
                      <span className="text-[10px] text-muted block mt-0.5">{evt.type} • {evt.dateStr}</span>
                    </div>
                    <div className="text-right">
                      <span className={cn(
                        "text-[9px] font-bold px-2 py-0.5 rounded border block",
                        evt.daysRemaining <= 7 
                          ? "bg-rose-950/20 text-rose-400 border-rose-900/30 shadow-[0_0_8px_rgba(244,63,94,0.1)] animate-pulse"
                          : "bg-neutral-900/40 text-neutral-400 border-neutral-800"
                      )}>
                        {evt.daysRemaining === 0 ? 'Today' : `${evt.daysRemaining} days`}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Networking metrics */}
          <div className="bg-[#111] p-6 rounded-xl border border-[#1f1f1f] space-y-4">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-rose-500" />
              <span>Network Structure</span>
            </h3>
            <div className="grid grid-cols-2 gap-2 text-center text-xs">
              <div className="bg-[#0c0c0c] border border-[#1f1f1f] p-3 rounded-lg">
                <span className="text-2xl font-black text-emerald-400">{people.filter(p => p.relationship_type === 'family').length}</span>
                <span className="text-[9px] text-muted block uppercase font-bold mt-1">Family</span>
              </div>
              <div className="bg-[#0c0c0c] border border-[#1f1f1f] p-3 rounded-lg">
                <span className="text-2xl font-black text-rose-400">{people.filter(p => p.relationship_type === 'partner').length}</span>
                <span className="text-[9px] text-muted block uppercase font-bold mt-1">Partners</span>
              </div>
              <div className="bg-[#0c0c0c] border border-[#1f1f1f] p-3 rounded-lg">
                <span className="text-2xl font-black text-blue-400">{people.filter(p => p.relationship_type === 'professional').length}</span>
                <span className="text-[9px] text-muted block uppercase font-bold mt-1">Work</span>
              </div>
              <div className="bg-[#0c0c0c] border border-[#1f1f1f] p-3 rounded-lg">
                <span className="text-2xl font-black text-amber-400">{people.filter(p => p.relationship_type === 'friend').length}</span>
                <span className="text-[9px] text-muted block uppercase font-bold mt-1">Friends</span>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
