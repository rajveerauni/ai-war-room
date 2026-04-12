'use client';
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function SentimentBadge({ title }) {
  const t = (title || '').toLowerCase();
  const pos = ['growth', 'profit', 'surge', 'beat', 'record', 'strong', 'win', 'rise', 'bullish'];
  const neg = ['loss', 'decline', 'drop', 'miss', 'fall', 'risk', 'concern', 'bearish', 'fail', 'scandal'];
  const posHit = pos.some((w) => t.includes(w));
  const negHit = neg.some((w) => t.includes(w));
  if (posHit && !negHit) return <span className="px-1.5 py-0.5 text-[9px] font-black uppercase bg-[#4ae176]/10 border border-[#4ae176]/40 text-[#4ae176]">Positive</span>;
  if (negHit && !posHit) return <span className="px-1.5 py-0.5 text-[9px] font-black uppercase bg-[#b91a24]/10 border border-[#b91a24]/40 text-[#b91a24]">Negative</span>;
  return <span className="px-1.5 py-0.5 text-[9px] font-black uppercase bg-neutral-800 border border-neutral-700 text-neutral-400">Neutral</span>;
}

const REFRESH_MS = 5 * 60 * 1000;

export default function NewsFeed({ companies = [] }) {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fetchedAt, setFetchedAt] = useState(null);
  const [stale, setStale] = useState(false);
  const [noKey, setNoKey] = useState(false);

  const fetch_ = useCallback(async () => {
    if (!companies.length) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/news?companies=${encodeURIComponent(companies.join(','))}`);
      const json = await res.json();
      if (json.error && !json.articles) throw new Error(json.error);
      setArticles(json.articles || []);
      setFetchedAt(json.fetchedAt);
      setNoKey(!json.hasApiKey);
      setStale(false);
    } catch (e) {
      setError(e.message);
      setStale(true);
    } finally {
      setLoading(false);
    }
  }, [companies.join(',')]);

  // Initial load + 5-min auto-refresh
  useEffect(() => {
    fetch_();
    const id = setInterval(() => { fetch_(); }, REFRESH_MS);
    return () => clearInterval(id);
  }, [fetch_]);

  return (
    <div className="bg-surface-container ghost-border overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 bg-surface-container-low border-b border-neutral-800/30 flex justify-between items-center">
        <div>
          <h4 className="text-xs font-bold text-white uppercase tracking-widest">Live Intelligence Feed</h4>
          {fetchedAt && !noKey && (
            <p className="text-[9px] text-neutral-600 font-mono mt-0.5">
              {stale && <span className="text-yellow-500 mr-1">⚠ STALE ·</span>}
              Updated {timeAgo(fetchedAt)}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {noKey && (
            <span className="text-[9px] font-mono text-yellow-500 border border-yellow-500/30 px-2 py-0.5">
              NEWS_API_KEY not set
            </span>
          )}
          <motion.button
            onClick={fetch_}
            disabled={loading}
            className="text-[10px] text-neutral-400 hover:text-white font-mono uppercase tracking-wider flex items-center gap-1 disabled:opacity-40"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <motion.span
              animate={loading ? { rotate: 360 } : { rotate: 0 }}
              transition={loading ? { duration: 0.8, repeat: Infinity, ease: 'linear' } : {}}
              style={{ display: 'inline-block' }}
            >
              ↻
            </motion.span>
            {loading ? 'Fetching...' : 'Refresh'}
          </motion.button>
        </div>
      </div>

      {/* Content */}
      {loading && !articles.length ? (
        <div className="p-6 space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-2">
              <div className="h-3 bg-neutral-800/50 animate-pulse rounded w-3/4" />
              <div className="h-2 bg-neutral-800/30 animate-pulse rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : error && !articles.length ? (
        <div className="px-6 py-4 text-[11px] text-[#b91a24] font-mono">⚠ {error}</div>
      ) : noKey && !articles.length ? (
        <div className="px-6 py-8 text-center">
          <p className="text-neutral-500 text-xs">Add NEWS_API_KEY to .env.local to enable live news.</p>
          <a href="https://newsapi.org" target="_blank" rel="noreferrer" className="text-[#4ae176] text-[10px] font-mono mt-1 block hover:underline">Get free key at newsapi.org →</a>
        </div>
      ) : articles.length === 0 ? (
        <div className="px-6 py-8 text-center text-neutral-500 text-xs">No articles found for these companies.</div>
      ) : (
        <div className="divide-y divide-neutral-800/20 max-h-[420px] overflow-y-auto">
          <AnimatePresence initial={false}>
            {articles.map((a, i) => (
              <motion.a
                key={a.url || i}
                href={a.url}
                target="_blank"
                rel="noreferrer"
                className="block px-6 py-4 hover:bg-neutral-800/20 transition-colors"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03, duration: 0.25 }}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 bg-surface-container-highest text-neutral-400 border border-neutral-700">
                        {a.company}
                      </span>
                      <SentimentBadge title={a.title} />
                      <span className="text-[9px] text-neutral-600 font-mono">{timeAgo(a.publishedAt)}</span>
                    </div>
                    <p className="text-xs text-neutral-200 leading-snug line-clamp-2">{a.title}</p>
                    {a.source && (
                      <p className="text-[9px] text-neutral-600 font-mono mt-1">{a.source}</p>
                    )}
                  </div>
                  <span className="text-neutral-600 text-xs shrink-0 mt-1">↗</span>
                </div>
              </motion.a>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
