/**
 * PayU hosted checkout. Prices come from the server-side plan table (never the client); the
 * request hash is computed here with the SALT; the response is verified with the reverse hash
 * and (in production) PayU's verify_payment API. Access is unlocked only through `settle()`.
 */
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { data, save, type Order, type User } from './db.ts';
import { provider } from './providers/whatsapp.ts';

const here = import.meta.url.startsWith('file:') ? fileURLToPath(import.meta.url) : import.meta.url;
const ROOT = resolve(dirname(here), '..') + '/';

export type PlanId = 'matric' | 'inter' | 'all';
// Keep in sync with src/config/plans.ts (tests/access.test.ts checks it).
export const planPrices: Record<PlanId, { priceInr: number; classes: string[]; name: string; nameHi: string; rank: number }> = {
  matric: { priceInr: 149, classes: ['class-10'], name: 'Matric Plan', nameHi: 'मैट्रिक प्लान', rank: 1 },
  inter: { priceInr: 199, classes: ['class-12'], name: 'Intermediate Plan', nameHi: 'इंटर प्लान', rank: 1 },
  all: { priceInr: 299, classes: ['class-10', 'class-12'], name: 'All Access', nameHi: 'सभी प्लान', rank: 2 },
};
export const REFUND_WINDOW_DAYS = Number(process.env.REFUND_WINDOW_DAYS ?? 7);

export const testMode = () => process.env.TEST_MODE === 'true' || !process.env.PAYU_SALT;
const key = () => process.env.PAYU_KEY || 'testkey';
const salt = () => process.env.PAYU_SALT || 'testsalt';
export const payuAction = () => (process.env.PAYU_MODE === 'prod' ? 'https://secure.payu.in/_payment' : 'https://test.payu.in/_payment');
const sha512 = (s: string) => createHash('sha512').update(s).digest('hex');
const fmtAmount = (n: number) => n.toFixed(2);

export class PayError extends Error {
  code: string;
  status: number;
  extra: Record<string, unknown>;
  constructor(code: string, status = 400, extra: Record<string, unknown> = {}) {
    super(code);
    this.code = code;
    this.status = status;
    this.extra = extra;
  }
}

/** Plan validity = end of the board exam for the plan's classes (All Access = the later one). */
export function planValidTill(classes: string[], now = new Date()): string {
  const cal = JSON.parse(readFileSync(`${ROOT}content/exam-calendar.json`, 'utf8')) as { exams: Array<{ class: string; end: string }> };
  const today = now.toISOString().slice(0, 10);
  let latest = '';
  for (const c of classes) {
    const e = cal.exams.filter((x) => x.class === c && x.end >= today).sort((a, b) => a.end.localeCompare(b.end))[0];
    if (e && e.end > latest) latest = e.end;
  }
  return latest || today;
}

export const planActive = (u: User, now = new Date()) => !!u.plan && new Date(u.plan.validTill + 'T23:59:59').getTime() >= now.getTime() && u.plan.refund !== 'refunded';

/** Already holding the same or a higher plan? */
export function coveredBy(u: User, planId: PlanId, now = new Date()) {
  if (!planActive(u, now)) return false;
  const have = u.plan!.id;
  return have === planId || planPrices[have].rank > planPrices[planId].rank;
}

/** Creates an order (or an upgrade order) and the PayU form fields with a server-side hash. */
export function createOrder(user: User, planId: string, now = new Date()) {
  const plan = planPrices[planId as PlanId];
  if (!plan) throw new PayError('unknown_plan');
  if (coveredBy(user, planId as PlanId, now)) throw new PayError('already_active', 409, { activePlan: user.plan!.id });
  if (!user.phone && !user.contactPhone) throw new PayError('phone_required', 400);
  let kind: Order['kind'] = 'new';
  let amount = plan.priceInr;
  if (planId === 'all' && planActive(user, now) && user.plan!.id !== 'all') {
    kind = 'upgrade';
    amount = Math.max(1, plan.priceInr - user.plan!.amountPaid);
  }
  const txnid = 'BBP' + now.toISOString().slice(2, 10).replace(/-/g, '') + randomBytes(5).toString('hex').toUpperCase();
  const order: Order = { id: txnid, userId: user.id, planId: planId as PlanId, kind, amount, status: 'created', createdAt: now.toISOString(), updatedAt: now.toISOString(), events: [{ at: now.toISOString(), type: 'created' }] };
  data().orders.push(order);
  save();
  const origin = process.env.API_ORIGIN ?? process.env.APP_ORIGIN ?? 'http://localhost:5173';
  const fields: Record<string, string> = {
    key: key(),
    txnid,
    amount: fmtAmount(amount),
    productinfo: `${plan.name}${kind === 'upgrade' ? ' (upgrade)' : ''}`,
    firstname: user.name || 'Student',
    email: user.email || '',
    phone: (user.phone ?? user.contactPhone ?? '').slice(2),
    udf1: user.id,
    udf2: planId,
    udf3: kind,
    udf4: '',
    udf5: '',
    surl: `${origin}/api/payments/payu/return`,
    furl: `${origin}/api/payments/payu/return`,
    pg: 'UPI',
    enforce_paymethod: 'upi|creditcard|debitcard|netbanking',
  };
  fields.hash = requestHash(fields);
  return { order, payu: { action: payuAction(), fields }, testMode: testMode() };
}

/** sha512(key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5||||||SALT) */
export function requestHash(f: Record<string, string>, s = salt()) {
  return sha512([f.key, f.txnid, f.amount, f.productinfo, f.firstname, f.email, f.udf1, f.udf2, f.udf3, f.udf4, f.udf5, '', '', '', '', '', s].join('|'));
}
/** sha512(SALT|status||||||udf5|udf4|udf3|udf2|udf1|email|firstname|productinfo|amount|txnid|key) */
export function responseHash(r: Record<string, string>, s = salt()) {
  return sha512([s, r.status, '', '', '', '', '', r.udf5 ?? '', r.udf4 ?? '', r.udf3 ?? '', r.udf2 ?? '', r.udf1 ?? '', r.email ?? '', r.firstname ?? '', r.productinfo ?? '', r.amount, r.txnid, r.key].join('|'));
}
export function verifyResponseHash(r: Record<string, string>) {
  if (!r.hash) return false;
  const a = Buffer.from(responseHash(r));
  const b = Buffer.from(String(r.hash));
  return a.length === b.length && timingSafeEqual(a, b);
}

/** PayU verify_payment API; in test mode the signed response is trusted. */
export async function verifyWithPayu(txnid: string): Promise<{ status: string; amount: number; mihpayid: string } | null> {
  if (testMode()) return null;
  const command = 'verify_payment';
  const h = sha512([key(), command, txnid, salt()].join('|'));
  const body = new URLSearchParams({ key: key(), command, var1: txnid, hash: h });
  const r = await fetch('https://info.payu.in/merchant/postservice.php?form=2', { method: 'POST', body });
  if (!r.ok) throw new PayError('verify_failed', 502);
  const j = (await r.json()) as { transaction_details?: Record<string, { status: string; amt: string; mihpayid: string }> };
  const d = j.transaction_details?.[txnid];
  return d ? { status: d.status, amount: Number(d.amt), mihpayid: d.mihpayid } : null;
}

/** Receipts go on WhatsApp when the account has a number, and by email when it has an address. */
async function notify(user: User, text: string, subject = 'Bihar Board Padhai') {
  if (user.phone) await provider().sendUtility(user.phone, text);
  if (user.email) await provider().sendEmail(user.email, subject, text);
}

const receiptId = () => 'BBP-' + new Date().toISOString().slice(0, 10).replace(/-/g, '') + '-' + randomBytes(3).toString('hex').toUpperCase();

/**
 * Settles a PayU response (return URL or S2S webhook). Verifies the reverse hash, then the
 * verify_payment API, then amount/txnid match. Idempotent on txnid/mihpayid.
 */
export async function settle(resp: Record<string, string>, source: 'return' | 'webhook') {
  const db = data();
  const order = db.orders.find((o) => o.id === resp.txnid);
  if (!verifyResponseHash(resp)) {
    db.security.push({ at: new Date().toISOString(), type: 'payu_hash_mismatch', detail: `${source} txnid=${resp.txnid ?? '?'}` });
    save();
    throw new PayError('bad_signature', 401);
  }
  if (!order) throw new PayError('unknown_order', 404);
  if (['success', 'duplicate', 'refund_requested', 'refund_processing', 'refunded'].includes(order.status)) return order; // idempotent
  const user = db.users.find((u) => u.id === order.userId);
  if (!user) throw new PayError('unknown_user', 404);
  const now = new Date().toISOString();
  order.events.push({ at: now, type: `${source}:${resp.status}`, detail: resp.mihpayid });

  let status = String(resp.status).toLowerCase();
  let amount = Number(resp.amount);
  const verified = await verifyWithPayu(order.id);
  if (verified) { status = verified.status.toLowerCase(); amount = verified.amount; }

  if (status === 'pending' || status === 'in progress') { order.status = 'pending'; order.updatedAt = now; save(); return order; }
  if (status !== 'success') { order.status = 'failed'; order.updatedAt = now; save(); return order; }
  if (Math.abs(amount - order.amount) > 0.005 || resp.txnid !== order.id) {
    db.security.push({ at: now, type: 'payu_amount_mismatch', detail: `txnid=${order.id} expected=${order.amount} got=${amount}` });
    order.status = 'failed';
    order.updatedAt = now;
    save();
    throw new PayError('amount_mismatch', 400);
  }
  order.mihpayid = resp.mihpayid || verified?.mihpayid;

  // Duplicate: already holds the same or a higher plan (not an upgrade) → refund automatically.
  if (order.kind !== 'upgrade' && coveredBy(user, order.planId)) {
    order.status = 'duplicate';
    order.updatedAt = now;
    save();
    await refund(order, 'duplicate');
    await notify(user, `Bihar Board Padhai: आपका प्लान पहले से चालू है। दोबारा हुए भुगतान ₹${order.amount} (Txn ${order.id}) का रिफंड शुरू कर दिया गया है।`);
    return order;
  }

  const plan = planPrices[order.planId];
  order.status = 'success';
  order.receiptId = receiptId();
  order.updatedAt = now;
  const paidBefore = order.kind === 'upgrade' && user.plan ? user.plan.amountPaid : 0;
  user.plan = { id: order.planId, validTill: planValidTill(plan.classes), activatedAt: now, receiptId: order.receiptId, txnid: order.id, amountPaid: paidBefore + order.amount, orderId: order.id, refund: null };
  save();
  const text = `रसीद: ${plan.nameHi} ₹${order.amount}, Txn ${order.id}, मान्य ${user.plan.validTill} तक — Bihar Board Padhai (${order.receiptId})`;
  await notify(user, text, `Receipt ${order.receiptId} — Bihar Board Padhai`);
  return order;
}

/** PayU refund API (cancel_refund_transaction). In test mode it only records the event. */
export async function refund(order: Order, reason: string) {
  const db = data();
  order.events.push({ at: new Date().toISOString(), type: 'refund', detail: reason });
  if (!testMode() && order.mihpayid) {
    const command = 'cancel_refund_transaction';
    const h = sha512([key(), command, order.mihpayid, salt()].join('|'));
    const body = new URLSearchParams({ key: key(), command, var1: order.mihpayid, var2: `rf_${order.id}`, var3: fmtAmount(order.amount), hash: h });
    const r = await fetch('https://info.payu.in/merchant/postservice.php?form=2', { method: 'POST', body });
    if (!r.ok) throw new PayError('refund_failed', 502);
  }
  if (order.status !== 'duplicate') order.status = 'refund_processing';
  const user = db.users.find((u) => u.id === order.userId);
  if (user?.plan?.orderId === order.id) user.plan.refund = 'processing';
  save();
  return order;
}

/** Student-initiated refund request inside the policy window; an admin reviews it. */
export function requestRefund(user: User, orderId: string, now = new Date()) {
  const order = data().orders.find((o) => o.id === orderId && o.userId === user.id);
  if (!order || order.status !== 'success') throw new PayError('not_refundable', 400);
  const ageDays = (now.getTime() - new Date(order.updatedAt).getTime()) / 86_400_000;
  if (ageDays > REFUND_WINDOW_DAYS) throw new PayError('refund_window_over', 400, { windowDays: REFUND_WINDOW_DAYS });
  order.status = 'refund_requested';
  order.events.push({ at: now.toISOString(), type: 'refund_requested' });
  if (user.plan?.orderId === order.id) user.plan.refund = 'requested';
  save();
  return order;
}

/** Test mode only: a PayU-style response with a correct reverse hash. */
export function buildTestResponse(order: Order, status: 'success' | 'failure' | 'pending', user: User) {
  const r: Record<string, string> = {
    key: key(), txnid: order.id, amount: fmtAmount(order.amount), productinfo: `${planPrices[order.planId].name}${order.kind === 'upgrade' ? ' (upgrade)' : ''}`,
    firstname: user.name || 'Student', email: user.email || '', udf1: user.id, udf2: order.planId, udf3: order.kind, udf4: '', udf5: '',
    status, mihpayid: 'TEST' + randomBytes(5).toString('hex'), mode: 'UPI',
  };
  r.hash = responseHash(r);
  return r;
}

export const publicOrder = (o: Order) => ({ id: o.id, planId: o.planId, kind: o.kind, amount: o.amount, status: o.status, receiptId: o.receiptId ?? null, createdAt: o.createdAt, updatedAt: o.updatedAt });
