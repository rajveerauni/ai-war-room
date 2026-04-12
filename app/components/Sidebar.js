'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

const navItems = [
  { name: 'Dashboard', href: '/', icon: 'dashboard' },
  { name: 'Competitor Intel', href: '/competitor', icon: 'analytics' },
  { name: 'AI Chat', href: '/chat', icon: 'smart_toy' },
  { name: 'Reports', href: '/reports', icon: 'description' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [company, setCompany] = useState('');

  useEffect(() => {
    const name = localStorage.getItem('companyName');
    if (name) setCompany(name);
    const onStorage = () => {
      const updated = localStorage.getItem('companyName');
      if (updated) setCompany(updated);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  return (
    <aside className="w-[220px] h-screen fixed left-0 top-0 border-r border-neutral-800 bg-neutral-950 flex flex-col py-6 px-4 z-50">
      <motion.div
        className="mb-10 px-2"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >
        <h1 className="text-lg font-black tracking-tighter text-white uppercase">TACTICAL INTEL</h1>
        {company && (
          <motion.p
            className="text-[11px] text-neutral-500 mt-1 font-mono truncate"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.4 }}
          >
            {company}
          </motion.p>
        )}
      </motion.div>

      <nav className="flex-1 space-y-1">
        {navItems.map((item, index) => {
          const isActive = pathname === item.href;
          return (
            <motion.div
              key={item.name}
              className="relative overflow-hidden"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.08, duration: 0.35, ease: 'easeOut' }}
            >
              {/* Active pill — layout-animated so it smoothly moves between items */}
              {isActive && (
                <motion.div
                  layoutId="active-pill"
                  className="absolute inset-0 bg-white border-r-4 border-white"
                  transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                />
              )}

              {/* Hover background slide from left */}
              {!isActive && (
                <motion.div
                  className="absolute inset-0 bg-neutral-800 origin-left"
                  initial={{ scaleX: 0 }}
                  whileHover={{ scaleX: 1 }}
                  transition={{ duration: 0.18, ease: 'easeOut' }}
                />
              )}

              <Link
                href={item.href}
                className={`relative z-10 flex items-center gap-3 px-3 py-2 transition-colors duration-150 ${
                  isActive ? 'text-black font-bold' : 'text-neutral-500 hover:text-white'
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                <span className="font-inter tracking-tight font-semibold uppercase text-xs">{item.name}</span>
              </Link>
            </motion.div>
          );
        })}
      </nav>

      <motion.div
        className="mt-auto border-t border-neutral-800 pt-6 px-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.4 }}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-sm bg-surface-container-highest flex items-center justify-center border border-outline-variant">
            <span className="material-symbols-outlined text-sm">shield</span>
          </div>
          <div>
            <p className="text-[10px] font-bold text-white uppercase tracking-wider leading-none">Status: Secured</p>
            <p className="text-[9px] text-secondary font-mono">OP_READY_V2.4</p>
          </div>
        </div>
      </motion.div>
    </aside>
  );
}
