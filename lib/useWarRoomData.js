'use client';
import { useState, useEffect, useCallback } from 'react';

const KEYS = ['companyName', 'industry', 'competitor1', 'competitor2', 'competitor3', 'revenueTarget'];

function readFromStorage() {
  try {
    const companyName = localStorage.getItem('companyName');
    if (!companyName) return null;
    const data = { companyName };
    KEYS.slice(1).forEach((k) => {
      data[k] = localStorage.getItem(k) || '';
    });
    return data;
  } catch {
    return null;
  }
}

export function useWarRoomData() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(() => {
    setData(readFromStorage());
    setLoading(false);
  }, []);

  useEffect(() => {
    reload();
    window.addEventListener('storage', reload);
    return () => window.removeEventListener('storage', reload);
  }, [reload]);

  return { data, loading };
}

// Deterministic market-share estimator (consistent per competitor name)
export function seedShare(name, min = 8, range = 22) {
  if (!name) return 0;
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
    hash |= 0;
  }
  return parseFloat((min + (Math.abs(hash) % range) + (Math.abs(hash >> 8) % 10) * 0.1).toFixed(1));
}

export function getInitials(name = '') {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || '')
    .join('');
}
