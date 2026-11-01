import { createHash, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';
import { data, save, type User } from './db.ts';
import { provider } from './providers/whatsapp.ts';
import { planValidTill } from './payments.ts';

export const OTP_TTL_MS = 5 * 60 * 1000;
const MAX_VERIFY_ATTEMPTS = 5;
/** 3 sends per 10 minutes per number (OTP_SENDS_PER_10_MIN raises it for automated test runs only). */
const SENDS_PER_10_MIN = Number(process.env.OTP_SENDS_PER_10_MIN ?? 3);
const SENDS_PER_DAY = 10;
const SENDS_PER_IP_10_MIN = 20;
/** Resend wait grows 30 s → 60 s → 120 s within one login attempt. */
export const RESEND_SCHEDULE = [30, 60, 120];

interface Pending { hash: string; expiresAt: number; attempts: number; sends: number }
const pending = new Map<string, Pending>();
const sendLog = new Map<string, number[]>();
const ipLog = new Map<string, number[]>();

export type AuthErrorCode = 'rate_limited' | 'wrong_otp' | 'expired' | 'invalid' | 'send_failed' | 'unauthorized' | 'session_expired';
export class AuthError extends Error {
  code: AuthErrorCode;
  status: number;
  extra: Record<string, unknown>;
  constructor(code: AuthErrorCode, status = 400, extra: Record<string, unknown> = {}) {
    super(code);
    this.code = code;
    this.status = status;
    this.extra = extra;
  }
}

const hash = (s: string) => createHash('sha256').update(s + (process.env.SESSION_SECRET ?? 'dev')).digest('hex');

/** Indian mobile: 10 digits starting 6–9. Stored as "91XXXXXXXXXX". */
export function normalizePhone(input: string): string | null {
  const d = String(input ?? '').replace(/\D/g, '').replace(/^0+/, '');
  const ten = d.length === 12 && d.startsWith('91') ? d.slice(2) : d;
  return /^[6-9]\d{9}$/.test(ten) ? '91' + ten : null;
}

const within = (log: number[], ms: number, now: number) => log.filter((t) => now - t < ms);

export type Channel = 'whatsapp' | 'email';
export const normalizeEmail = (input: string): string | null => {
  const e = String(input ?? '').trim().toLowerCase();
  return /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(e) && e.length <= 120 ? e : null;
};
/** Login identity: '91XXXXXXXXXX' for WhatsApp, the lower-cased address for email. */
export function normalizeDest(channel: Channel, raw: string): string | null {
  return channel === 'email' ? normalizeEmail(raw) : normalizePhone(raw);
}

/** Issues a 6-digit code, stores only its hash (5-minute TTL) and sends it on WhatsApp or by email. */
export async function requestOtp(rawDest: string, ip = 'local', now = Date.now(), channel: Channel = 'whatsapp') {
  const phone = normalizeDest(channel, rawDest);
  if (!phone) throw new AuthError('invalid');
  const perPhone = sendLog.get(phone) ?? [];
  if (within(perPhone, 10 * 60 * 1000, now).length >= SENDS_PER_10_MIN || within(perPhone, 24 * 60 * 60 * 1000, now).length >= SENDS_PER_DAY)
    throw new AuthError('rate_limited', 429, { retryAfterSec: 600 });
  const perIp = within(ipLog.get(ip) ?? [], 10 * 60 * 1000, now);
  if (perIp.length >= SENDS_PER_IP_10_MIN) throw new AuthError('rate_limited', 429, { retryAfterSec: 600 });

  const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
  const ok = channel === 'email' ? await provider().sendEmail(phone, `${code} — Bihar Board Padhai OTP`, `आपका कोड / Your code: ${code}. 5 मिनट में समाप्त / expires in 5 minutes.`) : await provider().sendOtp(phone, code);
  if (!ok) throw new AuthError('send_failed', 502);
  sendLog.set(phone, [...within(perPhone, 24 * 60 * 60 * 1000, now), now]);
  ipLog.set(ip, [...perIp, now]);
  const sends = (pending.get(phone)?.sends ?? 0) + 1;
  pending.set(phone, { hash: hash(code), expiresAt: now + OTP_TTL_MS, attempts: 0, sends });
  return {
    phone,
    channel,
    expiresInSec: OTP_TTL_MS / 1000,
    resendAfterSec: RESEND_SCHEDULE[Math.min(sends - 1, RESEND_SCHEDULE.length - 1)],
    devCode: process.env.TEST_MODE === 'true' ? code : undefined,
  };
}

/** At most 5 attempts per code; the code is consumed on success. */
export function verifyOtp(rawDest: string, code: string, now = Date.now(), channel: Channel = 'whatsapp') {
  const phone = normalizeDest(channel, rawDest);
  if (!phone) throw new AuthError('invalid');
  const p = pending.get(phone);
  if (!p) throw new AuthError('expired');
  if (now > p.expiresAt) { pending.delete(phone); throw new AuthError('expired'); }
  p.attempts++;
  const a = Buffer.from(hash(String(code)));
  const b = Buffer.from(p.hash);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    const left = MAX_VERIFY_ATTEMPTS - p.attempts;
    if (left <= 0) { pending.delete(phone); throw new AuthError('rate_limited', 429, { retryAfterSec: 600 }); }
    throw new AuthError('wrong_otp', 400, { attemptsLeft: left });
  }
  pending.delete(phone);
  return phone;
}

/** One account per login identity (phone number or email address). */
export function upsertUser(identity: string, extra: Partial<Pick<User, 'name' | 'email' | 'classId' | 'medium' | 'stream' | 'ref' | 'contactPhone'>>, consent?: boolean, channel: Channel = 'whatsapp'): { user: User; isNew: boolean } {
  const db = data();
  let u = channel === 'email' ? db.users.find((x) => x.email === identity) : db.users.find((x) => x.phone === identity);
  const isNew = !u;
  if (!u) {
    u = { id: 'u_' + randomBytes(8).toString('hex'), phone: channel === 'email' ? null : identity, email: channel === 'email' ? identity : null, name: null, classId: null, medium: null, stream: null, ref: null, consent: null, plan: null, progress: null, createdAt: new Date().toISOString() };
    db.users.push(u);
  }
  if (extra.name) u.name = extra.name.slice(0, 60);
  // A WhatsApp account may add a receipt email; an email account keeps its login email.
  if (extra.email !== undefined && u.phone) u.email = extra.email ? extra.email.trim().toLowerCase().slice(0, 120) : null;
  if (extra.contactPhone !== undefined) u.contactPhone = extra.contactPhone ? normalizePhone(extra.contactPhone) : null;
  if (extra.classId) u.classId = extra.classId;
  if (extra.medium) u.medium = extra.medium;
  if (extra.stream !== undefined) u.stream = extra.stream;
  if (extra.ref && !u.ref) u.ref = extra.ref;
  if (consent !== undefined) u.consent = { granted: !!consent, at: new Date().toISOString(), source: 'otp_request_checkbox', templateCategory: 'utility' };
  save();
  return { user: u, isNew };
}

/** Session lasts 60 days or till the plan's exam end + 30 days, whichever is longer; use slides it forward. */
export function sessionExpiry(user: User, now = new Date()): string {
  const sixty = new Date(now.getTime() + 60 * 86_400_000);
  let exp = sixty;
  const planEnd = user.plan?.validTill ?? (user.classId ? planValidTill([user.classId], now) : '');
  if (planEnd) {
    const p = new Date(planEnd + 'T23:59:59');
    p.setDate(p.getDate() + 30);
    if (p > exp) exp = p;
  }
  return exp.toISOString();
}

export function createSession(user: User) {
  const token = randomBytes(24).toString('hex');
  const now = new Date().toISOString();
  data().sessions.push({ token, userId: user.id, createdAt: now, expiresAt: sessionExpiry(user), lastUsedAt: now });
  save();
  return token;
}

export function userFromToken(token: string | undefined): User | null {
  if (!token) return null;
  const db = data();
  const s = db.sessions.find((x) => x.token === token);
  if (!s) return null;
  if (new Date(s.expiresAt).getTime() < Date.now()) {
    db.sessions = db.sessions.filter((x) => x.token !== token);
    save();
    throw new AuthError('session_expired', 401);
  }
  const u = db.users.find((x) => x.id === s.userId) ?? null;
  if (u) { s.lastUsedAt = new Date().toISOString(); s.expiresAt = sessionExpiry(u); }
  return u;
}

export function dropSession(token: string) {
  const db = data();
  db.sessions = db.sessions.filter((s) => s.token !== token);
  save();
}
export function dropAllSessions(userId: string) {
  const db = data();
  db.sessions = db.sessions.filter((s) => s.userId !== userId);
  save();
}

export const maskPhone = (phone: string) => phone.slice(2, 4) + '•••••' + phone.slice(-3);
export const maskEmail = (email: string) => { const [a, d] = email.split('@'); return a.slice(0, 2) + '•••@' + d; };
/** Masked login identity for display */
export const maskIdentity = (u: Pick<User, 'phone' | 'email'>) => (u.phone ? '+91 ' + maskPhone(u.phone) : u.email ? maskEmail(u.email) : '—');

export const publicAccount = (u: User) => ({
  id: u.id,
  phone: u.phone,
  phoneMasked: u.phone ? maskPhone(u.phone) : null,
  identityMasked: maskIdentity(u),
  loginChannel: u.phone ? 'whatsapp' : 'email',
  contactPhone: u.contactPhone ?? null,
  email: u.email,
  name: u.name,
  classId: u.classId,
  medium: u.medium,
  stream: u.stream,
  consent: u.consent ? { granted: u.consent.granted, at: u.consent.at } : null,
  district: u.district ?? null,
  leaderboardOptIn: !!u.leaderboardOptIn,
  plan: u.plan,
  receipts: data().orders.filter((o) => o.userId === u.id && o.status !== 'created' && o.status !== 'pending' && o.status !== 'failed').map((o) => ({ orderId: o.id, planId: o.planId, kind: o.kind, amount: o.amount, status: o.status, receiptId: o.receiptId ?? null, at: o.updatedAt })),
});

/** Test helper */
export const _clearOtpState = () => { pending.clear(); sendLog.clear(); ipLog.clear(); };
