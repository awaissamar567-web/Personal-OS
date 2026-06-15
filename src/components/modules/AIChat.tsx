'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import { Send, Sparkles, Loader2, User, HelpCircle } from 'lucide-react';
import { createSupabaseClient } from '@/lib/supabase-client';
import { cn } from '@/lib/utils';

interface Message {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
  created_at?: string;
}

const suggestedPrompts = [
  "Why was my productivity low this week?",
  "What habits are hurting my progress?",
  "Analyze my journal entries",
  "What should I focus on tomorrow?",
  "Predict my revenue next month",
  "What are my biggest weaknesses?",
];

export default function AIChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [streamingContent, setStreamingContent] = useState('');
  
  const supabase = useMemo(() => createSupabaseClient(), []);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Load chat history from API
  useEffect(() => {
    async function loadHistory() {
      setHistoryLoading(true);
      try {
        const response = await fetch('/api/coach');
        if (response.ok) {
          const data = await response.json();
          setMessages(data as Message[]);
        }
      } catch (err) {
        console.error('Failed to load chat history:', err);
      } finally {
        setHistoryLoading(false);
      }
    }
    loadHistory();
  }, []);

  // Scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim() || loading) return;
    
    setLoading(true);
    setInput('');
    setStreamingContent('');

    // 1. Add user message locally
    const userMsg: Message = { role: 'user', content: textToSend };
    setMessages(prev => [...prev, userMsg]);

    try {
      // 2. Post to API coach and read ReadableStream
      const response = await fetch('/api/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: textToSend }),
      });

      if (!response.ok) {
        throw new Error('Coach service error');
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Failed to read stream');
      }

      const decoder = new TextDecoder();
      let accumulatedResponse = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        accumulatedResponse += chunk;
        setStreamingContent(accumulatedResponse);
      }

      // 3. Once streaming is done, append locally
      const assistantMsg: Message = { role: 'assistant', content: accumulatedResponse };
      setMessages(prev => [...prev, assistantMsg]);
      setStreamingContent('');

    } catch (err) {
      console.error(err);
      const errMsg = err instanceof Error ? err.message : 'Could not connect to coach.';
      setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${errMsg}` }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)] md:h-[calc(100vh-10rem)] border border-[#1f1f1f] bg-[#111] rounded-xl overflow-hidden shadow-xl">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-[#1f1f1f] bg-[#0c0c0c] px-6 py-4">
        <Sparkles className="h-5 w-5 text-purple-400" />
        <div>
          <h3 className="font-bold text-white text-sm">AI LIFE COACH</h3>
          <p className="text-[10px] text-muted font-medium">Llama-3.3-70b-versatile Optimization Node</p>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
        {historyLoading ? (
          <div className="flex items-center justify-center h-full text-muted text-xs gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Retrieving archives...</span>
          </div>
        ) : messages.length === 0 && !streamingContent ? (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-4 max-w-md mx-auto">
            <div className="p-3 bg-purple-950/20 border border-purple-900/30 rounded-full text-purple-400">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <h4 className="font-bold text-white">System Standby</h4>
              <p className="text-xs text-secondary mt-1">
                I have full query access to your health logs, wealth ledger, work records, habits completions, and journal logs. Ask me anything.
              </p>
            </div>

            {/* Suggested prompts on empty state */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 w-full pt-4">
              {suggestedPrompts.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => handleSend(prompt)}
                  className="text-left text-xs bg-[#0c0c0c] border border-[#1f1f1f] rounded-lg p-3 text-neutral-400 hover:text-white hover:border-purple-500 hover:shadow-[0_0_10px_rgba(168,85,247,0.1)] transition-all duration-300"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg, index) => (
              <div
                key={index}
                className={cn(
                  "flex items-start gap-3 max-w-[85%] rounded-lg p-4 text-sm leading-relaxed",
                  msg.role === 'user'
                    ? "ml-auto bg-[#1a1a1a] text-white border border-[#2b2b2b]"
                    : "bg-[#0c0c0c] text-neutral-300 border border-[#1f1f1f] shadow-sm shadow-black/20"
                )}
              >
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-1.5 text-[10px] text-muted font-bold uppercase tracking-wider">
                    {msg.role === 'user' ? <User className="h-3 w-3" /> : <Sparkles className="h-3 w-3 text-purple-400" />}
                    <span>{msg.role === 'user' ? 'Operator' : 'AI Coach'}</span>
                  </div>
                  <div className="whitespace-pre-wrap mt-1.5">{msg.content}</div>
                </div>
              </div>
            ))}

            {/* Streaming Message */}
            {streamingContent && (
              <div className="flex items-start gap-3 max-w-[85%] rounded-lg p-4 text-sm leading-relaxed bg-[#0c0c0c] text-neutral-300 border border-[#1f1f1f]">
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-1.5 text-[10px] text-muted font-bold uppercase tracking-wider">
                    <Sparkles className="h-3 w-3 text-purple-400" />
                    <span>AI Coach</span>
                  </div>
                  <div className="whitespace-pre-wrap mt-1.5">{streamingContent}</div>
                </div>
              </div>
            )}
            
            {loading && !streamingContent && (
              <div className="flex items-center gap-2 text-xs text-muted p-4">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Coach is analyzing core logs...</span>
              </div>
            )}
            <div ref={chatEndRef} />
          </>
        )}
      </div>

      {/* Suggested prompts drawer (collapsible/visible at bottom if messages exist) */}
      {messages.length > 0 && (
        <div className="px-4 py-2 border-t border-[#1f1f1f] bg-[#0c0c0c] flex items-center gap-2 overflow-x-auto scrollbar-none whitespace-nowrap">
          <HelpCircle className="h-3.5 w-3.5 text-muted flex-shrink-0" />
          <span className="text-[10px] text-muted uppercase font-bold tracking-wider mr-2 flex-shrink-0">Suggestions:</span>
          {suggestedPrompts.map((prompt) => (
            <button
              key={prompt}
              onClick={() => handleSend(prompt)}
              className="text-xs bg-[#111] border border-[#1f1f1f] hover:border-purple-500 rounded px-2.5 py-1 text-neutral-400 hover:text-white transition duration-200"
            >
              {prompt}
            </button>
          ))}
        </div>
      )}

      {/* Input form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend(input);
        }}
        className="flex border-t border-[#1f1f1f] bg-[#0c0c0c] p-4 gap-2"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask your life coach anything..."
          disabled={loading}
          className="flex-1 rounded-lg border border-[#1f1f1f] bg-[#111] px-4 py-3 text-sm text-white placeholder-neutral-600 outline-none transition duration-200 focus:border-purple-500 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="rounded-lg bg-white px-4 text-black hover:bg-neutral-200 active:scale-95 transition duration-200 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
