import { useEffect, useState } from 'react';
import { accountStore } from './account';

/** Small helper for public JSON endpoints (updates, posters, tests) with a short sessionStorage cache. */
export async function publicGet<T>(path: string, cacheSec = 60): Promise<T> {
  const key = 'bbp.cache:' + path;
  try {
    const raw = sessionStorage.getItem(key);
    if (raw) { const { at, data } = JSON.parse(raw); if (Date.now() - at < cacheSec * 1000) return data as T; }
  } catch { /* ignore */ }
  const token = accountStore.get().token;
  const res = await fetch(`/api${path}`, { headers: token ? { authorization: `Bearer ${token}` } : {} });
  if (!res.ok) throw new Error(String(res.status));
  const data = (await res.json()) as T;
  try { sessionStorage.setItem(key, JSON.stringify({ at: Date.now(), data })); } catch { /* ignore */ }
  return data;
}

export function usePublic<T>(path: string | null, cacheSec = 60) {
  const [state, set] = useState<{ key: string | null; data: T | null; error: boolean }>({ key: null, data: null, error: false });
  useEffect(() => {
    if (!path) return;
    let on = true;
    publicGet<T>(path, cacheSec).then((d) => on && set({ key: path, data: d, error: false })).catch(() => on && set({ key: path, data: null, error: true }));
    return () => { on = false; };
  }, [path, cacheSec]);
  const fresh = state.key === path;
  return { data: fresh ? state.data : null, error: fresh ? state.error : false, loading: !!path && !fresh };
}

export interface PublicUpdate { id: string; title: { hi: string; en: string }; text: { hi: string; en: string }; category: string; class: string; link: string | null; official: boolean; attachment: { url: string; kind: 'image' | 'pdf' } | null; pinned: boolean; important: boolean; source: string; publishedAt: string }
export interface PublicPoster { id: string; image: string; title: { hi: string; en: string }; link: string | null }
