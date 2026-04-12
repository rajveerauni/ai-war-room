'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const industries = [
  'Technology', 'SaaS / Software', 'E-Commerce', 'Finance / FinTech',
  'Healthcare', 'Marketing / AdTech', 'Media & Entertainment',
  'Manufacturing', 'Retail', 'Education', 'Other',
];

const KEYS = ['companyName', 'industry', 'competitor1', 'competitor2', 'competitor3', 'revenueTarget'];

function readAll() {
  const out = {};
  KEYS.forEach((k) => { out[k] = localStorage.getItem(k) || ''; });
  return out;
}

const fieldVariants = {
  hidden: { opacity: 0, x: 15 },
  visible: (i) => ({
    opacity: 1, x: 0,
    transition: { delay: i * 0.06, duration: 0.3, ease: 'easeOut' },
  }),
};

export default function SettingsDrawer() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    companyName: '', industry: '', competitor1: '', competitor2: '', competitor3: '', revenueTarget: '',
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const handler = () => { setOpen(true); setForm(readAll()); setSaved(false); };
    window.addEventListener('open-settings', handler);
    return () => window.removeEventListener('open-settings', handler);
  }, []);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function save(e) {
    e.preventDefault();
    KEYS.forEach((k) => localStorage.setItem(k, form[k]));
    window.dispatchEvent(new Event('storage'));
    setSaved(true);
    setTimeout(() => { setSaved(false); setOpen(false); }, 900);
  }

  function resetOnboarding() {
    if (!confirm('This will clear all war room data and re-run onboarding. Continue?')) return;
    KEYS.forEach((k) => localStorage.removeItem(k));
    window.location.reload();
  }

  const inputClass = 'w-full px-3 py-2 bg-[#0e0e0e] border border-[#2a2a2a] text-white text-sm placeholder-neutral-600 focus:outline-none focus:border-[#4ae176] transition-colors font-mono';

  const fields = [
    { label: 'Company Name', name: 'companyName', type: 'input', placeholder: 'ACME Corp', required: true },
    { label: 'Industry', name: 'industry', type: 'select', required: true },
    { label: 'Revenue Target', name: 'revenueTarget', type: 'input', placeholder: '$10M ARR', required: true },
    { label: 'Competitor 1', name: 'competitor1', type: 'input', placeholder: 'Competitor 1' },
    { label: 'Competitor 2', name: 'competitor2', type: 'input', placeholder: 'Competitor 2' },
    { label: 'Competitor 3', name: 'competitor3', type: 'input', placeholder: 'Competitor 3' },
  ];

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Overlay */}
          <motion.div
            key="settings-overlay"
            className="fixed inset-0 bg-black/60 z-[90] backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setOpen(false)}
          />

          {/* Drawer */}
          <motion.div
            key="settings-drawer"
            className="fixed top-0 right-0 h-screen w-full max-w-sm bg-[#111111] border-l border-[#222] z-[95] flex flex-col shadow-2xl"
            initial={{ x: 400 }}
            animate={{ x: 0 }}
            exit={{ x: 400 }}
            transition={{ type: 'spring', stiffness: 320, damping: 35 }}
          >
            {/* Header */}
            <div className="px-6 py-5 border-b border-[#222] flex items-center justify-between shrink-0">
              <div>
                <p className="text-[10px] font-bold text-[#4ae176] uppercase tracking-widest font-mono mb-0.5">SYSTEM CONFIG</p>
                <h2 className="text-lg font-black tracking-tighter text-white uppercase">Settings</h2>
              </div>
              <motion.button
                onClick={() => setOpen(false)}
                className="text-neutral-500 hover:text-white transition-colors text-xl leading-none bg-transparent border-none cursor-pointer"
                whileHover={{ scale: 1.15, rotate: 90 }}
                transition={{ duration: 0.2 }}
              >
                ✕
              </motion.button>
            </div>

            {/* Form */}
            <form onSubmit={save} className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
              {fields.map((field, i) => (
                <motion.div key={field.name} custom={i} variants={fieldVariants} initial="hidden" animate="visible">
                  <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest block mb-1">
                    {field.label}
                  </label>
                  {field.type === 'select' ? (
                    <select name={field.name} value={form[field.name]} onChange={handleChange} className={inputClass + ' cursor-pointer'} required={field.required}>
                      <option value="" disabled>Select industry...</option>
                      {industries.map((ind) => <option key={ind} value={ind}>{ind}</option>)}
                    </select>
                  ) : (
                    <input name={field.name} value={form[field.name]} onChange={handleChange} className={inputClass} placeholder={field.placeholder} required={field.required} />
                  )}
                </motion.div>
              ))}

              <motion.div custom={fields.length} variants={fieldVariants} initial="hidden" animate="visible" className="pt-2 space-y-2">
                <motion.button
                  type="submit"
                  className={`w-full py-3 text-sm font-black uppercase tracking-widest transition-colors ${saved ? 'bg-[#4ae176] text-black' : 'bg-[#22c55e] text-black'}`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ duration: 0.15 }}
                >
                  {saved ? '✓ SAVED' : 'SAVE CHANGES'}
                </motion.button>
                <button type="button" onClick={resetOnboarding} className="w-full py-2 text-[10px] font-bold uppercase tracking-widest text-neutral-600 hover:text-[#b91a24] border border-transparent hover:border-[#b91a24]/30 transition-all">
                  Reset & Re-run Onboarding
                </button>
              </motion.div>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
