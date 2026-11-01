import { beforeEach, describe, expect, it, vi } from 'vitest';

process.env.TEST_MODE = 'true';
process.env.DB_MEMORY = '1';
process.env.PAYU_KEY = 'testkey';
process.env.PAYU_SALT = 'testsalt';
const sent: string[] = [];
let deliver = true;
vi.mock('../server/providers/whatsapp.ts', () => ({
  provider: () => ({
    sendOtp: async (phone: string, code: string) => { if (!deliver) return false; sent.push(`otp:${phone}:${code}`); return true; },
    sendUtility: async (phone: string, text: string) => { sent.push(`wa:${phone}:${text}`); return true; },
    sendEmail: async (email: string, subject: string) => { sent.push(`email:${email}:${subject}`); return true; },
  }),
}));

const { requestOtp, verifyOtp, upsertUser, createSession, userFromToken, sessionExpiry, _clearOtpState, OTP_TTL_MS, normalizePhone, normalizeEmail } = await import('../server/auth.ts');
const { reset, data } = await import('../server/db.ts');
const { createOrder, settle, buildTestResponse, requestHash, responseHash, verifyResponseHash, requestRefund, coveredBy } = await import('../server/payments.ts');

const PHONE = '9876543210';

describe('WhatsApp OTP (mocked provider)', () => {
  beforeEach(() => { _clearOtpState(); reset(); sent.length = 0; deliver = true; });

  it('validates Indian mobile numbers', () => {
    expect(normalizePhone('98765 43210')).toBe('919876543210');
    expect(normalizePhone('+91 9876543210')).toBe('919876543210');
    expect(normalizePhone('5876543210')).toBeNull();
    expect(normalizePhone('12345')).toBeNull();
  });

  it('sends a 6-digit code on WhatsApp, returns it in test mode, verifies once', async () => {
    const r = await requestOtp(PHONE);
    expect(r.devCode).toMatch(/^\d{6}$/);
    expect(r.resendAfterSec).toBe(30);
    expect(sent[0]).toBe(`otp:919876543210:${r.devCode}`);
    expect(verifyOtp(PHONE, r.devCode!)).toBe('919876543210');
    expect(() => verifyOtp(PHONE, r.devCode!)).toThrowError('expired');
  });

  it('wrong code reports tries left and locks after 5 attempts', async () => {
    await requestOtp(PHONE);
    for (let i = 4; i >= 1; i--) {
      try { verifyOtp(PHONE, '000000'); } catch (e) { expect((e as { code: string; extra: { attemptsLeft: number } }).code).toBe('wrong_otp'); expect((e as { extra: { attemptsLeft: number } }).extra.attemptsLeft).toBe(i); }
    }
    expect(() => verifyOtp(PHONE, '000000')).toThrowError('rate_limited');
  });

  it('codes expire after 5 minutes', async () => {
    const t0 = Date.now();
    const r = await requestOtp(PHONE, 'ip', t0);
    expect(() => verifyOtp(PHONE, r.devCode!, t0 + OTP_TTL_MS + 1)).toThrowError('expired');
  });

  it('rate-limits sends (3 per 10 min) and the resend wait grows 30 → 60 → 120', async () => {
    const t0 = Date.now();
    expect((await requestOtp(PHONE, 'ip', t0)).resendAfterSec).toBe(30);
    expect((await requestOtp(PHONE, 'ip', t0 + 1000)).resendAfterSec).toBe(60);
    expect((await requestOtp(PHONE, 'ip', t0 + 2000)).resendAfterSec).toBe(120);
    await expect(requestOtp(PHONE, 'ip', t0 + 3000)).rejects.toThrowError('rate_limited');
  });

  it('email OTP: validated address, code sent by email, separate account from WhatsApp', async () => {
    expect(normalizeEmail(' Student@Example.com ')).toBe('student@example.com');
    expect(normalizeEmail('nope')).toBeNull();
    await expect(requestOtp('nope', 'ip', Date.now(), 'email')).rejects.toThrowError('invalid');
    const r = await requestOtp('student@example.com', 'ip', Date.now(), 'email');
    expect(r.channel).toBe('email');
    expect(r.devCode).toMatch(/^\d{6}$/);
    expect(sent.some((x) => x.startsWith('email:student@example.com:'))).toBe(true);
    expect(verifyOtp('student@example.com', r.devCode!, Date.now(), 'email')).toBe('student@example.com');
    const a = upsertUser('student@example.com', { classId: 'class-10' }, undefined, 'email');
    expect(a.isNew).toBe(true);
    expect(a.user.phone).toBeNull();
    expect(a.user.email).toBe('student@example.com');
    const b = upsertUser('student@example.com', { name: 'Sam', contactPhone: '9876543210' }, undefined, 'email');
    expect(b.isNew).toBe(false);
    expect(b.user.contactPhone).toBe('919876543210');
    expect(b.user.email).toBe('student@example.com'); // login email is kept
  });

  it('WhatsApp delivery failure is reported (no SMS fallback)', async () => {
    deliver = false;
    await expect(requestOtp(PHONE)).rejects.toThrowError('send_failed');
    expect(sent).toHaveLength(0);
  });

  it('one account per number, consent recorded, session slides and expires', async () => {
    const a = upsertUser('919876543210', { classId: 'class-12', medium: 'hindi', stream: 'science' }, true);
    const b = upsertUser('919876543210', { name: 'Riya', email: 'r@example.com' });
    expect(a.isNew).toBe(true);
    expect(b.isNew).toBe(false);
    expect(b.user.id).toBe(a.user.id);
    expect(b.user.consent?.granted).toBe(true);
    expect(b.user.email).toBe('r@example.com');
    const exp = new Date(sessionExpiry(b.user, new Date('2026-11-01')));
    expect(exp.getTime()).toBeGreaterThanOrEqual(new Date('2026-12-31').getTime()); // ≥ 60 days
    const token = createSession(b.user);
    expect(userFromToken(token)?.id).toBe(a.user.id);
    data().sessions[0].expiresAt = '2020-01-01T00:00:00.000Z';
    expect(() => userFromToken(token)).toThrowError('session_expired');
  });
});

describe('PayU payments', () => {
  beforeEach(() => { _clearOtpState(); reset(); sent.length = 0; });
  const buyer = () => upsertUser('919999988888', { name: 'Amit', classId: 'class-12', medium: 'hindi' }).user;

  it('request hash and reverse hash follow the PayU formulas', () => {
    const f = { key: 'k', txnid: 't1', amount: '199.00', productinfo: 'Intermediate Plan', firstname: 'Amit', email: '', udf1: 'u', udf2: 'inter', udf3: 'new', udf4: '', udf5: '' };
    expect(requestHash(f, 'S')).toHaveLength(128);
    const r = { ...f, status: 'success', hash: '' };
    r.hash = responseHash(r, 'S');
    expect(responseHash(r, 'S')).toBe(r.hash);
    expect(verifyResponseHash({ ...r, key: 'k' })).toBe(false); // different salt in env → mismatch
  });

  it('server-side price; signed success response activates the plan and sends a receipt', async () => {
    const u = buyer();
    const { order, payu, testMode } = createOrder(u, 'inter');
    expect(testMode).toBe(true);
    expect(order.amount).toBe(199);
    expect(payu.fields.amount).toBe('199.00');
    expect(payu.fields.hash).toHaveLength(128);
    expect(payu.action).toContain('test.payu.in');
    // tampered response is rejected and logged
    const bad = buildTestResponse(order, 'success', u);
    bad.hash = 'deadbeef';
    await expect(settle(bad, 'webhook')).rejects.toThrowError('bad_signature');
    expect(data().security[0].type).toBe('payu_hash_mismatch');
    expect(u.plan).toBeNull();
    // amount mismatch never unlocks
    const wrongAmt = buildTestResponse({ ...order, amount: 1 }, 'success', u);
    await expect(settle(wrongAmt, 'webhook')).rejects.toThrowError('amount_mismatch');
    expect(u.plan).toBeNull();
    // real signed response
    const good = buildTestResponse(order, 'success', u);
    await settle(good, 'webhook');
    expect(u.plan?.id).toBe('inter');
    expect(u.plan?.validTill).toBe('2027-02-11');
    expect(u.plan?.receiptId).toMatch(/^BBP-/);
    expect(sent.some((s) => s.startsWith('wa:919999988888:रसीद'))).toBe(true);
    // idempotent
    await settle(good, 'webhook');
    expect(sent.filter((s) => s.includes('रसीद'))).toHaveLength(1);
  });

  it('email-only buyer needs a contact phone for PayU and gets the receipt by email', async () => {
    const u = upsertUser('buyer@example.com', {}, undefined, 'email').user;
    expect(() => createOrder(u, 'matric')).toThrowError('phone_required');
    upsertUser('buyer@example.com', { contactPhone: '9123456789' }, undefined, 'email');
    const { order, payu } = createOrder(u, 'matric');
    expect(payu.fields.phone).toBe('9123456789');
    await settle(buildTestResponse(order, 'success', u), 'webhook');
    expect(u.plan?.id).toBe('matric');
    expect(sent.some((s) => s.startsWith('email:buyer@example.com:Receipt'))).toBe(true);
    expect(sent.some((s) => s.startsWith('wa:'))).toBe(false);
  });

  it('pending and failed responses do not unlock', async () => {
    const u = buyer();
    const { order } = createOrder(u, 'matric');
    expect((await settle(buildTestResponse(order, 'pending', u), 'return')).status).toBe('pending');
    expect((await settle(buildTestResponse(order, 'failure', u), 'webhook')).status).toBe('failed');
    expect(u.plan).toBeNull();
  });

  it('blocks buying an active or lower plan, offers an upgrade at the price difference, refunds duplicates', async () => {
    const u = buyer();
    const first = createOrder(u, 'inter');
    await settle(buildTestResponse(first.order, 'success', u), 'webhook');
    expect(() => createOrder(u, 'inter')).toThrowError('already_active');
    expect(coveredBy(u, 'inter')).toBe(true);
    const up = createOrder(u, 'all');
    expect(up.order.kind).toBe('upgrade');
    expect(up.order.amount).toBe(100);
    // a duplicate 'inter' payment that slipped through is flagged and refunded
    const dupOrder = { ...first.order, id: 'DUP1', status: 'created' as const, events: [] };
    data().orders.push(dupOrder);
    const dup = await settle(buildTestResponse(dupOrder, 'success', u), 'webhook');
    expect(dup.status).toBe('duplicate');
    expect(sent.some((s) => s.includes('रिफंड'))).toBe(true);
    expect(u.plan?.id).toBe('inter');
    // upgrade succeeds → All Access, amountPaid = 199 + 100
    await settle(buildTestResponse(up.order, 'success', u), 'webhook');
    expect(u.plan?.id).toBe('all');
    expect(u.plan?.amountPaid).toBe(299);
    expect(u.plan?.validTill).toBe('2027-02-25');
    expect(() => createOrder(u, 'matric')).toThrowError('already_active');
  });

  it('refund request only inside the policy window', async () => {
    const u = buyer();
    const { order } = createOrder(u, 'matric');
    await settle(buildTestResponse(order, 'success', u), 'webhook');
    expect(requestRefund(u, order.id).status).toBe('refund_requested');
    expect(u.plan?.refund).toBe('requested');
    const o2 = createOrder(upsertUser('919999977777', {}).user, 'matric');
    await settle(buildTestResponse(o2.order, 'success', data().users[1]), 'webhook');
    expect(() => requestRefund(data().users[1], o2.order.id, new Date(Date.now() + 30 * 86_400_000))).toThrowError('refund_window_over');
  });
});
