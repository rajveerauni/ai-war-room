'use client';
import { useState, useRef, useEffect } from 'react';
import TopBar from '../components/TopBar';
import { useWarRoomData } from '../../lib/useWarRoomData';
import { motion, AnimatePresence } from 'framer-motion';

async function fetchLiveContext(data) {
  if (!data) return null;
  const companies = [data.companyName, data.competitor1, data.competitor2].filter(Boolean);
  try {
    const res = await fetch(`/api/dashboard?companies=${encodeURIComponent(companies.join(','))}`);
    const json = await res.json();
    return json;
  } catch {
    return null;
  }
}

function buildSystemPrompt(data, liveCtx) {
  if (!data) return 'You are a tactical business intelligence AI. Provide strategic, data-driven insights.';
  const comps = [data.competitor1, data.competitor2, data.competitor3].filter(Boolean).join(', ');
  let base = `You are a tactical business intelligence AI for ${data.companyName} (${data.industry}). Revenue target: ${data.revenueTarget}. Competitors: ${comps}.`;

  if (liveCtx) {
    const uc = liveCtx.userCompany;
    if (uc?.stock) {
      base += `\n\nLIVE MARKET DATA (${new Date(liveCtx.fetchedAt).toLocaleTimeString()}):`;
      base += `\n${data.companyName} Stock: $${uc.stock.price} (${uc.stock.change > 0 ? '+' : ''}${uc.stock.change}%), MCap: $${uc.stock.marketCap ? (uc.stock.marketCap / 1e9).toFixed(1) + 'B' : 'N/A'}`;
    }
    if (liveCtx.competitors?.length) {
      liveCtx.competitors.forEach((c) => {
        if (c.stock) base += `\n${c.name}: $${c.stock.price} (${c.stock.change > 0 ? '+' : ''}${c.stock.change}%)`;
        if (c.reddit?.sentiment) base += `, Reddit: ${c.reddit.sentiment}`;
      });
    }
    const news = uc?.news?.articles || [];
    if (news.length) {
      base += `\n\nRECENT NEWS (${data.companyName}):`;
      news.slice(0, 3).forEach((a) => { base += `\n• ${a.title}`; });
    }
  }

  base += '\n\nBe direct, specific, and cite real numbers when available. Structure responses clearly.';
  return base;
}

function Message({ msg }) {
  const isUser = msg.role === 'user';
  return (
    <motion.div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
      initial={{ opacity: 0, x: isUser ? 20 : -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}>
      <div className={`w-7 h-7 shrink-0 flex items-center justify-center text-[10px] font-black border ${isUser ? 'bg-white text-black border-white' : 'bg-[#4ae176]/10 text-[#4ae176] border-[#4ae176]/30'}`}>
        {isUser ? 'YOU' : 'AI'}
      </div>
      <div className={`max-w-[75%] px-4 py-3 text-sm leading-relaxed ${isUser ? 'bg-neutral-800 text-white' : 'bg-surface-container text-neutral-200'}`}>
        {msg.text.split('\n').map((line, i, arr) => <span key={i}>{line}{i < arr.length - 1 && <br />}</span>)}
        {msg.error && <span className="text-[#b91a24] text-xs block mt-1">⚠ {msg.error}</span>}
      </div>
    </motion.div>
  );
}

const SUGGESTIONS = [
  'What does the live market data say about our position?',
  'Analyze our competitors based on today\'s data.',
  'What strategic moves should we prioritize this quarter?',
  'Give me a threat assessment based on current sentiment.',
];

export default function ChatPage() {
  const { data, loading } = useWarRoomData();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [liveCtx, setLiveCtx] = useState(null);
  const [ctxLoading, setCtxLoading] = useState(false);
  const [ctxFetchedAt, setCtxFetchedAt] = useState(null);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, thinking]);

  // Load live context when data is ready
  useEffect(() => {
    if (!data) return;
    setCtxLoading(true);
    fetchLiveContext(data).then((ctx) => {
      setLiveCtx(ctx);
      if (ctx?.fetchedAt) setCtxFetchedAt(ctx.fetchedAt);
    }).finally(() => setCtxLoading(false));
  }, [data?.companyName]);

  async function send(text) {
    const userText = text || input.trim();
    if (!userText || thinking) return;
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', text: userText }]);
    setThinking(true);

    const historyForApi = messages.map((m) => ({ role: m.role, text: m.text }));

    try {
      const res = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'chat',
          prompt: userText,
          history: historyForApi,
          systemPrompt: buildSystemPrompt(data, liveCtx),
        }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setMessages((prev) => [...prev, { role: 'model', text: json.text }]);
    } catch (err) {
      setMessages((prev) => [...prev, { role: 'model', text: 'Failed to get a response.', error: err.message }]);
    } finally {
      setThinking(false);
      inputRef.current?.focus();
    }
  }

  async function refreshContext() {
    if (!data) return;
    setCtxLoading(true);
    const ctx = await fetchLiveContext(data);
    setLiveCtx(ctx);
    if (ctx?.fetchedAt) setCtxFetchedAt(ctx.fetchedAt);
    setCtxLoading(false);
  }

  return (
    <>
      <TopBar title="AI Chat" />
      <div className="flex flex-col" style={{ height: 'calc(100vh - 96px)' }}>
        {/* Header */}
        <motion.div className="mb-4 shrink-0" initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <p className="text-xs font-bold text-secondary uppercase tracking-[0.2em] mb-1">Sector 03 // Intelligence Interface</p>
          <div className="flex items-end justify-between flex-wrap gap-2">
            <div>
              <h3 className="text-3xl font-extrabold tracking-tighter text-white">Tactical AI Advisor</h3>
              {data && <p className="text-sm text-neutral-500 mt-0.5 font-mono">{data.companyName} · {data.industry} · {data.revenueTarget}</p>}
            </div>
            {/* Live context status */}
            <div className="flex items-center gap-2">
              {ctxLoading ? (
                <span className="text-[9px] font-mono text-neutral-500 flex items-center gap-1">
                  <motion.span animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }} style={{ display: 'inline-block' }}>◌</motion.span>
                  Loading live context...
                </span>
              ) : liveCtx ? (
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-mono text-[#4ae176] border border-[#4ae176]/30 px-2 py-0.5">
                    ✓ LIVE CONTEXT · {ctxFetchedAt && new Date(ctxFetchedAt).toLocaleTimeString()}
                  </span>
                  <motion.button onClick={refreshContext} className="text-[9px] font-mono text-neutral-500 hover:text-white transition-colors"
                    whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>↻</motion.button>
                </div>
              ) : data ? (
                <span className="text-[9px] font-mono text-yellow-500 border border-yellow-500/30 px-2 py-0.5">Context pending</span>
              ) : null}
            </div>
          </div>
        </motion.div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-2 pb-4" style={{ minHeight: 0 }}>
          {loading || ctxLoading && !messages.length ? (
            <div className="h-8 bg-neutral-800/40 animate-pulse rounded w-2/3" />
          ) : messages.length === 0 ? (
            <motion.div className="flex flex-col items-center justify-center h-full text-center gap-6"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
              <div>
                <div className="text-5xl mb-3 opacity-10">◈</div>
                <p className="text-white font-bold text-sm uppercase tracking-wider mb-1">War Room AI Online</p>
                <p className="text-neutral-500 text-xs max-w-sm">
                  {liveCtx
                    ? `Context loaded: live market data, news, and sentiment for ${data?.companyName} and competitors.`
                    : data
                    ? `Ask anything about ${data.companyName}'s competitive landscape.`
                    : 'Complete onboarding to enable context-aware responses.'}
                </p>
              </div>
              <div className="flex flex-wrap gap-2 justify-center max-w-lg">
                {SUGGESTIONS.map((s, i) => (
                  <motion.button key={s} onClick={() => send(s)}
                    className="px-3 py-2 text-[11px] text-neutral-400 border border-neutral-700 hover:border-white hover:text-white transition-all font-mono text-left"
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 + i * 0.07 }} whileHover={{ scale: 1.03 }}>
                    {s}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          ) : (
            <>
              <AnimatePresence initial={false}>
                {messages.map((msg, i) => <Message key={i} msg={msg} />)}
              </AnimatePresence>
              {thinking && (
                <motion.div className="flex gap-3" initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}>
                  <div className="w-7 h-7 shrink-0 flex items-center justify-center text-[10px] font-black border bg-[#4ae176]/10 text-[#4ae176] border-[#4ae176]/30">AI</div>
                  <div className="px-4 py-3 bg-surface-container text-neutral-500 text-sm flex items-center gap-1">
                    {[0, 0.2, 0.4].map((delay, i) => (
                      <motion.span key={i} animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 0.9, repeat: Infinity, delay }}>■</motion.span>
                    ))}
                  </div>
                </motion.div>
              )}
              <div ref={bottomRef} />
            </>
          )}
        </div>

        {/* Input */}
        <motion.div className="shrink-0 border-t border-neutral-800 pt-4"
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          {messages.length > 0 && (
            <button onClick={() => setMessages([])} className="text-[10px] text-neutral-600 hover:text-neutral-400 font-mono uppercase tracking-wider mb-3 transition-colors">
              ✕ Clear conversation
            </button>
          )}
          <div className="flex gap-3">
            <textarea ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder={thinking ? 'AI is responding...' : 'Ask about live market data, competitive strategy, threats...'}
              disabled={thinking} rows={2}
              className="flex-1 px-4 py-3 bg-[#0e0e0e] border border-[#2a2a2a] text-white text-sm placeholder-neutral-600 focus:outline-none focus:border-[#4ae176] transition-colors font-mono resize-none disabled:opacity-50" />
            <motion.button onClick={() => send()} disabled={thinking || !input.trim()}
              className="px-6 bg-[#4ae176] text-black text-[11px] font-black uppercase tracking-widest disabled:opacity-30 disabled:cursor-not-allowed self-stretch"
              whileHover={!thinking ? { scale: 1.04 } : {}} whileTap={!thinking ? { scale: 0.97 } : {}}>
              {thinking ? '...' : 'SEND'}
            </motion.button>
          </div>
          <p className="text-[9px] text-neutral-700 mt-2 font-mono">GROQ · LLAMA-3.3-70B · CONTEXT-AWARE · SESSION NOT STORED</p>
        </motion.div>
      </div>
    </>
  );
}
