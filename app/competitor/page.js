'use client';
import { useState, useEffect } from 'react';
import TopBar from '../components/TopBar';
import { useWarRoomData, getInitials } from '../../lib/useWarRoomData';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip, Legend,
} from 'recharts';

const RADAR_METRICS = ['Innovation', 'Market Reach', 'Brand Power', 'Tech Capability', 'Customer NPS', 'Growth Rate'];

function parseGeminiResponse(text) {
  try {
    const m = text.match(/JSON:\s*(\{[\s\S]*?\})\s*END_JSON/);
    if (m) {
      const parsed = JSON.parse(m[1]);
      const am = text.match(/ANALYSIS:\s*([\s\S]+)/);
      return { structured: parsed, analysis: am?.[1]?.trim() || '' };
    }
  } catch { /* fallback */ }
  return { structured: null, analysis: text };
}

function buildRadarData(scores, companyName, competitorName) {
  if (!scores) return null;
  return RADAR_METRICS.map((metric) => ({
    metric,
    [companyName]: scores[metric]?.[0] ?? 50,
    [competitorName]: scores[metric]?.[1] ?? 50,
  }));
}

function ThreatBadgeStyle(level) {
  const map = {
    High:   'bg-[#b91a24]/10 border-[#b91a24] text-[#b91a24]',
    Medium: 'bg-yellow-500/10 border-yellow-500 text-yellow-500',
    Low:    'bg-[#4ae176]/10 border-[#4ae176] text-[#4ae176]',
  };
  return map[level] || map.Low;
}

const resultVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
};
const resultItem = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};

function LiveDataBadges({ dataUsed, liveData }) {
  if (!dataUsed) return null;
  return (
    <div className="flex flex-wrap gap-2 mt-3">
      {dataUsed.stock && <span className="text-[9px] font-mono px-2 py-0.5 border border-[#4ae176]/30 text-[#4ae176]">✓ Stock Data</span>}
      {dataUsed.news > 0 && <span className="text-[9px] font-mono px-2 py-0.5 border border-[#4ae176]/30 text-[#4ae176]">✓ {dataUsed.news} News Articles</span>}
      {dataUsed.reddit > 0 && (
        <span className={`text-[9px] font-mono px-2 py-0.5 border ${
          liveData?.reddit?.sentiment === 'Positive' ? 'border-[#4ae176]/30 text-[#4ae176]' :
          liveData?.reddit?.sentiment === 'Negative' ? 'border-[#b91a24]/30 text-[#b91a24]' :
          'border-neutral-700 text-neutral-400'
        }`}>
          Reddit: {liveData?.reddit?.sentiment}
        </span>
      )}
      {dataUsed.trends > 0 && <span className="text-[9px] font-mono px-2 py-0.5 border border-[#4ae176]/30 text-[#4ae176]">✓ Google Trends</span>}
    </div>
  );
}

export default function CompetitorPage() {
  const { data, loading } = useWarRoomData();
  const [selected, setSelected] = useState('');
  const [custom, setCustom] = useState('');
  const [result, setResult] = useState(null);
  const [analysing, setAnalysing] = useState(false);
  const [error, setError] = useState('');
  const [fetchedAt, setFetchedAt] = useState(null);
  const [dataUsed, setDataUsed] = useState(null);
  const [liveData, setLiveData] = useState(null);

  const competitors = data
    ? [data.competitor1, data.competitor2, data.competitor3].filter(Boolean)
    : [];

  useEffect(() => {
    if (competitors.length > 0 && !selected) setSelected(competitors[0]);
  }, [competitors.join(',')]);

  const targetName = custom.trim() || selected;

  async function analyze() {
    if (!targetName) return;
    setAnalysing(true);
    setError('');
    setResult(null);
    setDataUsed(null);

    try {
      const res = await fetch('/api/competitor-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          competitor: targetName,
          userCompany: data?.companyName || 'Our Company',
          industry: data?.industry || 'Technology',
        }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setResult(parseGeminiResponse(json.text));
      setDataUsed(json.dataUsed);
      setLiveData(json.liveData);
      setFetchedAt(json.fetchedAt);
    } catch (err) {
      setError(err.message || 'Analysis failed.');
    } finally {
      setAnalysing(false);
    }
  }

  const radarData = result?.structured?.radarScores && data
    ? buildRadarData(result.structured.radarScores, data.companyName || 'You', targetName)
    : null;

  return (
    <>
      <TopBar title="Competitor Intel" />

      <motion.div className="mb-8" initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <p className="text-xs font-bold text-secondary uppercase tracking-[0.2em] mb-1">Sector 02 // Competitive Intelligence</p>
        <h3 className="text-4xl font-extrabold tracking-tighter text-white">Threat Assessment Engine</h3>
        <p className="text-sm text-neutral-500 mt-1">
          Groq · LLaMA 3.3 70B · Yahoo Finance · NewsAPI · Reddit · Google Trends
        </p>
      </motion.div>

      {/* Input */}
      <motion.div className="bg-surface-container ghost-border p-6 mb-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.1 }}>
        <h4 className="text-xs font-bold text-white uppercase tracking-widest mb-4">Select Target</h4>
        {loading ? (
          <div className="h-10 bg-neutral-800/50 animate-pulse rounded" />
        ) : (
          <div className="flex flex-col md:flex-row gap-4">
            {competitors.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {competitors.map((c, i) => (
                  <motion.button key={c} onClick={() => { setSelected(c); setCustom(''); }}
                    className={`px-4 py-2 text-[11px] font-bold uppercase tracking-wider border transition-all ${selected === c && !custom ? 'bg-white text-black border-white' : 'bg-transparent text-neutral-400 border-neutral-700'}`}
                    whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                  >{c}</motion.button>
                ))}
              </div>
            )}
            <input value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="Or type any company name..."
              className="flex-1 px-3 py-2 bg-[#0e0e0e] border border-[#2a2a2a] text-white text-sm placeholder-neutral-600 focus:outline-none focus:border-[#4ae176] transition-colors font-mono" />
            <motion.button onClick={analyze} disabled={analysing || !targetName}
              className="px-6 py-2 bg-[#4ae176] text-black text-[11px] font-black uppercase tracking-widest disabled:opacity-40 disabled:cursor-not-allowed shrink-0 flex items-center gap-2"
              whileHover={!analysing ? { scale: 1.03 } : {}} whileTap={!analysing ? { scale: 0.97 } : {}}>
              {analysing ? (
                <><motion.span animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }} style={{ display: 'inline-block' }}>◌</motion.span>FETCHING LIVE DATA...</>
              ) : 'RUN ANALYSIS'}
            </motion.button>
          </div>
        )}
        {targetName && !analysing && (
          <p className="text-[10px] text-neutral-500 mt-3 font-mono">
            Target: <span className="text-white">{targetName}</span>
            {data?.companyName && <> · vs <span className="text-secondary">{data.companyName}</span></>}
            {fetchedAt && <> · Data: {new Date(fetchedAt).toLocaleTimeString()}</>}
          </p>
        )}
      </motion.div>

      {/* Loading */}
      <AnimatePresence>
        {analysing && (
          <motion.div className="space-y-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <p className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest">
              Fetching Yahoo Finance · NewsAPI · Reddit · Google Trends...
            </p>
            {[80, 60, 90, 50, 70].map((w, i) => (
              <div key={i} className="h-3 bg-neutral-800/40 animate-pulse rounded" style={{ width: `${w}%` }} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div className="bg-[#b91a24]/10 border border-[#b91a24] p-4 text-[#b91a24] text-sm font-mono"
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            ERROR: {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results */}
      <AnimatePresence>
        {result && !analysing && (
          <motion.div className="space-y-6" variants={resultVariants} initial="hidden" animate="visible">
            {/* Header */}
            <motion.div variants={resultItem} className="bg-surface-container ghost-border p-6 flex flex-col md:flex-row md:items-start gap-4">
              <div className="flex items-center gap-4 flex-1">
                <div className="w-12 h-12 bg-surface-container-highest border border-outline-variant flex items-center justify-center text-sm font-black text-white">
                  {getInitials(targetName)}
                </div>
                <div>
                  <h2 className="text-xl font-black tracking-tighter text-white uppercase">{targetName}</h2>
                  <p className="text-[10px] text-neutral-500 font-mono uppercase">Live Intelligence Report · {fetchedAt && new Date(fetchedAt).toLocaleString()}</p>
                  <LiveDataBadges dataUsed={dataUsed} liveData={liveData} />
                </div>
              </div>
              {result.structured?.threatLevel && (
                <span className={`inline-flex items-center gap-2 px-4 py-2 border text-sm font-black uppercase ${ThreatBadgeStyle(result.structured.threatLevel)}`}>
                  <span className={`w-2 h-2 rounded-full ${result.structured.threatLevel === 'High' ? 'bg-[#b91a24] animate-pulse' : result.structured.threatLevel === 'Medium' ? 'bg-yellow-500' : 'bg-[#4ae176]'}`} />
                  {result.structured.threatLevel} Threat
                </span>
              )}
            </motion.div>

            {/* Stock + Reddit inline stats */}
            {liveData && (liveData.stock || liveData.reddit) && (
              <motion.div variants={resultItem} className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {liveData.stock && [
                  { label: 'Price', val: `$${liveData.stock.price}` },
                  { label: 'Today', val: `${liveData.stock.change > 0 ? '+' : ''}${liveData.stock.change}%`, color: liveData.stock.change >= 0 ? 'text-[#4ae176]' : 'text-[#b91a24]' },
                  { label: 'Market Cap', val: liveData.stock.marketCap ? `$${(liveData.stock.marketCap / 1e9).toFixed(1)}B` : '—' },
                  { label: '52W Range', val: `$${liveData.stock.low52}–$${liveData.stock.high52}` },
                ].map(({ label, val, color }) => (
                  <div key={label} className="bg-surface-container ghost-border p-4">
                    <p className="text-[9px] text-neutral-500 uppercase font-bold tracking-widest mb-1">{label}</p>
                    <p className={`text-sm font-black font-mono ${color || 'text-white'}`}>{val}</p>
                  </div>
                ))}
              </motion.div>
            )}

            {/* Radar */}
            {radarData && (
              <motion.div variants={resultItem} className="bg-surface-container ghost-border p-6">
                <h4 className="text-xs font-bold text-white uppercase tracking-widest mb-6">
                  Competitive Radar — {data?.companyName || 'You'} vs {targetName}
                </h4>
                <div className="h-[320px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={radarData} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
                      <PolarGrid stroke="#333" />
                      <PolarAngleAxis dataKey="metric" tick={{ fill: '#888', fontSize: 11 }} />
                      <Tooltip contentStyle={{ backgroundColor: '#131313', border: '1px solid #333', color: '#e5e2e1' }} />
                      <Legend wrapperStyle={{ fontSize: 11, color: '#888' }} />
                      <Radar name={data?.companyName || 'You'} dataKey={data?.companyName || 'You'} stroke="#4ae176" fill="#4ae176" fillOpacity={0.15} strokeWidth={2} />
                      <Radar name={targetName} dataKey={targetName} stroke="#b91a24" fill="#b91a24" fillOpacity={0.1} strokeWidth={2} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>
            )}

            {/* Cards */}
            {result.structured && (
              <motion.div variants={resultItem} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { title: 'Strengths', key: 'strengths', icon: '▲', color: 'text-[#b91a24]', border: 'border-[#b91a24]/30' },
                  { title: 'Weaknesses', key: 'weaknesses', icon: '▼', color: 'text-yellow-500', border: 'border-yellow-500/30' },
                  { title: 'Recommendations', key: 'recommendations', icon: '→', color: 'text-[#4ae176]', border: 'border-[#4ae176]/30' },
                ].map(({ title, key, icon, color, border }) => (
                  <div key={key} className={`bg-surface-container ghost-border p-5 border-t-2 ${border}`}>
                    <h5 className={`text-[10px] font-black uppercase tracking-widest mb-4 ${color}`}>{icon} {title}</h5>
                    <ul className="space-y-3">
                      {(result.structured[key] || []).map((item, i) => (
                        <li key={i} className="flex gap-2 text-xs text-neutral-300 leading-relaxed">
                          <span className={`${color} shrink-0 font-mono`}>{String(i + 1).padStart(2, '0')}</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </motion.div>
            )}

            {/* Analysis */}
            {result.analysis && (
              <motion.div variants={resultItem} className="bg-surface-container ghost-border p-6">
                <h4 className="text-xs font-bold text-white uppercase tracking-widest mb-4">Strategic Analysis</h4>
                <div className="space-y-3">
                  {result.analysis.split('\n\n').filter(Boolean).map((para, i) => (
                    <p key={i} className="text-sm text-neutral-400 leading-relaxed">{para}</p>
                  ))}
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty */}
      <AnimatePresence>
        {!result && !analysing && !error && (
          <motion.div className="bg-surface-container ghost-border p-12 flex flex-col items-center justify-center text-center"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ delay: 0.2 }}>
            <div className="text-4xl mb-4 opacity-20">◎</div>
            <p className="text-white font-bold uppercase tracking-wider text-sm mb-1">No Analysis Running</p>
            <p className="text-neutral-500 text-xs max-w-sm">Select a competitor and click RUN ANALYSIS. Live data will be fetched from multiple sources before Groq generates the report.</p>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
