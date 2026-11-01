import { useCallback, useEffect, useState } from 'react';
import { createStore, useStore } from '@/lib/store';

export type AdminRole = 'owner' | 'editor';
export interface AdminMe { phone: string; phoneMasked: string; role: AdminRole; name: string | null; lastLoginAt: string | null }
export const adminStore = createStore<{ token: string | null; admin: AdminMe | null }>('bbp.admin.v1', { token: null, admin: null });
export const useAdmin = () => useStore(adminStore);

export class AdminApiError extends Error {
  constructor(public code: string, message: string, public status: number, public errors: string[] = []) { super(message); }
}

export async function adminApi<T>(path: string, body?: unknown, method = body ? 'POST' : 'GET'): Promise<T> {
  const token = adminStore.get().token;
  let res: Response;
  try {
    res = await fetch(`/api/admin${path}`, { method, headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
  } catch { throw new AdminApiError('network', 'network', 0); }
  const ct = res.headers.get('content-type') ?? '';
  const data = ct.includes('json') ? await res.json().catch(() => ({})) : { text: await res.text() };
  if (!res.ok) {
    if (res.status === 401 && token) adminStore.set({ token: null, admin: null });
    throw new AdminApiError(data.error ?? 'error', data.message ?? data.error ?? res.statusText, res.status, data.errors ?? []);
  }
  return data as T;
}

/** Download a CSV through the authenticated API. */
export async function adminDownload(path: string, filename: string) {
  const token = adminStore.get().token;
  const res = await fetch(`/api/admin${path}`, { headers: token ? { authorization: `Bearer ${token}` } : {} });
  const blob = await res.blob();
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

export function useFetch<T>(fn: () => Promise<T>, deps: unknown[]) {
  const [tick, setTick] = useState(0);
  const key = JSON.stringify(deps) + ':' + tick;
  const [state, set] = useState<{ key: string; data: T | null; error: string | null }>({ key: '', data: null, error: null });
  useEffect(() => {
    let on = true;
    fn().then((data) => on && set({ key, data, error: null })).catch((e) => on && set({ key, data: null, error: (e as Error).message }));
    return () => { on = false; };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  const reload = useCallback(() => setTick((x) => x + 1), []);
  return { data: state.key === key ? state.data : state.data, error: state.key === key ? state.error : null, loading: state.key !== key, reload };
}

export const fmtDate = (iso: string | null | undefined, withTime = true) => (iso ? new Date(iso).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric', ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}) }) : '—');
/** datetime-local (IST) ⇄ ISO */
export const toLocalInput = (iso: string | null) => (iso ? new Date(new Date(iso).getTime() + 330 * 60_000).toISOString().slice(0, 16) : '');
export const fromLocalInput = (v: string) => (v ? new Date(new Date(v + ':00Z').getTime() - 330 * 60_000).toISOString() : null);
