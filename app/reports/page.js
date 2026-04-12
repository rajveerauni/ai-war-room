'use client';
import { useState, useRef } from 'react';
import TopBar from '../components/TopBar';
import { useWarRoomData } from '../../lib/useWarRoomData';
import { motion, AnimatePresence } from 'framer-motion';

function buildReportPrompt(data, liveData) {
  const comps = [data.competitor1, data.competitor2, data.competitor3].filter(Boolean).join(', ');
  let liveSection = '';

  if (liveData) {
    const uc = liveData.userCompany;
    liveSection = '\n\nLIVE MARKET DATA (fetched at report generation):';
    if (uc?.stock) liveSection += `\n${data.companyName}: $${uc.stock.price} (${uc.stock.change > 0 ? '+' : ''}${uc.stock.change}%), MCap: $${uc.stock.marketCap ? (uc.stock.marketCap / 1e9).toFixed(1) + 'B' : 'N/A'}`;
    (liveData.competitors || []).forEach((c) => {
      if (c.stock) liveSection += `\n${c.name}: $${c.stock.price} (${c.stock.change > 0 ? '+' : ''}${c.stock.change}%), Reddit: ${c.reddit?.sentiment || 'Neutral'}`;
    });
    const news = uc?.news?.articles || [];
    if (news.length) {
      liveSection += `\n\nRecent Headlines (${data.companyName}):`;
      news.slice(0, 3).forEach((a) => { liveSection += `\n• ${a.title}`; });
    }
  }

  return `You are a senior strategy consultant. Generate a comprehensive executive intelligence report for ${data.companyName}, a ${data.industry} company targeting ${data.revenueTarget}. Key competitors: ${comps}.${liveSection}

Structure with EXACTLY these headers (## prefix):

## Executive Summary
## Market Position & KPIs
## Competitive Landscape
## Threat & Risk Analysis
## Strategic Recommendations
## Revenue Path to Target

Write 2-4 paragraphs per section. Cite live data where available. Make it feel like a McKinsey intelligence brief. Be specific and actionable.`;
}

function parseReport(text) {
  const sections = [];
  let current = null;
  for (const line of text.split('\n')) {
    if (line.startsWith('## ')) {
      if (current) sections.push(current);
      current = { title: line.replace('## ', '').trim(), content: [] };
    } else if (current) {
      current.content.push(line);
    }
  }
  if (current) sections.push(current);
  if (!sections.length && text.trim()) sections.push({ title: 'Report', content: text.split('\n') });
  return sections.map((s) => ({ ...s, content: s.content.join('\n').trim() }));
}

function ReportSection({ section, index }) {
  return (
    <div className="print:break-inside-avoid">
      <div className="flex items-start gap-4 mb-3">
        <span className="text-[10px] font-black text-secondary font-mono shrink-0 mt-1">{String(index + 1).padStart(2, '0')}</span>
        <h3 className="text-sm font-black text-white uppercase tracking-widest">{section.title}</h3>
      </div>
      <div className="ml-8 space-y-2">
        {section.content.split('\n').filter(Boolean).map((line, i) => {
          if (line.startsWith('- ') || line.startsWith('• '))
            return <div key={i} className="flex gap-2 text-sm text-neutral-400 leading-relaxed"><span className="text-secondary shrink-0">›</span><span>{line.replace(/^[-•]\s/, '')}</span></div>;
          if (/^\*\*(.+)\*\*$/.test(line))
            return <p key={i} className="text-xs font-bold text-white uppercase tracking-wider mt-3">{line.replace(/\*\*/g, '')}</p>;
          return <p key={i} className="text-sm text-neutral-400 leading-relaxed">{line}</p>;
        })}
      </div>
    </div>
  );
}

const sectionVariants = { hidden: {}, visible: { transition: { staggerChildren: 0.2 } } };
const sectionItem = { hidden: { opacity: 0, y: 18 }, visible: { opacity: 1, y: 0, transition: { duration: 0.45 } } };

export default function ReportsPage() {
  const { data, loading } = useWarRoomData();
  const [generating, setGenerating] = useState(false);
  const [sections, setSections] = useState([]);
  const [error, setError] = useState('');
  const [generatedAt, setGeneratedAt] = useState(null);
  const [liveDataUsed, setLiveDataUsed] = useState(null);
  const reportRef = useRef(null);

  async function generateReport() {
    if (!data) return;
    setGenerating(true);
    setError('');
    setSections([]);

    // Fetch live data first
    let liveData = null;
    try {
      const companies = [data.companyName, data.competitor1, data.competitor2, data.competitor3].filter(Boolean);
      const res = await fetch(`/api/dashboard?companies=${encodeURIComponent(companies.join(','))}`);
      liveData = await res.json();
      setLiveDataUsed(liveData);
    } catch { /* continue without live data */ }

    try {
      const res = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'generate', prompt: buildReportPrompt(data, liveData) }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setSections(parseReport(json.text));
      setGeneratedAt(new Date().toISOString());
    } catch (err) {
      setError(err.message || 'Report generation failed.');
    } finally {
      setGenerating(false);
    }
  }

  const hasReport = sections.length > 0;

  return (
    <>
      <TopBar title="Reports" />

      <motion.div className="mb-8 print:hidden" initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <p className="text-xs font-bold text-secondary uppercase tracking-[0.2em] mb-1">Sector 04 // Executive Intelligence</p>
        <h3 className="text-4xl font-extrabold tracking-tighter text-white">Report Generation</h3>
        <p className="text-sm text-neutral-500 mt-1">Live data + Groq LLaMA 3.3 70B · PDF export</p>
      </motion.div>

      {/* Controls */}
      <motion.div className="bg-surface-container ghost-border p-6 mb-6 print:hidden" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.1 }}>
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex-1">
            {loading ? <div className="h-6 bg-neutral-800/40 animate-pulse rounded w-1/2" />
              : data ? (
                <div>
                  <p className="text-xs font-bold text-white uppercase tracking-wider">{data.companyName}</p>
                  <p className="text-[11px] text-neutral-500 font-mono mt-0.5">
                    {data.industry} · {data.revenueTarget} · {[data.competitor1, data.competitor2, data.competitor3].filter(Boolean).join(', ')}
                  </p>
                  {liveDataUsed && (
                    <p className="text-[9px] text-[#4ae176] font-mono mt-1">
                      ✓ Live data included: stock, trends, news, sentiment
                    </p>
                  )}
                </div>
              ) : <p className="text-sm text-neutral-500">Complete onboarding to generate your report.</p>}
          </div>
          <div className="flex gap-3">
            <AnimatePresence>
              {hasReport && (
                <motion.button onClick={() => window.print()}
                  className="px-5 py-2 bg-transparent border border-white text-white text-[11px] font-black uppercase tracking-widest print:hidden"
                  initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}
                  whileHover={{ scale: 1.05, y: -1 }} whileTap={{ scale: 0.97 }}>
                  ↓ EXPORT PDF
                </motion.button>
              )}
            </AnimatePresence>
            <motion.button onClick={generateReport} disabled={generating || !data || loading}
              className="px-6 py-2 bg-[#4ae176] text-black text-[11px] font-black uppercase tracking-widest disabled:opacity-40 disabled:cursor-not-allowed"
              whileHover={!generating ? { scale: 1.03 } : {}} whileTap={!generating ? { scale: 0.97 } : {}}>
              {generating ? (
                <span className="flex items-center gap-2">
                  <motion.span animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }} style={{ display: 'inline-block' }}>◌</motion.span>
                  FETCHING + GENERATING...
                </span>
              ) : hasReport ? 'REGENERATE' : 'GENERATE REPORT'}
            </motion.button>
          </div>
        </div>
      </motion.div>

      {/* Skeleton */}
      <AnimatePresence>
        {generating && (
          <motion.div className="space-y-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="bg-surface-container ghost-border p-6 space-y-3">
              <div className="h-4 bg-neutral-800/50 animate-pulse rounded w-1/4" />
              {[90, 70, 85, 60, 80].map((w, i) => <div key={i} className="h-3 bg-neutral-800/30 animate-pulse rounded" style={{ width: `${w}%` }} />)}
            </div>
            <p className="text-[10px] text-neutral-600 font-mono text-center uppercase tracking-widest">
              Fetching live market data → Groq generating brief...
            </p>
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

      {/* Report */}
      <AnimatePresence>
        {hasReport && !generating && (
          <motion.div ref={reportRef} className="bg-surface-container ghost-border overflow-hidden"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.45 }}>
            <div className="px-8 py-6 border-b border-neutral-800/50">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] font-bold text-secondary uppercase tracking-widest font-mono mb-1">CLASSIFIED // EYES ONLY</p>
                  <h2 className="text-2xl font-black tracking-tighter text-white uppercase">{data?.companyName} — Executive Intelligence Brief</h2>
                  <p className="text-[11px] text-neutral-500 font-mono mt-1">
                    {generatedAt && new Date(generatedAt).toLocaleString()} · {data?.industry} · Groq LLaMA 3.3 70B
                    {liveDataUsed && ' · Live Data Included'}
                  </p>
                </div>
                <motion.button onClick={() => window.print()}
                  className="print:hidden text-[10px] text-neutral-500 hover:text-white font-mono uppercase border border-neutral-700 px-3 py-1 hover:border-white transition-all"
                  whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
                  Print / PDF
                </motion.button>
              </div>
            </div>

            <div className="px-8 py-4 border-b border-neutral-800/30 bg-surface-container-low">
              <div className="flex flex-wrap gap-x-6 gap-y-1">
                {sections.map((s, i) => (
                  <span key={i} className="text-[10px] text-neutral-500 font-mono">
                    <span className="text-secondary">{String(i + 1).padStart(2, '0')}</span> {s.title}
                  </span>
                ))}
              </div>
            </div>

            <motion.div className="px-8 py-6 space-y-8 divide-y divide-neutral-800/30" variants={sectionVariants} initial="hidden" animate="visible">
              {sections.map((section, i) => (
                <motion.div key={i} variants={sectionItem} className={i > 0 ? 'pt-8' : ''}>
                  <ReportSection section={section} index={i} />
                </motion.div>
              ))}
            </motion.div>

            <div className="px-8 py-4 border-t border-neutral-800/30 bg-surface-container-low">
              <p className="text-[9px] text-neutral-700 font-mono uppercase tracking-widest">
                AI War Room · {data?.companyName} · Confidential · {generatedAt && new Date(generatedAt).toLocaleString()}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty */}
      <AnimatePresence>
        {!hasReport && !generating && !error && (
          <motion.div className="bg-surface-container ghost-border p-12 flex flex-col items-center justify-center text-center"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ delay: 0.2 }}>
            <div className="text-4xl mb-4 opacity-20">◉</div>
            <p className="text-white font-bold uppercase tracking-wider text-sm mb-1">No Report Generated</p>
            <p className="text-neutral-500 text-xs max-w-sm">
              {data
                ? `Generate will fetch live market data for all companies, then create a full brief for ${data.companyName}.`
                : 'Complete onboarding first.'}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`@media print { body { background: white !important; color: black !important; } .print\\:hidden { display: none !important; } }`}</style>
    </>
  );
}
