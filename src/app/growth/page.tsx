'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { BookOpen, Star, Plus, Trash2, ArrowRight, ArrowLeft, CheckCircle2, Award, Sparkles, Loader2 } from 'lucide-react';
import { createSupabaseClient } from '@/lib/supabase-client';
import { formatInputDate, formatDate } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface Book {
  id: string;
  title: string;
  author: string | null;
  status: 'want' | 'reading' | 'done';
  rating: number | null;
  notes: string | null;
  date_finished: string | null;
}

export default function GrowthPage() {
  const [loading, setLoading] = useState(true);
  const [books, setBooks] = useState<Book[]>([]);
  const [skills, setSkills] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [weeklyWins, setWeeklyWins] = useState<any[]>([]);

  // Form states for adding book
  const [showBookForm, setShowBookForm] = useState(false);
  const [bookTitle, setBookTitle] = useState('');
  const [bookAuthor, setBookAuthor] = useState('');
  const [bookNotes, setBookNotes] = useState('');
  const [bookStatus, setBookStatus] = useState<'want' | 'reading' | 'done'>('reading');
  const [bookRating, setBookRating] = useState(5);
  const [savingBook, setSavingBook] = useState(false);

  // Form states for adding growth goal (skills/courses)
  const [showGrowthForm, setShowGrowthForm] = useState(false);
  const [growthTitle, setGrowthTitle] = useState('');
  const [growthType, setGrowthType] = useState<'skill' | 'course'>('skill');
  const [savingGrowth, setSavingGrowth] = useState(false);

  const supabase = useMemo(() => createSupabaseClient(), []);

  const fetchGrowthData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // 1. Fetch books
    const { data: booksData } = await supabase
      .from('books')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    setBooks(booksData || []);

    // 2. Fetch completed growth goals as Skills and Courses
    const { data: growthGoals } = await supabase
      .from('goals')
      .select('*')
      .eq('user_id', user.id)
      .eq('category', 'growth')
      .order('created_at', { ascending: false });

    if (growthGoals) {
      // Filter skills (status is completed or active but doesn't contain "Course")
      const filteredSkills = growthGoals.filter(g => !g.title.toLowerCase().startsWith('course:'));
      // Filter courses (title starts with "Course:")
      const filteredCourses = growthGoals.filter(g => g.title.toLowerCase().startsWith('course:'));

      setSkills(filteredSkills);
      setCourses(filteredCourses);
    }

    // 3. Fetch weekly wins (wins column from journal entries in the last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoStr = formatInputDate(sevenDaysAgo);

    const { data: journalWins } = await supabase
      .from('journal_entries')
      .select('date,wins')
      .eq('user_id', user.id)
      .gte('date', sevenDaysAgoStr)
      .not('wins', 'is', null);

    setWeeklyWins(journalWins || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchGrowthData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Book CRUD actions
  const handleSaveBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookTitle.trim()) return;
    setSavingBook(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const payload = {
      user_id: user.id,
      title: bookTitle,
      author: bookAuthor || null,
      status: bookStatus,
      notes: bookNotes || null,
      rating: bookStatus === 'done' ? bookRating : null,
      date_finished: bookStatus === 'done' ? todayStr() : null,
    };

    await supabase.from('books').insert(payload);

    setBookTitle('');
    setBookAuthor('');
    setBookNotes('');
    setBookStatus('reading');
    setShowBookForm(false);
    setSavingBook(false);
    fetchGrowthData();
  };

  const handleMoveBook = async (bookId: string, newStatus: 'want' | 'reading' | 'done') => {
    const payload: Partial<Book> = {
      status: newStatus,
      date_finished: newStatus === 'done' ? todayStr() : null,
    };
    if (newStatus === 'done') payload.rating = 5; // Default rating to 5

    await supabase
      .from('books')
      .update(payload)
      .eq('id', bookId);

    fetchGrowthData();
  };

  const handleUpdateBookRating = async (bookId: string, rating: number) => {
    await supabase
      .from('books')
      .update({ rating })
      .eq('id', bookId);

    fetchGrowthData();
  };

  const handleDeleteBook = async (bookId: string) => {
    if (!confirm('Delete this book from tracker?')) return;
    await supabase.from('books').delete().eq('id', bookId);
    fetchGrowthData();
  };

  // Skills / Courses logs
  const handleSaveGrowthGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!growthTitle.trim()) return;
    setSavingGrowth(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Prepend "Course:" if it is a course
    const formattedTitle = growthType === 'course' 
      ? `Course: ${growthTitle}` 
      : growthTitle;

    const payload = {
      user_id: user.id,
      title: formattedTitle,
      category: 'growth',
      timeframe: '1yr',
      progress: 100, // Pre-log completed skills and courses
      status: 'completed',
      target_date: todayStr(),
    };

    await supabase.from('goals').insert(payload);

    setGrowthTitle('');
    setShowGrowthForm(false);
    setSavingGrowth(false);
    fetchGrowthData();
  };

  const handleDeleteGrowthGoal = async (id: string) => {
    if (!confirm('Delete this item?')) return;
    await supabase.from('goals').delete().eq('id', id);
    fetchGrowthData();
  };

  const todayStr = () => formatInputDate(new Date());

  // Columns for Kanban Board
  const columns = [
    { id: 'want', title: 'WANT TO READ', color: 'text-neutral-400' },
    { id: 'reading', title: 'READING NOW', color: 'text-amber-400' },
    { id: 'done', title: 'FINISHED', color: 'text-emerald-400' },
  ];

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center text-xs text-muted gap-2">
        <Loader2 className="h-4 w-4 animate-spin text-amber-500" />
        <span>Loading library logs...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Title block */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#111] border border-[#1f1f1f] p-6 rounded-xl">
        <div>
          <h1 className="text-xl font-black text-white tracking-wide uppercase">GROWTH PLATFORM</h1>
          <p className="text-xs text-secondary mt-0.5">Track books read, log courses finished, list acquired skills.</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/journal"
            className="rounded-lg border border-[#1f1f1f] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#1a1a1a] flex items-center gap-1.5 transition"
          >
            <span>JOURNAL SHORTCUT</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
          <button
            onClick={() => setShowBookForm(!showBookForm)}
            className="rounded-lg bg-white px-4 py-2.5 text-xs font-bold text-black hover:bg-neutral-200 flex items-center gap-1.5 transition"
          >
            <Plus className="h-4 w-4" />
            <span>ADD BOOK</span>
          </button>
        </div>
      </div>

      {/* Book Form Dialog */}
      {showBookForm && (
        <form onSubmit={handleSaveBook} className="bg-[#111] border border-[#1f1f1f] p-6 rounded-xl max-w-md space-y-4 shadow-lg">
          <h3 className="font-bold text-white text-sm">ADD BOOK TO ARCHIVES</h3>
          <div className="flex flex-col space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted">Title</label>
            <input
              type="text"
              required
              value={bookTitle}
              onChange={(e) => setBookTitle(e.target.value)}
              placeholder="e.g. Atomic Habits, Meditations..."
              className="rounded-lg border border-[#1f1f1f] bg-[#0c0c0c] px-4 py-2.5 text-sm text-white placeholder-neutral-600 outline-none focus:border-amber-500"
            />
          </div>
          <div className="flex flex-col space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted">Author</label>
            <input
              type="text"
              value={bookAuthor}
              onChange={(e) => setBookAuthor(e.target.value)}
              placeholder="e.g. James Clear, Marcus Aurelius..."
              className="rounded-lg border border-[#1f1f1f] bg-[#0c0c0c] px-4 py-2.5 text-sm text-white placeholder-neutral-600 outline-none focus:border-amber-500"
            />
          </div>
          <div className="flex flex-col space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted">Status</label>
            <select
              value={bookStatus}
              onChange={(e) => setBookStatus(e.target.value as any)}
              className="rounded-lg border border-[#1f1f1f] bg-[#0c0c0c] px-4 py-2.5 text-sm text-white outline-none focus:border-amber-500"
            >
              <option value="want">Want to Read</option>
              <option value="reading">Reading Now</option>
              <option value="done">Finished</option>
            </select>
          </div>
          {bookStatus === 'done' && (
            <div className="flex flex-col space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted">Rating (1-5)</label>
              <div className="flex gap-1.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setBookRating(star)}
                    className="p-1 hover:bg-[#1a1a1a] rounded transition"
                  >
                    <Star className={cn("h-5 w-5", star <= bookRating ? "text-amber-400 fill-amber-400" : "text-neutral-700")} />
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="flex flex-col space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted">Notes / Summary</label>
            <textarea
              rows={2}
              value={bookNotes}
              onChange={(e) => setBookNotes(e.target.value)}
              placeholder="Short key takeaway or reason for reading..."
              className="rounded-lg border border-[#1f1f1f] bg-[#0c0c0c] px-4 py-2 text-sm text-white outline-none focus:border-amber-500 resize-none"
            />
          </div>
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowBookForm(false)}
              className="flex-1 rounded-lg border border-[#1f1f1f] py-2 text-xs font-bold text-white hover:bg-[#1a1a1a]"
            >
              CANCEL
            </button>
            <button
              type="submit"
              disabled={savingBook}
              className="flex-1 rounded-lg bg-white py-2 text-xs font-bold text-black hover:bg-neutral-200"
            >
              {savingBook ? 'SAVING...' : 'SAVE BOOK'}
            </button>
          </div>
        </form>
      )}

      {/* Kanban Board for Books */}
      <div className="bg-[#111] p-6 rounded-xl border border-[#1f1f1f] space-y-6">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-amber-500" />
          <span>Library Kanban Board</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {columns.map((col) => {
            const colBooks = books.filter(b => b.status === col.id);

            return (
              <div key={col.id} className="bg-[#0c0c0c] rounded-xl border border-[#1f1f1f] p-4 flex flex-col space-y-4 min-h-[350px]">
                <div className="flex items-center justify-between border-b border-[#1f1f1f] pb-2 px-1">
                  <span className={cn("text-xs font-bold uppercase tracking-wider", col.color)}>
                    {col.title}
                  </span>
                  <span className="text-[10px] font-bold bg-[#111] text-muted px-2 py-0.5 rounded border border-[#1f1f1f]">
                    {colBooks.length}
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                  {colBooks.length === 0 ? (
                    <div className="text-center text-[10px] text-muted py-12">No books listed</div>
                  ) : (
                    colBooks.map((book) => (
                      <div key={book.id} className="bg-[#111] border border-[#1f1f1f] hover:border-neutral-700 p-4 rounded-lg flex flex-col justify-between space-y-3 transition duration-200">
                        <div className="space-y-1">
                          <h4 className="font-bold text-white text-xs leading-snug">{book.title}</h4>
                          {book.author && <span className="text-[10px] text-muted">{book.author}</span>}
                          {book.notes && <p className="text-[10px] text-secondary line-clamp-2 mt-1">{book.notes}</p>}
                        </div>

                        {col.id === 'done' && book.rating && (
                          <div className="flex gap-0.5">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <button
                                key={star}
                                onClick={() => handleUpdateBookRating(book.id, star)}
                                className="transition"
                              >
                                <Star className={cn("h-3 w-3", star <= (book.rating || 0) ? "text-amber-400 fill-amber-400" : "text-neutral-800")} />
                              </button>
                            ))}
                          </div>
                        )}

                        <div className="flex justify-between items-center border-t border-[#1f1f1f]/50 pt-2">
                          <button
                            onClick={() => handleDeleteBook(book.id)}
                            className="text-muted hover:text-red-400 p-1 hover:bg-[#0c0c0c] rounded transition duration-200"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                          
                          <div className="flex gap-1">
                            {col.id !== 'want' && (
                              <button
                                onClick={() => handleMoveBook(book.id, col.id === 'done' ? 'reading' : 'want')}
                                className="p-1 hover:bg-[#0c0c0c] text-muted hover:text-white rounded border border-transparent hover:border-[#1f1f1f] transition"
                                title="Move left"
                              >
                                <ArrowLeft className="h-3 w-3" />
                              </button>
                            )}
                            {col.id !== 'done' && (
                              <button
                                onClick={() => handleMoveBook(book.id, col.id === 'want' ? 'reading' : 'done')}
                                className="p-1 hover:bg-[#0c0c0c] text-muted hover:text-white rounded border border-transparent hover:border-[#1f1f1f] transition"
                                title="Move right"
                              >
                                <ArrowRight className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Skills & Courses Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Skills learned log */}
        <div className="bg-[#111] p-6 rounded-xl border border-[#1f1f1f] space-y-4">
          <div className="flex justify-between items-center border-b border-[#1f1f1f] pb-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Award className="h-4 w-4 text-amber-500" />
              <span>Skills Acquired</span>
            </h3>
            <button
              onClick={() => {
                setGrowthType('skill');
                setShowGrowthForm(true);
              }}
              className="p-1 hover:bg-[#1a1a1a] rounded text-muted hover:text-white transition duration-200"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {skills.length === 0 ? (
              <p className="text-xs text-muted py-6 text-center">No skills logged yet</p>
            ) : (
              skills.map((skill) => (
                <div key={skill.id} className="flex justify-between items-center bg-[#0c0c0c] border border-[#1f1f1f] p-3 rounded-lg">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-white">{skill.title}</span>
                    <span className="text-[9px] text-muted block">Logged: {formatDate(skill.target_date)}</span>
                  </div>
                  <button
                    onClick={() => handleDeleteGrowthGoal(skill.id)}
                    className="text-muted hover:text-red-400 p-1 hover:bg-[#111] rounded transition"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Courses Completed */}
        <div className="bg-[#111] p-6 rounded-xl border border-[#1f1f1f] space-y-4">
          <div className="flex justify-between items-center border-b border-[#1f1f1f] pb-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-amber-500" />
              <span>Courses Completed</span>
            </h3>
            <button
              onClick={() => {
                setGrowthType('course');
                setShowGrowthForm(true);
              }}
              className="p-1 hover:bg-[#1a1a1a] rounded text-muted hover:text-white transition duration-200"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {courses.length === 0 ? (
              <p className="text-xs text-muted py-6 text-center">No courses completed yet</p>
            ) : (
              courses.map((course) => (
                <div key={course.id} className="flex justify-between items-center bg-[#0c0c0c] border border-[#1f1f1f] p-3 rounded-lg">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-white">{course.title.replace(/^course:\s*/i, '')}</span>
                    <span className="text-[9px] text-muted block">Finished: {formatDate(course.target_date)}</span>
                  </div>
                  <button
                    onClick={() => handleDeleteGrowthGoal(course.id)}
                    className="text-muted hover:text-red-400 p-1 hover:bg-[#111] rounded transition"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Growth Form Dialog */}
      {showGrowthForm && (
        <div className="fixed inset-0 z-50 bg-[#000]/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleSaveGrowthGoal} className="bg-[#111] border border-[#1f1f1f] p-6 rounded-xl w-full max-w-sm space-y-4 shadow-xl">
            <h3 className="font-bold text-white text-sm">LOG {growthType === 'skill' ? 'SKILL' : 'COURSE'} COMPLETED</h3>
            <div className="flex flex-col space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted">Title Name</label>
              <input
                type="text"
                required
                value={growthTitle}
                onChange={(e) => setGrowthTitle(e.target.value)}
                placeholder={growthType === 'skill' ? "e.g. Next.js, Rust Language, UI design..." : "e.g. CS50 Intro to Computer Science..."}
                className="rounded-lg border border-[#1f1f1f] bg-[#0c0c0c] px-4 py-2.5 text-sm text-white outline-none focus:border-amber-500"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowGrowthForm(false)}
                className="flex-1 rounded-lg border border-[#1f1f1f] py-2 text-xs font-bold text-white hover:bg-[#1a1a1a]"
              >
                CANCEL
              </button>
              <button
                type="submit"
                disabled={savingGrowth}
                className="flex-1 rounded-lg bg-white py-2 text-xs font-bold text-black hover:bg-neutral-200"
              >
                {savingGrowth ? 'LOGGING...' : 'SAVE RECORD'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Weekly Wins Log */}
      <div className="bg-[#111] p-6 rounded-xl border border-[#1f1f1f] space-y-4">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-amber-500" />
          <span>Weekly wins archive (Last 7 Days)</span>
        </h3>
        
        {weeklyWins.length === 0 ? (
          <p className="text-xs text-muted py-6">Write morning intentions or evening reflection journals to archive wins here.</p>
        ) : (
          <div className="space-y-3">
            {weeklyWins.map((entry, index) => (
              <div key={index} className="bg-[#0c0c0c] border border-[#1f1f1f] p-4 rounded-lg space-y-2">
                <span className="text-[9px] uppercase font-bold text-muted bg-[#111] border border-[#1f1f1f] px-2 py-0.5 rounded">
                  {formatDate(entry.date)}
                </span>
                <p className="text-xs text-neutral-300 whitespace-pre-wrap">{entry.wins}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
