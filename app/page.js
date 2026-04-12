'use client';
import { useState, useEffect, useCallback } from 'react';
import TopBar from './components/TopBar';
import NewsFeed from './components/NewsFeed';
import { useWarRoomData, getInitials } from '../lib/useWarRoomData';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, Legend,
} from 'recharts';

// ─── KPIs stay user-provided ─────────────────────────────────────────────────
const kpis = [
  { label: 'Total Revenue', value: '$2.4M', change: '+12.4%', positive: true, bar: 75 },
  { label: 'Churn Rate', value: '3.2%', change: '-0.4%', positive: true, bar: 25 },
  { label: 'Market Share', value: '18.7%', change: '+2.1%', positive: true, bar: 50 },
  { label: 'NPS Score', value: '67', change: '+5', positive: true, bar: 67 },
];

const cardContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};
const cardItem = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: 'easeOut' } },
};

function fmt(n, unit = '') {
  if (n == null) return '—';
  if (unit === 'B') return `$${(n / 1e9).toFixed(1)}B`;
  if (unit === 'M') return `$${(n / 1e6).toFixed(0)}M`;
  return `${n}`;
}

function ChangeBadge({ val }) {
  if (val == null) return <span className="text-neutral-600 text-[10px]">—</span>;
  const pos = val >= 0;
  return (
    <span className={`text-[10px] font-bold ${pos ? 'text-[#4ae176]' : 'text-[#b91a24]'}`}>
      {pos ? '↑' : '↓'} {Math.abs(val).toFixed(2)}%
    </span>
  );
}

function StaleBadge() {
  return <span className="text-[9px] font-mono text-yellow-500 border border-yellow-500/30 px-1.5 py-0.5">⚠ DATA MAY BE STALE</span>;
}

function DataSourceBadge({ count, label }) {
  return (
    <span className="text-[9px] font-mono text-[#4ae176] border border-[#4ae176]/30 px-1.5 py-0.5">
      {count} {label}
    </span>
  );
}

const PriceTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#131313', border: '1px solid #333', padding: '8px 12px' }}>
      <p style={{ color: '#888', fontSize: 10, marginBottom: 2 }}>{label}</p>
      <p style={{ color: '#4ae176', fontSize: 13, fontWeight: 900, margin: 0 }}>${payload[0].value}</p>
    </div>
  );
};

const TrendsTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#131313', border: '1px solid #333', padding: '8px 12px' }}>
      <p style={{ color: '#888', fontSize: 10, marginBottom: 4 }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.stroke, fontSize: 11, margin: '2px 0', fontWeight: 700 }}>
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  );
};

// Builds a recharts-compatible dataset from multiple companies' trends arrays
function mergeTrends(userTrends, userLabel, competitors) {
  if (!userTrends?.length) return null;
  // Use dates from user trends as x-axis; sample every ~4 weeks for readability
  const sampled = userTrends.filter((_, i) => i % 4 === 0).slice(-12);
  return sampled.map((d) => {
    const point = { date: d.date, [userLabel]: d.value };
    competitors.forEach((c) => {
      if (c.trends?.length) {
        const match = c.trends.find((t) => t.date === d.date);
        point[c.name] = match ? match.value : null;
      }
    });
    return point;
  });
}

const COLORS = ['#4ae176', '#b91a24', '#f59e0b', '#60a5fa'];

function ThreatBadgeStyle(level) {
  const map = {
    High:   { badge: 'bg-[#b91a24]/10 border-[#b91a24] text-[#b91a24]', dot: 'bg-[#b91a24]', status: 'Aggressive', pulse: true },
    Medium: { badge: 'bg-yellow-500/10 border-yellow-500 text-yellow-500', dot: 'bg-yellow-500', status: 'Monitoring', pulse: false },
    Low:    { badge: 'bg-[#4ae176]/10 border-[#4ae176] text-[#4ae176]', dot: 'bg-[#4ae176]', status: 'Stable', pulse: false },
  };
  return map[level] || map.Low;
}

function getThreat(stock, reddit) {
  let score = 0;
  if (stock?.change > 5) score += 2;
  else if (stock?.change > 0) score += 1;
  else if (stock?.change < -5) score -= 1;
  if (reddit?.sentiment === 'Positive') score += 1;
  if (reddit?.sentiment === 'Negative') score -= 1;
  if (score >= 2) return 'High';
  if (score >= 0) return 'Medium';
  return 'Low';
}

export default function Dashboard() {
  const { data, loading: userLoading } = useWarRoomData();
  const [dashData, setDashData] = useState(null);
  const [fetching, setFetching] = useState(false);
  const [stale, setStale] = useState(false);
  const [fetchedAt, setFetchedAt] = useState(null);

  const companies = data
    ? [data.companyName, data.competitor1, data.competitor2, data.competitor3].filter(Boolean)
    : [];

  const loadDashboard = useCallback(async () => {
    if (!companies.length) return;
    setFetching(true);
    try {
      const res = await fetch(`/api/dashboard?companies=${encodeURIComponent(companies.join(','))}`);
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setDashData(json);
      setFetchedAt(json.fetchedAt);
      setStale(false);
    } catch {
      setStale(true);
    } finally {
      setFetching(false);
    }
  }, [companies.join(',')]);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  const uc = dashData?.userCompany;
  const comps = dashData?.competitors || [];

  // Chart datasets
  const priceHistory = uc?.stockHistory || null;
  const trendsData = mergeTrends(uc?.trends, data?.companyName, comps);
  const allCompanies = [data?.companyName, ...comps.map((c) => c.name)].filter(Boolean);

  return (
    <>
      <TopBar title="Dashboard" />

      {/* Header */}
      <motion.div className="mb-8" initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <p className="text-xs font-bold text-secondary uppercase tracking-[0.2em] mb-1">Sector 01 // Global Operations</p>
        <div className="flex items-end justify-between flex-wrap gap-3">
          <div>
            <h3 className="text-4xl font-extrabold tracking-tighter text-white">Real-time business intelligence</h3>
            {data?.industry && <p className="text-sm text-neutral-500 mt-1 font-mono">{data.industry} · Target: {data.revenueTarget}</p>}
          </div>
          <div className="flex items-center gap-3">
            {stale && <StaleBadge />}
            {fetchedAt && <span className="text-[9px] text-neutral-600 font-mono">{new Date(fetchedAt).toLocaleTimeString()}</span>}
            <motion.button
              onClick={loadDashboard}
              disabled={fetching || userLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-neutral-700 text-[10px] font-bold uppercase text-neutral-400 hover:text-white hover:border-white transition-all disabled:opacity-40"
              whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
            >
              <motion.span
                animate={fetching ? { rotate: 360 } : { rotate: 0 }}
                transition={fetching ? { duration: 0.8, repeat: Infinity, ease: 'linear' } : {}}
                style={{ display: 'inline-block' }}
              >↻</motion.span>
              {fetching ? 'Refreshing...' : 'Refresh'}
            </motion.button>
          </div>
        </div>
      </motion.div>

      {/* KPI Cards — user provided */}
      <motion.section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8" variants={cardContainer} initial="hidden" animate="visible">
        {kpis.map((kpi) => (
          <motion.div key={kpi.label} variants={cardItem} whileHover={{ scale: 1.02, transition: { duration: 0.18 } }} className="bg-surface-container-low p-5 ghost-border cursor-default">
            <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest block mb-4">{kpi.label}</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black tabular-nums text-white">{kpi.value}</span>
              <span className={`text-[10px] font-bold ${kpi.positive ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
                {kpi.positive ? '↑' : '↓'} {kpi.change}
              </span>
            </div>
            <div className="mt-4 h-[2px] bg-neutral-800 w-full overflow-hidden">
              <motion.div className="h-full bg-secondary" initial={{ width: 0 }} animate={{ width: `${kpi.bar}%` }} transition={{ type: 'spring', stiffness: 60, damping: 18, delay: 0.3 }} />
            </div>
          </motion.div>
        ))}
      </motion.section>

      {/* Stock Price History */}
      <motion.section className="bg-surface-container p-6 mb-8 ghost-border" initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}>
        <div className="flex justify-between items-center mb-6 flex-wrap gap-3">
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-widest">
              {uc?.stock ? `${data?.companyName} · Stock Price (30d)` : `${data?.companyName} · Market Data`}
            </h4>
            <p className="text-[10px] text-neutral-500 uppercase tracking-tighter mt-0.5">
              {uc?.stock
                ? `$${uc.stock.price} · MCap: ${fmt(uc.stock.marketCap, 'B')} · ${uc.stock.change > 0 ? '+' : ''}${uc.stock.change}% today`
                : 'Live price data via Yahoo Finance'}
            </p>
          </div>
          <div className="flex gap-2 items-center">
            {uc?.stock && <DataSourceBadge count="Yahoo Finance" label="LIVE" />}
            <motion.a href="/reports" className="px-3 py-1 bg-white text-black text-[10px] font-bold uppercase tracking-tighter border border-white" whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
              FULL_REPORT
            </motion.a>
          </div>
        </div>
        <div className="h-[280px] w-full">
          {fetching && !priceHistory ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-neutral-600 text-xs font-mono animate-pulse">FETCHING MARKET DATA...</div>
            </div>
          ) : priceHistory ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={priceHistory} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                <XAxis dataKey="date" stroke="#555" tick={{ fill: '#888', fontSize: 10 }} interval={4} />
                <YAxis stroke="#555" tick={{ fill: '#888', fontSize: 10 }} tickFormatter={(v) => `$${v}`} domain={['auto', 'auto']} />
                <Tooltip content={<PriceTooltip />} cursor={{ stroke: '#333', strokeWidth: 1 }} />
                <Line type="monotone" dataKey="price" stroke="#4ae176" strokeWidth={2.5} dot={false} activeDot={{ r: 5, fill: '#4ae176' }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center gap-2">
              <p className="text-neutral-500 text-xs">No stock data — {data?.companyName} may be private.</p>
              <p className="text-neutral-600 text-[10px] font-mono">Yahoo Finance returned no results.</p>
            </div>
          )}
        </div>
      </motion.section>

      {/* Google Trends + Competitor Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        {/* Trends chart */}
        <motion.div className="lg:col-span-2 bg-surface-container p-6 ghost-border" initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}>
          <div className="flex justify-between items-start mb-6 flex-wrap gap-2">
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-widest">Search Interest Comparison</h4>
              <p className="text-[10px] text-neutral-500 mt-0.5 uppercase">12-month Google Trends · all companies</p>
            </div>
            <DataSourceBadge count="Google" label="TRENDS" />
          </div>
          {fetching && !trendsData ? (
            <div className="h-[240px] flex items-center justify-center">
              <div className="text-neutral-600 text-xs font-mono animate-pulse">LOADING TRENDS...</div>
            </div>
          ) : trendsData ? (
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendsData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" />
                  <XAxis dataKey="date" stroke="#555" tick={{ fill: '#666', fontSize: 9 }} interval={2} />
                  <YAxis stroke="#555" tick={{ fill: '#666', fontSize: 9 }} domain={[0, 100]} />
                  <Tooltip content={<TrendsTooltip />} cursor={{ stroke: '#333' }} />
                  <Legend wrapperStyle={{ fontSize: 10, color: '#888' }} />
                  {allCompanies.map((name, i) => (
                    <Line key={name} type="monotone" dataKey={name} stroke={COLORS[i % COLORS.length]} strokeWidth={i === 0 ? 2.5 : 1.5} dot={false} connectNulls />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[240px] flex items-center justify-center text-neutral-600 text-xs font-mono">TRENDS UNAVAILABLE</div>
          )}
        </motion.div>

        {/* Competitor metrics panel */}
        <motion.div className="bg-surface-container p-6 ghost-border flex flex-col" initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.15 }}>
          <h4 className="text-xs font-bold text-white uppercase tracking-widest mb-5">Competitor Metrics</h4>
          {fetching && !comps.length ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => <div key={i} className="h-12 bg-neutral-800/40 animate-pulse rounded" />)}
            </div>
          ) : (
            <div className="space-y-4 flex-1">
              {comps.map((c, i) => (
                <motion.div key={c.name} className="space-y-1.5" initial={{ opacity: 0, x: 12 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1, duration: 0.35 }}>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-white uppercase truncate max-w-[55%]">{c.name}</span>
                    {c.stock && <ChangeBadge val={c.stock.change} />}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {c.stock && <span className="text-[9px] font-mono text-neutral-400">${c.stock.price} · {fmt(c.stock.marketCap, 'B')}</span>}
                    <span className={`text-[9px] px-1 border ${
                      c.reddit?.sentiment === 'Positive' ? 'border-[#4ae176]/40 text-[#4ae176]' :
                      c.reddit?.sentiment === 'Negative' ? 'border-[#b91a24]/40 text-[#b91a24]' :
                      'border-neutral-700 text-neutral-500'
                    }`}>
                      r/{c.reddit?.sentiment || '—'}
                    </span>
                  </div>
                  <div className="h-[1px] bg-neutral-800/50" />
                </motion.div>
              ))}
              {!fetching && !comps.length && (
                <p className="text-neutral-600 text-xs font-mono">Complete onboarding to see competitor metrics.</p>
              )}
            </div>
          )}
        </motion.div>
      </div>

      {/* Competitor Intel Table — live data */}
      <motion.div className="bg-surface-container ghost-border overflow-hidden mb-8" initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}>
        <div className="px-6 py-4 bg-surface-container-low flex justify-between items-center border-b border-neutral-800/30">
          <h4 className="text-xs font-bold text-white uppercase tracking-widest">Active Competitor Intel</h4>
          <div className="flex items-center gap-3">
            {fetchedAt && <span className="text-[10px] text-secondary font-mono">LIVE · {new Date(fetchedAt).toLocaleTimeString()}</span>}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-neutral-800/50">
                {['Company', 'Stock Price', 'Change', 'Market Cap', 'Sentiment', 'Threat'].map((h) => (
                  <th key={h} className="px-6 py-4 text-[10px] font-bold text-neutral-500 uppercase tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/30">
              <AnimatePresence>
                {fetching && !comps.length ? (
                  [1, 2, 3].map((i) => (
                    <tr key={i}>
                      <td colSpan={6} className="px-6 py-3">
                        <div className="h-4 bg-neutral-800/40 animate-pulse rounded" style={{ width: `${60 + i * 10}%` }} />
                      </td>
                    </tr>
                  ))
                ) : comps.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-neutral-500 text-xs">Complete onboarding to see live competitor data.</td>
                  </tr>
                ) : (
                  comps.map((comp, i) => {
                    const threat = getThreat(comp.stock, comp.reddit);
                    const style = ThreatBadgeStyle(threat);
                    return (
                      <motion.tr key={comp.name} className="hover:bg-neutral-800/20 transition-colors" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.07, duration: 0.3 }}>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-6 h-6 bg-surface-container-highest flex items-center justify-center border border-outline-variant text-[10px] font-black text-white shrink-0">
                              {getInitials(comp.name)}
                            </div>
                            <div>
                              <span className="text-xs font-bold text-white uppercase tracking-tight block">{comp.name}</span>
                              {comp.stock?.ticker && <span className="text-[9px] text-neutral-600 font-mono">{comp.stock.ticker}</span>}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-xs font-mono text-neutral-300">
                          {comp.stock ? `$${comp.stock.price}` : <span className="text-neutral-600">Private</span>}
                        </td>
                        <td className="px-6 py-4">{comp.stock ? <ChangeBadge val={comp.stock.change} /> : <span className="text-neutral-600 text-[10px]">—</span>}</td>
                        <td className="px-6 py-4 text-xs font-mono text-neutral-400">{comp.stock ? fmt(comp.stock.marketCap, 'B') : '—'}</td>
                        <td className="px-6 py-4">
                          <span className={`text-[9px] px-2 py-0.5 border ${
                            comp.reddit?.sentiment === 'Positive' ? 'bg-[#4ae176]/10 border-[#4ae176]/40 text-[#4ae176]' :
                            comp.reddit?.sentiment === 'Negative' ? 'bg-[#b91a24]/10 border-[#b91a24]/40 text-[#b91a24]' :
                            'bg-neutral-800 border-neutral-700 text-neutral-400'
                          } font-black uppercase`}>
                            {comp.reddit?.sentiment || 'Neutral'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className={`w-1.5 h-1.5 rounded-full ${style.dot} ${style.pulse ? 'animate-pulse' : ''}`} />
                            <span className={`inline-flex px-2 py-0.5 border text-[9px] font-black uppercase ${style.badge}`}>{threat}</span>
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })
                )}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Live News Feed */}
      <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}>
        {companies.length > 0 && <NewsFeed companies={companies} />}
      </motion.div>
    </>
  );
}
