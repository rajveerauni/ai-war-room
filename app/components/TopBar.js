'use client';
import { useState } from 'react';
import { useWarRoomData } from '../../lib/useWarRoomData';

export default function TopBar({ title }) {
  const { data } = useWarRoomData();
  const [searchVal, setSearchVal] = useState('');

  function openSettings() {
    window.dispatchEvent(new CustomEvent('open-settings'));
  }

  const initials = data?.companyName
    ? data.companyName.split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() || '').join('')
    : 'CC';

  function handleSearchKeyDown(e) {
    if (e.key === 'Enter' && searchVal.trim()) {
      window.dispatchEvent(new CustomEvent('query-intel', { detail: { query: searchVal.trim() } }));
      setSearchVal('');
    }
  }

  return (
    <header className="fixed top-0 right-0 w-[calc(100%-220px)] z-40 bg-neutral-950/80 backdrop-blur-md border-b border-neutral-800/50 flex justify-between items-center px-8 py-4">
      <div className="flex items-center gap-4">
        <h2 className="text-xl font-bold tracking-tighter text-white">{title}</h2>
        <div className="h-4 w-px bg-neutral-800" />
        <span className="text-[10px] font-medium uppercase tracking-widest text-neutral-500">Live Telemetry</span>
      </div>

      <div className="flex items-center gap-6">
        {/* Search */}
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-neutral-500 text-sm pointer-events-none">
            search
          </span>
          <input
            value={searchVal}
            onChange={(e) => setSearchVal(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            className="bg-surface-container-lowest border-none text-[11px] font-mono w-48 py-1.5 pl-9 pr-4 focus:ring-1 focus:ring-white transition-all placeholder:text-neutral-700 focus:outline-none"
            placeholder="QUERY_INTEL..."
            type="text"
            aria-label="Search"
          />
        </div>

        {/* Icons */}
        <div className="flex items-center gap-4">
          <button
            aria-label="Notifications"
            className="material-symbols-outlined text-neutral-400 hover:text-white transition-colors cursor-pointer bg-transparent border-none"
          >
            notifications
          </button>
          <button
            onClick={openSettings}
            aria-label="Settings"
            className="material-symbols-outlined text-neutral-400 hover:text-white transition-colors cursor-pointer bg-transparent border-none"
          >
            settings
          </button>
          <div
            className="w-8 h-8 rounded-sm overflow-hidden border border-outline-variant cursor-pointer"
            title={data?.companyName || 'Profile'}
          >
            <div className="flex items-center justify-center w-full h-full bg-gray-700 text-white text-xs font-bold">
              {initials}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
