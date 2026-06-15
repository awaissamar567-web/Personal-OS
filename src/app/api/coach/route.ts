import { NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase-server';
import { groq } from '@/lib/groq';
import { formatInputDate } from '@/lib/utils';

export async function GET(request: Request) {
  try {
    const supabase = createSupabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('ai_chat_history')
      .select('role,content,created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });

    if (error) {
      throw error;
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error fetching chat history:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = createSupabaseServer();
    
    // Authenticate user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { message } = await request.json();
    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Save user message to database server-side
    await supabase
      .from('ai_chat_history')
      .insert({ user_id: user.id, role: 'user', content: message });

    // Define dates for queries
    const today = new Date();
    const todayStr = formatInputDate(today);
    
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(today.getDate() - 7);
    const sevenDaysAgoStr = formatInputDate(sevenDaysAgo);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);
    const thirtyDaysAgoStr = formatInputDate(thirtyDaysAgo);

    // 1. Fetch last 7 days of health logs
    const { data: healthLogs } = await supabase
      .from('health_logs')
      .select('date,weight_kg,body_fat_pct,sleep_hours,water_ml,calories,steps,gym_workout,mood,energy')
      .eq('user_id', user.id)
      .gte('date', sevenDaysAgoStr)
      .order('date', { ascending: false });

    // 2. Fetch last 30 days of wealth logs
    const { data: wealthLogs } = await supabase
      .from('wealth_logs')
      .select('month,net_worth,monthly_income,business_revenue,savings,investments,expenses')
      .eq('user_id', user.id)
      .gte('month', thirtyDaysAgoStr)
      .order('month', { ascending: false });

    // 3. Fetch last 7 days of work logs
    const { data: workLogs } = await supabase
      .from('work_logs')
      .select('date,deep_work_hours,tasks_completed,focus_score,learning_hours,weekly_goals_met')
      .eq('user_id', user.id)
      .gte('date', sevenDaysAgoStr)
      .order('date', { ascending: false });

    // 4. Fetch today's habits and completion logs
    const { data: activeHabits } = await supabase
      .from('habits')
      .select('id,name,category')
      .eq('user_id', user.id)
      .eq('active', true);

    const { data: todayHabitLogs } = await supabase
      .from('habit_logs')
      .select('habit_id,completed')
      .eq('user_id', user.id)
      .eq('date', todayStr);

    const habitsContext = activeHabits?.map(h => {
      const logged = todayHabitLogs?.find(l => l.habit_id === h.id);
      return {
        name: h.name,
        category: h.category,
        completed: logged ? logged.completed : false,
      };
    }) || [];

    // 5. Fetch last 5 journal entries
    const { data: journalEntries } = await supabase
      .from('journal_entries')
      .select('date,type,content,wins,mistakes,mood,progress_score')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .limit(5);

    // 6. Fetch all active goals
    const { data: activeGoals } = await supabase
      .from('goals')
      .select('title,description,category,timeframe,progress,status')
      .eq('user_id', user.id)
      .eq('status', 'active');

    // Assemble payload
    const contextData = {
      current_date: todayStr,
      health_logs_last_7_days: healthLogs || [],
      wealth_logs_last_30_days: wealthLogs || [],
      work_logs_last_7_days: workLogs || [],
      today_habits: habitsContext,
      last_5_journal_entries: journalEntries || [],
      active_goals: activeGoals || [],
    };

    // System prompt with data context injection
    const systemPrompt = `
You are a brutally honest, data-driven personal life coach. 
You have full access to the user's life data. Be direct. Be specific. Be actionable.

USER DATA CONTEXT:
${JSON.stringify(contextData, null, 2)}

Always reference specific numbers from the data. 
If you see patterns, call them out (e.g. "You sleep less than 6 hours when you don't do gym", or "Your expenses are high compared to income"). 
If the user is slacking, say it. 
If they're winning, acknowledge it and push further.
`;

    // Fetch streaming completion from Groq
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message },
      ],
      model: 'llama-3.3-70b-versatile',
      stream: true,
    });

    // Create readable stream to pipe to client
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        let accumulatedResponse = '';
        try {
          for await (const chunk of chatCompletion) {
            const text = chunk.choices[0]?.delta?.content || '';
            accumulatedResponse += text;
            controller.enqueue(encoder.encode(text));
          }

          // Once stream is done, save assistant message
          if (accumulatedResponse.trim()) {
            await supabase
              .from('ai_chat_history')
              .insert({ user_id: user.id, role: 'assistant', content: accumulatedResponse });
          }
        } catch (err) {
          controller.error(err);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error: any) {
    console.error('Error in coach API:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
