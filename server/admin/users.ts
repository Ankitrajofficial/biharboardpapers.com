/** User management (owner actions require a reason and are audit-logged by the route layer). */
import { data, save, type Order, type User } from '../db.ts';
import { planPrices, planValidTill, planActive, verifyWithPayu, settle, testMode, type PlanId } from '../payments.ts';
import { ValidationError } from './tests.ts';

export const mask = (phone: string) => phone.slice(2, 4) + '•••••' + phone.slice(-3);
const ident = (u: User) => (u.phone ? '+91 ' + mask(u.phone) : u.email ? u.email.slice(0, 2) + '•••@' + u.email.split('@')[1] : '—');

export function listUsers(f: { q?: string; class?: string; medium?: string; stream?: string; plan?: string; planStatus?: string; since?: string; optIn?: string }, page = 1, perPage = 25) {
  let rows = data().users;
  if (f.q) { const q = f.q.toLowerCase().replace(/\s/g, ''); rows = rows.filter((u) => (u.phone ?? '').includes(q.replace(/\D/g, '') || '§') || (u.email ?? '').includes(q) || (u.name ?? '').toLowerCase().includes(q) || (u.classId ?? '').includes(q)); }
  if (f.class) rows = rows.filter((u) => u.classId === f.class);
  if (f.medium) rows = rows.filter((u) => u.medium === f.medium);
  if (f.stream) rows = rows.filter((u) => u.stream === f.stream);
  if (f.plan) rows = rows.filter((u) => u.plan?.id === f.plan);
  if (f.planStatus === 'active') rows = rows.filter((u) => planActive(u));
  if (f.planStatus === 'expired') rows = rows.filter((u) => u.plan && !planActive(u));
  if (f.planStatus === 'none') rows = rows.filter((u) => !u.plan);
  if (f.since) rows = rows.filter((u) => u.createdAt >= f.since!);
  if (f.optIn === 'yes') rows = rows.filter((u) => u.consent?.granted);
  if (f.optIn === 'no') rows = rows.filter((u) => !u.consent?.granted);
  rows = [...rows].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return { total: rows.length, page, perPage, rows: rows.slice((page - 1) * perPage, page * perPage).map((u) => summary(u)) };
}

export const summary = (u: User) => ({ id: u.id, phoneMasked: ident(u), loginChannel: u.phone ? 'whatsapp' : 'email', name: u.name, classId: u.classId, medium: u.medium, stream: u.stream, plan: u.plan ? { id: u.plan.id, validTill: u.plan.validTill, active: planActive(u), refund: u.plan.refund } : null, optIn: !!u.consent?.granted, blocked: !!u.blocked, createdAt: u.createdAt });

export function userDetail(u: User, revealPhone: boolean) {
  const db = data();
  const tests = db.tests;
  return {
    ...summary(u),
    phone: revealPhone ? (u.phone ?? u.contactPhone ?? u.email) : null,
    email: u.email, district: u.district ?? null, leaderboardOptIn: !!u.leaderboardOptIn, consent: u.consent,
    planFull: u.plan,
    payments: db.orders.filter((o) => o.userId === u.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map(publicOrder),
    attempts: db.attempts.filter((a) => a.userId === u.id).map((a) => ({ id: a.id, testId: a.testId, test: tests.find((t) => t.id === a.testId)?.title ?? null, score: a.score, maxMarks: a.maxMarks, submittedAt: a.submittedAt })),
    admitCardUploaded: !!u.admitCard,
  };
}

export const publicOrder = (o: Order) => ({ id: o.id, userId: o.userId, planId: o.planId, kind: o.kind, amount: o.amount, status: o.status, mihpayid: o.mihpayid ?? null, receiptId: o.receiptId ?? null, createdAt: o.createdAt, updatedAt: o.updatedAt });

export function grantPlan(u: User, planId: string, validTill: string | null, byPhone: string) {
  const plan = planPrices[planId as PlanId];
  if (!plan) throw new ValidationError(['unknown plan']);
  const till = validTill && /^\d{4}-\d{2}-\d{2}$/.test(validTill) ? validTill : planValidTill(plan.classes);
  const nowIso = new Date().toISOString();
  u.plan = { id: planId as PlanId, validTill: till, activatedAt: u.plan?.activatedAt ?? nowIso, receiptId: u.plan?.receiptId ?? `ADMIN-${byPhone.slice(-4)}-${nowIso.slice(0, 10).replace(/-/g, '')}`, txnid: u.plan?.txnid ?? 'manual', amountPaid: u.plan?.amountPaid ?? 0, orderId: u.plan?.orderId ?? 'manual', refund: null };
  save();
  return u.plan;
}
export function revokePlan(u: User) { const before = u.plan; u.plan = null; save(); return before; }
export function setRefundState(u: User, state: 'requested' | 'processing' | 'refunded') {
  if (!u.plan) throw new ValidationError(['user has no plan']);
  u.plan.refund = state;
  const o = data().orders.find((x) => x.id === u.plan!.orderId);
  if (o) o.status = state === 'refunded' ? 'refunded' : state === 'processing' ? 'refund_processing' : 'refund_requested';
  save();
  return u.plan;
}
export function setBlocked(u: User, blocked: boolean) { u.blocked = blocked; if (blocked) { const db = data(); db.sessions = db.sessions.filter((s) => s.userId !== u.id); } save(); return u; }
export function deleteUser(u: User) {
  const db = data();
  db.users = db.users.filter((x) => x.id !== u.id);
  db.sessions = db.sessions.filter((s) => s.userId !== u.id);
  db.attempts = db.attempts.filter((a) => a.userId !== u.id);
  db.orders = db.orders.map((o) => (o.userId === u.id ? { ...o, userId: 'deleted' } : o)); // keep payment records, unlink the person
  save();
}
/** CSV export never includes admit-card data. */
export const usersCsvRows = () => data().users.map((u) => ({ id: u.id, phone: u.phone ?? '', login: u.phone ? 'whatsapp' : 'email', name: u.name ?? '', email: u.email ?? '', class: u.classId ?? '', medium: u.medium ?? '', stream: u.stream ?? '', plan: u.plan?.id ?? '', validTill: u.plan?.validTill ?? '', planActive: planActive(u) ? 'yes' : 'no', whatsappOptIn: u.consent?.granted ? 'yes' : 'no', blocked: u.blocked ? 'yes' : 'no', createdAt: u.createdAt }));

// ---------- Payments ----------
export function listPayments(f: { status?: string; plan?: string; q?: string; from?: string; to?: string }, page = 1, perPage = 25) {
  const db = data();
  const users = new Map(db.users.map((u) => [u.id, u]));
  let rows = db.orders;
  if (f.status) rows = rows.filter((o) => (f.status === 'refunded' ? ['refunded', 'refund_processing', 'refund_requested', 'duplicate'].includes(o.status) : o.status === f.status));
  if (f.plan) rows = rows.filter((o) => o.planId === f.plan);
  if (f.from) rows = rows.filter((o) => o.createdAt >= f.from!);
  if (f.to) rows = rows.filter((o) => o.createdAt <= f.to! + 'T23:59:59');
  if (f.q) { const q = f.q.toLowerCase(); rows = rows.filter((o) => o.id.toLowerCase().includes(q) || (o.mihpayid ?? '').toLowerCase().includes(q) || (users.get(o.userId)?.phone ?? users.get(o.userId)?.email ?? '').includes(q)); }
  rows = [...rows].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const map = (o: Order) => ({ ...publicOrder(o), phoneMasked: users.get(o.userId) ? ident(users.get(o.userId)!) : o.userId });
  return { total: rows.length, page, perPage, rows: rows.slice((page - 1) * perPage, page * perPage).map(map) };
}
/** Re-verifies pending orders with PayU's verify_payment API (no-op in test mode). */
export async function reconcilePending() {
  const db = data();
  const pending = db.orders.filter((o) => o.status === 'pending' || o.status === 'created');
  const results: Array<{ id: string; before: string; after: string }> = [];
  for (const o of pending) {
    const before = o.status;
    if (testMode()) { results.push({ id: o.id, before, after: before + ' (test mode: skipped)' }); continue; }
    const v = await verifyWithPayu(o.id);
    if (v && v.status.toLowerCase() === 'success') {
      const u = db.users.find((x) => x.id === o.userId);
      if (u) await settle({ key: process.env.PAYU_KEY ?? '', txnid: o.id, amount: v.amount.toFixed(2), productinfo: '', firstname: u.name || 'Student', email: u.email || '', udf1: u.id, udf2: o.planId, udf3: o.kind, udf4: '', udf5: '', status: 'success', mihpayid: v.mihpayid, hash: 'reconcile' }, 'webhook').catch(() => {});
    } else if (v && v.status.toLowerCase() === 'failure') { o.status = 'failed'; o.updatedAt = new Date().toISOString(); }
    results.push({ id: o.id, before, after: o.status });
  }
  save();
  return results;
}
export const paymentsCsvRows = () => { const users = new Map(data().users.map((u) => [u.id, u])); return data().orders.map((o) => ({ txnid: o.id, mihpayid: o.mihpayid ?? '', status: o.status, plan: o.planId, kind: o.kind, amount: o.amount, phone: users.get(o.userId)?.phone ?? users.get(o.userId)?.email ?? o.userId, receiptId: o.receiptId ?? '', createdAt: o.createdAt, updatedAt: o.updatedAt })); };
