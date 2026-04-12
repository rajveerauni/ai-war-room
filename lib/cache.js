const store = new Map();

export function getCache(key) {
  const item = store.get(key);
  if (!item) return null;
  if (Date.now() - item.ts > item.ttl) { store.delete(key); return null; }
  return item.data;
}

export function setCache(key, data, ttlMs = 5 * 60 * 1000) {
  store.set(key, { data, ts: Date.now(), ttl: ttlMs });
}

export function getCacheMeta(key) {
  const item = store.get(key);
  if (!item) return null;
  return { fetchedAt: new Date(item.ts).toISOString(), stale: Date.now() - item.ts > item.ttl };
}
