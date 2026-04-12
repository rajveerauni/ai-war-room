'use client';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const industries = [
  'Technology', 'SaaS / Software', 'E-Commerce', 'Finance / FinTech',
  'Healthcare', 'Marketing / AdTech', 'Media & Entertainment',
  'Manufacturing', 'Retail', 'Education', 'Other',
];

const fieldVariants = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1, delayChildren: 0.2 } },
};

export default function OnboardingOverlay() {
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({
    companyName: '', industry: '', competitor1: '', competitor2: '',
    competitor3: '', revenueTarget: '',
  });

  useEffect(() => {
    const stored = localStorage.getItem('companyName');
    if (!stored) setShow(true);
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    Object.entries(form).forEach(([key, value]) => localStorage.setItem(key, value));
    window.dispatchEvent(new Event('storage'));
    setShow(false);
  };

  const inputClass = 'w-full px-3 py-2 bg-[#0e0e0e] border border-[#2a2a2a] text-white text-sm placeholder-neutral-600 focus:outline-none focus:border-[#4ae176] transition-colors font-mono';

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="onboarding-overlay"
          className="fixed inset-0 bg-[#0a0a0a]/95 flex items-center justify-center z-[100] backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <motion.div
            className="bg-[#111111] border border-[#222222] w-full max-w-md p-8"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          >
            <div className="mb-6">
              <p className="text-[10px] font-bold text-[#4ae176] uppercase tracking-widest mb-1 font-mono">SYSTEM INIT</p>
              <h2 className="text-2xl font-black tracking-tighter text-white uppercase">Setup War Room</h2>
              <p className="text-xs text-neutral-500 mt-1">Configure your tactical intelligence profile</p>
            </div>

            <motion.form
              onSubmit={handleSubmit}
              className="space-y-3"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              <motion.div variants={fieldVariants}>
                <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest block mb-1">Company Name</label>
                <input name="companyName" className={inputClass} placeholder="ACME Corp" required value={form.companyName} onChange={handleChange} />
              </motion.div>

              <motion.div variants={fieldVariants}>
                <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest block mb-1">Industry</label>
                <select name="industry" className={inputClass + ' cursor-pointer'} required value={form.industry} onChange={handleChange}>
                  <option value="" disabled>Select industry...</option>
                  {industries.map((ind) => <option key={ind} value={ind}>{ind}</option>)}
                </select>
              </motion.div>

              <motion.div variants={fieldVariants} className="grid grid-cols-3 gap-2">
                {['competitor1', 'competitor2', 'competitor3'].map((field, i) => (
                  <div key={field}>
                    <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest block mb-1">Rival {i + 1}</label>
                    <input name={field} className={inputClass} placeholder={`Enemy_${i + 1}`} required value={form[field]} onChange={handleChange} />
                  </div>
                ))}
              </motion.div>

              <motion.div variants={fieldVariants}>
                <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest block mb-1">Revenue Target</label>
                <input name="revenueTarget" className={inputClass} placeholder="$10M ARR" required value={form.revenueTarget} onChange={handleChange} />
              </motion.div>

              <motion.div variants={fieldVariants}>
                <motion.button
                  type="submit"
                  className="mt-2 w-full py-3 bg-[#22c55e] text-black text-sm font-black uppercase tracking-widest"
                  whileHover={{ scale: 1.02, backgroundColor: '#4ae176' }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ duration: 0.15 }}
                >
                  Launch War Room
                </motion.button>
              </motion.div>
            </motion.form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
