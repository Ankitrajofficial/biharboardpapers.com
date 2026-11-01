import { beforeEach, describe, expect, it, vi } from 'vitest';

process.env.TEST_MODE = 'true';
process.env.DB_MEMORY = '1';
process.env.ADMIN_OWNER_PHONES = '919000000001,919000000002';
const sent: string[] = [];
vi.mock('../server/providers/whatsapp.ts', () => ({ provider: () => ({ sendOtp: async () => true, sendUtility: async (p: string, t: string) => { sent.push(`${p}:${t}`); return true; }, sendEmail: async () => true }) }));

const { reset, data } = await import('../server/db.ts');
const { seedOwners, addAdmin, requireRole, createAdminSession, adminFromToken, removeAdmin, Forbidden, ADMIN_SESSION_MS } = await import('../server/admin/auth.ts');
const { logAudit, listAudit } = await import('../server/admin/audit.ts');
const { upsertSeries, upsertTest, upsertQuestion, importCsv, csvTemplate, liveStatus, submitAttempt, scoreAttempt, canAccessSeries, testResults } = await import('../server/admin/tests.ts');
const { upsertUpdate, updateState, liveUpdates, upsertExamDate, examCalendar } = await import('../server/admin/updates.ts');
const { grantPlan, revokePlan } = await import('../server/admin/users.ts');
const { upsertUser } = await import('../server/auth.ts');
const { handle } = await import('../server/index.ts');
const { isQuietHours, nextSendTime } = await import('../server/admin/notify.ts');
import { EventEmitter } from 'node:events';

const owner = () => data().admins.find((a) => a.phone === '919000000001')!;
const editor = () => addAdmin(owner(), '9111111111', 'editor', 'Ed');
const q = (admin: ReturnType<typeof owner>, n = 1) => upsertQuestion(admin, { question: { hi: `प्रश्न ${n}`, en: `Question ${n}` }, options: { hi: ['क', 'ख', 'ग', 'घ'], en: ['a', 'b', 'c', 'd'] }, answer: 1, explanation: { hi: '', en: '' }, class: 'class-12', subjectId: 'physics', difficulty: 'easy', source: { type: 'sample', citation: null }, status: 'reviewed' });

/** Drives the HTTP handler in-process. */
async function call(method: string, path: string, body?: unknown, token?: string) {
  const req = Object.assign(new EventEmitter(), { method, url: path, headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) }, socket: { remoteAddress: '127.0.0.1' } });
  let status = 0; let out = '';
  const res = { setHeader() {}, writeHead(s: number) { status = s; }, end(b?: string | Buffer) { out = b ? b.toString() : ''; } };
  const p = handle(req as never, res as never);
  if (body !== undefined) req.emit('data', JSON.stringify(body));
  req.emit('end');
  await p;
  return { status, body: out ? JSON.parse(out) : null };
}

describe('admin roles', () => {
  beforeEach(() => { reset(); seedOwners(); sent.length = 0; });
  it('seeds owners from env and separates owner/editor rights', () => {
    expect(data().admins.map((a) => a.role)).toEqual(['owner', 'owner']);
    const ed = editor();
    expect(requireRole(ed, 'editor').phone).toBe('919111111111');
    expect(() => requireRole(ed, 'owner')).toThrow(Forbidden);
    expect(() => requireRole(null)).toThrowError('unauthorized');
  });
  it('cannot remove the last owner', () => {
    removeAdmin('919000000002');
    expect(() => removeAdmin('919000000001')).toThrow(Forbidden);
  });
  it('admin sessions expire after 12 hours', () => {
    const tok = createAdminSession('919000000001', 0);
    expect(adminFromToken(tok, 1000)?.phone).toBe('919000000001');
    expect(() => adminFromToken(tok, ADMIN_SESSION_MS + 1)).toThrowError('session_expired');
  });
  it('editor cannot see payments, delete users or manage the team over HTTP; a student token is rejected', async () => {
    const ed = editor();
    const tok = createAdminSession(ed.phone);
    const u = upsertUser('919333333333', {}).user;
    expect((await call('GET', '/api/admin/payments', undefined, tok)).status).toBe(403);
    expect((await call('DELETE', `/api/admin/users/${u.id}`, { reason: 'x' }, tok)).status).toBe(403);
    expect((await call('GET', '/api/admin/team', undefined, tok)).status).toBe(403);
    expect((await call('GET', '/api/admin/users', undefined, tok)).status).toBe(200);
    expect((await call('GET', '/api/admin/stats', undefined, tok)).body.revenue).toBeNull();
    const { createSession } = await import('../server/auth.ts');
    expect((await call('GET', '/api/admin/stats', undefined, createSession(u))).status).toBe(401);
    expect((await call('GET', '/api/admin/stats')).status).toBe(401);
  });
  it('owner actions need a reason and are audit-logged with before/after', async () => {
    const tok = createAdminSession('919000000001');
    const u = upsertUser('919444444444', {}).user;
    expect((await call('POST', `/api/admin/users/${u.id}/plan`, { planId: 'inter' }, tok)).status).toBe(400);
    const r = await call('POST', `/api/admin/users/${u.id}/plan`, { planId: 'inter', reason: 'school partner' }, tok);
    expect(r.status).toBe(200);
    expect(u.plan?.id).toBe('inter');
    const log = listAudit({ entity: 'user' }).rows[0];
    expect(log.action).toBe('grant_plan');
    expect(log.reason).toBe('school partner');
    expect(log.before).toBeNull();
    expect((log.after as { id: string }).id).toBe('inter');
    await call('POST', `/api/admin/users/${u.id}/revoke`, { reason: 'refund' }, tok);
    expect(u.plan).toBeNull();
    expect(listAudit({ entity: 'user' }).rows[0].action).toBe('revoke_plan');
  });
});

describe('tests, scheduling and attempt limits', () => {
  beforeEach(() => { reset(); seedOwners(); });
  it('derives live status from the schedule and refuses scheduling without enough questions', () => {
    const s = upsertSeries(owner(), { title: { hi: 'सीरीज़', en: 'Series' }, class: 'class-12', access: 'free' });
    const qs = [q(owner(), 1), q(owner(), 2)];
    expect(() => upsertTest(owner(), { seriesId: s.id, title: { hi: 'ट', en: 'T' }, totalQuestions: 3, attemptLimit: 2, questionIds: qs.map((x) => x.id), status: 'scheduled', startAt: '2026-12-01T04:30:00Z', endAt: '2026-12-01T06:30:00Z' })).toThrowError(/add 3 questions/);
    const t = upsertTest(owner(), { seriesId: s.id, title: { hi: 'ट', en: 'T' }, totalQuestions: 2, attemptLimit: 1, questionIds: qs.map((x) => x.id), status: 'scheduled', startAt: '2026-12-01T04:30:00Z', endAt: '2026-12-01T06:30:00Z' });
    expect(liveStatus(t, Date.parse('2026-11-30T00:00:00Z'))).toBe('scheduled');
    expect(liveStatus(t, Date.parse('2026-12-01T05:00:00Z'))).toBe('live');
    expect(liveStatus(t, Date.parse('2026-12-02T00:00:00Z'))).toBe('closed');
    expect(() => upsertTest(owner(), { seriesId: s.id, title: { hi: 'x', en: 'x' }, totalQuestions: 2, attemptLimit: 5 })).toThrowError(/attempt limit/);
  });
  it('scores server-side: only the first N answered count, negative marking optional, one attempt per student', () => {
    const s = upsertSeries(owner(), { title: { hi: 'स', en: 'S' }, class: 'class-12', access: 'free' });
    const qs = [1, 2, 3, 4].map((n) => q(owner(), n));
    const t = upsertTest(owner(), { seriesId: s.id, title: { hi: 'ट', en: 'T' }, totalQuestions: 4, attemptLimit: 2, marksPerQuestion: 2, negativeMarks: 0.5, questionIds: qs.map((x) => x.id), status: 'scheduled', startAt: new Date(Date.now() - 1000).toISOString(), endAt: new Date(Date.now() + 3_600_000).toISOString() });
    const r = scoreAttempt(t, qs, { [qs[0].id]: 1, [qs[1].id]: 0, [qs[2].id]: 1 });
    expect(r).toMatchObject({ correct: 1, wrong: 1, overLimit: 1, maxMarks: 4, score: 1.5 });
    const u = upsertUser('919555555555', {}).user;
    submitAttempt(u, t, { [qs[0].id]: 1 }, new Date().toISOString());
    expect(() => submitAttempt(u, t, {}, new Date().toISOString())).toThrowError('already attempted');
    expect(testResults(t).attempts).toBe(1);
    expect(testResults(t).perQuestion[0].accuracy).toBe(100);
  });
  it('plan-locked series need an active matching plan', () => {
    const s = upsertSeries(owner(), { title: { hi: 'स', en: 'S' }, class: 'class-12', access: 'plan', plans: ['inter'] });
    const u = upsertUser('919666666666', {}).user;
    expect(canAccessSeries(null, s)).toBe(false);
    expect(canAccessSeries(u, s)).toBe(false);
    grantPlan(u, 'inter', null, 'x');
    expect(canAccessSeries(u, s)).toBe(true);
    revokePlan(u);
    grantPlan(u, 'all', null, 'x');
    expect(canAccessSeries(u, s)).toBe(true);
  });
});

describe('CSV import', () => {
  beforeEach(() => { reset(); seedOwners(); });
  it('validates every row and saves nothing until all rows are valid', () => {
    const good = csvTemplate();
    const bad = good + '"class-12","physics","","","","क","ख","ग","घ","","","","","E","","","easy","official_model_paper","","draft"\n';
    const r = importCsv(owner(), bad, true);
    expect(r.saved).toBe(0);
    expect(r.rows[0].errors).toEqual([]);
    expect(r.rows[1].row).toBe(3);
    expect(r.rows[1].errors.join(' ')).toMatch(/question is required/);
    expect(r.rows[1].errors.join(' ')).toMatch(/citation/);
    expect(r.rows[1].errors.join(' ')).toMatch(/answer must be A, B, C or D/);
    expect(importCsv(owner(), good, true).saved).toBe(1);
    expect(data().questions[0].answer).toBe(1);
    expect(importCsv(owner(), 'foo,bar\n1,2', true).rows[0].errors[0]).toMatch(/missing columns/);
  });
});

describe('updates and exam calendar', () => {
  beforeEach(() => { reset(); seedOwners(); });
  it('schedules, publishes and expires by time; requires a source; flags official links', () => {
    expect(() => upsertUpdate(owner(), { title: { hi: 'x', en: 'x' }, category: 'notice' })).toThrowError(/source/);
    const u = upsertUpdate(owner(), { title: { hi: 'एडमिट कार्ड', en: 'Admit card' }, text: { hi: '', en: '' }, category: 'admit_card', class: 'class-12', source: 'BSEB notice', link: 'https://biharboardonline.bihar.gov.in/x', status: 'published', publishAt: '2026-12-01T00:00:00Z', expiresAt: '2026-12-10T00:00:00Z' });
    expect(updateState(u, Date.parse('2026-11-30T00:00:00Z'))).toBe('scheduled');
    expect(updateState(u, Date.parse('2026-12-05T00:00:00Z'))).toBe('published');
    expect(updateState(u, Date.parse('2026-12-11T00:00:00Z'))).toBe('expired');
    expect(liveUpdates('class-10', null, 50, Date.parse('2026-12-05T00:00:00Z'))).toHaveLength(0);
    const live = liveUpdates('class-12', null, 50, Date.parse('2026-12-05T00:00:00Z'));
    expect(live).toHaveLength(1);
    expect(live[0].official).toBe(true);
    const un = upsertUpdate(owner(), { title: { hi: 'y', en: 'y' }, category: 'notice', source: 'news site', link: 'https://example.com', status: 'published' });
    expect(liveUpdates(null)[0].id === un.id ? liveUpdates(null)[0].official : liveUpdates(null)[1].official).toBe(false);
  });
  it('exam dates roll up into the calendar shape used by the countdown and plan expiry', () => {
    upsertExamDate({ class: 'class-10', subject: 'Science', date: '2027-02-17', status: 'expected' });
    upsertExamDate({ class: 'class-10', subject: 'Maths', date: '2027-02-25', status: 'expected' });
    expect(() => upsertExamDate({ class: 'class-10', date: '2027-02-20', status: 'official' })).toThrowError(/source URL/);
    const cal = examCalendar();
    expect(cal.exams).toEqual([expect.objectContaining({ class: 'class-10', year: 2027, start: '2027-02-17', end: '2027-02-25', status: 'expected' })]);
  });
});

describe('WhatsApp broadcast quiet hours (IST 21:00–08:00)', () => {
  it('queues until 08:00 IST', () => {
    const lateNight = new Date('2026-11-01T17:30:00Z'); // 23:00 IST
    expect(isQuietHours(lateNight)).toBe(true);
    expect(nextSendTime(lateNight).toISOString()).toBe('2026-11-02T02:30:00.000Z'); // 08:00 IST next day
    const noon = new Date('2026-11-01T06:30:00Z'); // 12:00 IST
    expect(isQuietHours(noon)).toBe(false);
    expect(nextSendTime(noon)).toBe(noon);
  });
  it('audit log records who/what/when', () => {
    reset(); seedOwners();
    logAudit(owner(), 'publish', 'update', 'u1', { status: 'draft' }, { status: 'published' });
    const e = listAudit().rows[0];
    expect(e).toMatchObject({ adminPhone: '919000000001', role: 'owner', action: 'publish', entity: 'update', entityId: 'u1' });
    expect(e.at).toMatch(/^\d{4}-/);
  });
});
