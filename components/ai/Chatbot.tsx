'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Bot, User, Sparkles, Trash2, AlertCircle } from 'lucide-react';

interface Message {
  id:      string;
  role:    'user' | 'assistant';
  content: string;
}

const STARTERS = [
  'Apa itu heat index?',
  'Suhu berapa yang nyaman untuk ruang kelas?',
  'Kenapa kelembapan tinggi berbahaya?',
  'Bedanya ruangan A, B, C apa?',
];

function TypingDots() {
  return (
    <span className="flex gap-1 items-center h-4">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-purple-400"
          animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
          transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
        />
      ))}
    </span>
  );
}

export function Chatbot() {
  const [messages,  setMessages]  = useState<Message[]>([]);
  const [input,     setInput]     = useState('');
  const [streaming, setStreaming] = useState(false);
  const [error,     setError]     = useState<string | null>(null);
  const bottomRef  = useRef<HTMLDivElement>(null);
  const inputRef   = useRef<HTMLTextAreaElement>(null);
  const abortRef   = useRef<AbortController | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streaming]);

  const send = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || streaming) return;

    setError(null);
    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: trimmed };
    const assistantId = (Date.now() + 1).toString();

    setMessages((prev) => [
      ...prev,
      userMsg,
      { id: assistantId, role: 'assistant', content: '' },
    ]);
    setInput('');
    setStreaming(true);

    abortRef.current = new AbortController();

    try {
      const res = await fetch('/api/chat', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          messages: [...messages, userMsg].map(({ role, content }) => ({ role, content })),
        }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const reader  = res.body!.getReader();
      const decoder = new TextDecoder();
      let   buffer  = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (data === '[DONE]') break;
          try {
            const chunk   = JSON.parse(data);
            const content = chunk.choices?.[0]?.delta?.content;
            if (content) {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId ? { ...m, content: m.content + content } : m
                )
              );
            }
          } catch { /* skip malformed chunk */ }
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return;
      setError('Gagal terhubung ke AI. Coba lagi.');
      // Hapus pesan assistant yang kosong
      setMessages((prev) => prev.filter((m) => m.id !== assistantId));
    } finally {
      setStreaming(false);
      abortRef.current = null;
      inputRef.current?.focus();
    }
  }, [messages, streaming]);

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  };

  const clear = () => {
    abortRef.current?.abort();
    setMessages([]);
    setError(null);
  };

  return (
    <div className="flex flex-col h-full min-h-0">

      {/* Header */}
      <div className="flex items-center justify-between px-4 md:px-6 py-4 border-b border-white/5 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-purple-400" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-white">Monrun AI</h1>
            <p className="text-[10px] text-white/30">Powered by OpenRouter · Ring 2.6</p>
          </div>
        </div>
        {messages.length > 0 && (
          <button
            onClick={clear}
            className="p-2 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/5 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4 space-y-4 min-h-0">

        {/* Welcome screen */}
        {messages.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center h-full py-12 text-center"
          >
            <div className="w-16 h-16 rounded-2xl bg-purple-500/15 border border-purple-500/25 flex items-center justify-center mb-4">
              <Sparkles className="w-8 h-8 text-purple-400" />
            </div>
            <h2 className="text-lg font-bold text-white mb-2">Monrun AI</h2>
            <p className="text-sm text-white/40 max-w-xs mb-8">
              Asisten AI untuk sistem monitoring ruangan ESP32. Tanya apa saja!
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-sm">
              {STARTERS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="text-xs px-3 py-2.5 rounded-xl bg-white/4 border border-white/8
                    text-white/60 hover:text-white hover:bg-white/8 hover:border-purple-500/30
                    transition-all text-left"
                >
                  {s}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Chat messages */}
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'assistant' && (
                <div className="w-7 h-7 rounded-lg bg-purple-500/20 border border-purple-500/30 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="w-3.5 h-3.5 text-purple-400" />
                </div>
              )}

              <div className={`max-w-[80%] md:max-w-[70%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-cyan-500/15 border border-cyan-500/20 text-white rounded-tr-sm'
                  : 'bg-white/5 border border-white/8 text-white/85 rounded-tl-sm'
              }`}>
                {msg.role === 'assistant' && !msg.content
                  ? <TypingDots />
                  : <span className="whitespace-pre-wrap">{msg.content}</span>
                }
              </div>

              {msg.role === 'user' && (
                <div className="w-7 h-7 rounded-lg bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center shrink-0 mt-0.5">
                  <User className="w-3.5 h-3.5 text-cyan-400" />
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 md:px-6 py-4 border-t border-white/5 shrink-0">
        <div className="flex gap-2 items-end">
          <textarea
            ref={inputRef}
            rows={1}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              e.target.style.height = 'auto';
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
            }}
            onKeyDown={handleKey}
            placeholder="Tanya sesuatu... (Enter untuk kirim)"
            disabled={streaming}
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm
              text-white placeholder-white/20 outline-none resize-none
              focus:border-purple-500/40 focus:bg-white/8 transition-all
              disabled:opacity-50 overflow-hidden"
            style={{ minHeight: '44px' }}
          />
          <button
            onClick={() => send(input)}
            disabled={!input.trim() || streaming}
            className="w-11 h-11 rounded-xl bg-purple-500/20 border border-purple-500/30
              flex items-center justify-center text-purple-400 shrink-0
              hover:bg-purple-500/30 hover:border-purple-500/50 transition-all
              disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <p className="text-[10px] text-white/15 mt-2 text-center">
          Shift+Enter untuk baris baru · Enter untuk kirim
        </p>
      </div>
    </div>
  );
}
