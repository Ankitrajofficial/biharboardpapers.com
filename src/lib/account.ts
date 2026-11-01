import { createStore, useStore } from './store';
import type { Account } from './access';
import { progressStore, mergeProgress, defaultProgress, type Progress } from './progress';
import { prefsStore } from './prefs';

export type Channel = 'whatsapp' | 'email';
export interface AccountState {
  token: string | null;
  account: Account | null;
  /** Last number used, for "Continue as +91 98•••••210" */
  lastPhone: string | null;
  /** Last login identity (channel + value) */
  lastIdentity?: { channel: Channel; value: string } | null;
  /** Set when the server said the session expired; the login page shows "Please log in again". */
  expired: boolean;
}

export const accountStore = createStore<AccountState>('bbp.account.v2', { token: null, account: null, lastPhone: null, expired: false });
export const useAccount = () => useStore(accountStore);

export class ApiError extends Error {
  constructor(public code: string, message: string, public status = 400, public extra: Record<string, unknown> = {}) {
    super(message);
  }
}

async function api<T>(path: string, body?: unknown, method = body ? 'POST' : 'GET'): Promise<T> {
  const token = accountStore.get().token;
  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      method,
      headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError('network', 'network', 0);
  }
  const data = (await res.json().catch(() => ({}))) as { error?: string; message?: string } & Record<string, unknown> & T;
  if (!res.ok) {
    if (res.status === 401 && token) accountStore.set((s) => ({ ...s, token: null, account: null, expired: data.error === 'session_expired' }));
    const { error, message, ...extra } = data;
    throw new ApiError(error ?? 'error', message ?? res.statusText, res.status, extra);
  }
  return data;
}

export const maskPhone = (ten: string) => ten.slice(0, 2) + '•••••' + ten.slice(-3);
export const maskEmail = (email: string) => { const [a, d] = email.split('@'); return a.slice(0, 2) + '•••@' + (d ?? ''); };
export const maskIdentity = (channel: Channel, value: string) => (channel === 'email' ? maskEmail(value) : '+91 ' + maskPhone(value));

/** Step S2: send the OTP on WhatsApp (10-digit number) or by email. */
export const requestOtp = (channel: Channel, dest: string, consent: boolean) =>
  api<{ ok: true; expiresInSec: number; resendAfterSec: number; devCode?: string }>('/auth/otp/request', { channel, [channel === 'email' ? 'email' : 'phone']: dest, consent, ref: prefsStore.get().ref ?? undefined });

/** Step S3: verify. Returns the account and whether it is new (→ S4 name screen). */
export async function verifyOtp(channel: Channel, dest: string, code: string) {
  const p = prefsStore.get();
  const r = await api<{ token: string; account: Account; isNew: boolean }>('/auth/otp/verify', { channel, [channel === 'email' ? 'email' : 'phone']: dest, code, classId: p.classId, medium: p.medium, stream: p.stream, ref: p.ref });
  accountStore.set({ token: r.token, account: r.account, lastPhone: channel === 'whatsapp' ? dest : accountStore.get().lastPhone, lastIdentity: { channel, value: dest }, expired: false });
  return r;
}

/** Step S4: optional name / email; class, medium and stream come from the phone's saved choices. */
export async function updateProfile(patch: { name?: string; email?: string; district?: string; leaderboardOptIn?: boolean; contactPhone?: string }) {
  const p = prefsStore.get();
  const r = await api<{ account: Account }>('/me/profile', { ...patch, classId: p.classId, medium: p.medium, stream: p.stream });
  accountStore.set((s) => ({ ...s, account: r.account }));
  return r.account;
}

export async function refreshAccount() {
  if (!accountStore.get().token) return null;
  try {
    const r = await api<{ account: Account }>('/me');
    accountStore.set((s) => ({ ...s, account: r.account }));
    return r.account;
  } catch {
    return null;
  }
}

const hasLocalProgress = (p: Progress) => Object.keys(p.completed).length + Object.keys(p.bookmarks).length + p.mockHistory.length > 0;

/**
 * After login: merge this phone's progress into the account (union/max; idempotent) and bring back
 * the union. Returns 'ask' when the local progress belongs to a different account so the UI can
 * ask "Add this phone's earlier progress?" (default No).
 */
export function localProgressOwnerMismatch(accountId: string): boolean {
  const p = progressStore.get();
  return hasLocalProgress(p) && !!p.ownerId && p.ownerId !== accountId;
}

export async function syncProgress(mode: 'merge' | 'replace' = 'merge') {
  const token = accountStore.get().token;
  const account = accountStore.get().account;
  if (!token || !account) return false;
  try {
    const local = progressStore.get();
    const prefs = prefsStore.get();
    const send = mode === 'merge' ? { ...local, activeMock: null, offline: {} } : { ...defaultProgress };
    const r = await api<{ progress: Progress }>('/me/merge', { progress: send, classId: prefs.classId, medium: prefs.medium, stream: prefs.stream, ref: prefs.ref });
    const base = mode === 'merge' ? local : { ...defaultProgress, offline: local.offline };
    progressStore.set({ ...mergeProgress(base, { ...defaultProgress, ...r.progress }), ownerId: account.id });
    return true;
  } catch {
    return false;
  }
}

/** Logout clears the token (and all phones when asked) but keeps class/medium and the masked number. */
export function logout(everywhere = false) {
  api(everywhere ? '/auth/logout-all' : '/auth/logout', {}).catch(() => {});
  accountStore.set((s) => ({ ...s, token: null, account: null }));
}

export async function deleteAccount() {
  await api('/me', undefined, 'DELETE');
  accountStore.set({ token: null, account: null, lastPhone: null, expired: false });
}

// ---- Payments (PayU) ----
export interface Order { id: string; planId: 'matric' | 'inter' | 'all'; kind: 'new' | 'upgrade'; amount: number; status: 'created' | 'pending' | 'success' | 'failed' | 'duplicate' | 'refund_requested' | 'refund_processing' | 'refunded'; receiptId: string | null; createdAt: string; updatedAt: string }
export interface CreatedOrder { order: Order; payu: { action: string; fields: Record<string, string> }; testMode: boolean }

/** Server computes the price and the hash; the client only posts the returned form. */
export const createOrder = (planId: string) => api<CreatedOrder>('/orders', { planId });
export const getOrder = (id: string) => api<{ order: Order }>(`/orders/${encodeURIComponent(id)}`);
export const requestRefund = (id: string) => api<{ order: Order }>(`/orders/${encodeURIComponent(id)}/refund-request`, {});
/** Test mode only: simulate PayU's signed response. */
export const testPay = (orderId: string, status: 'success' | 'failure' | 'pending') => api<{ order: Order }>('/payments/test-pay', { orderId, status });

/** Auto-posts the PayU form (hosted checkout, UPI first). */
export function postToPayu(payu: CreatedOrder['payu']) {
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = payu.action;
  for (const [k, v] of Object.entries(payu.fields)) {
    const i = document.createElement('input');
    i.type = 'hidden';
    i.name = k;
    i.value = v;
    form.appendChild(i);
  }
  document.body.appendChild(form);
  form.submit();
}
