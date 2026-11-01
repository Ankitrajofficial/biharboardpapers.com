/**
 * Dependency-free backend: WhatsApp OTP accounts, progress merge, PayU payments.
 * Run: `npm run server` (reads .env). In TEST_MODE the OTP is returned in the API response and
 * payments are simulated through the same signed-response path PayU uses.
 */
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { existsSync, readFileSync } from 'node:fs';
import { load, data, save } from './db.ts';
import { AuthError, createSession, dropAllSessions, dropSession, publicAccount, requestOtp, upsertUser, userFromToken, verifyOtp } from './auth.ts';
import { PayError, buildTestResponse, createOrder, publicOrder, requestRefund, settle, testMode } from './payments.ts';
import { handleAdmin } from './admin/routes.ts';
import { seedOwners } from './admin/auth.ts';
import { ValidationError, canAccessSeries, leaderboard, liveStatus, resultsVisibleNow, studentQuestion, submitAttempt } from './admin/tests.ts';
import { examCalendar, liveUpdates, seedExamDates } from './admin/updates.ts';
import { addReport } from './admin/content.ts';
import { startNotificationLoop } from './admin/notify.ts';
import { livePosters, readUpload, seedPoster } from './admin/posters.ts';

const envPath = new URL('../.env', import.meta.url).pathname;
if (existsSync(envPath)) for (const line of readFileSync(envPath, 'utf8').split('\n')) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*(#.*)?$/);
  if (m && !(m[1] in process.env)) process.env[m[1]] = m[2];
}
if (!('TEST_MODE' in process.env)) process.env.TEST_MODE = 'true';
const APP = () => process.env.APP_ORIGIN ?? 'http://localhost:5173';

const json = (res: ServerResponse, status: number, body: unknown) => {
  res.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store' });
  res.end(JSON.stringify(body));
};
const redirect = (res: ServerResponse, url: string) => { res.writeHead(303, { location: url }); res.end(); };
const readBody = (req: IncomingMessage) => new Promise<string>((resolve, reject) => { let b = ''; req.on('data', (c) => { b += c; if (b.length > 1e6) req.destroy(); }); req.on('end', () => resolve(b)); req.on('error', reject); });
const bearer = (req: IncomingMessage) => req.headers.authorization?.replace(/^Bearer\s+/i, '');
const clientIp = (req: IncomingMessage) => (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0].trim() || req.socket.remoteAddress || 'local';
const parseBody = (raw: string, ct: string): Record<string, string> => {
  if (!raw) return {};
  if (ct.includes('application/x-www-form-urlencoded')) return Object.fromEntries(new URLSearchParams(raw));
  return JSON.parse(raw);
};

export async function handle(req: IncomingMessage, res: ServerResponse) {
  const url = new URL(req.url ?? '/', 'http://localhost');
  const path = url.pathname;
  res.setHeader('access-control-allow-origin', APP());
  res.setHeader('access-control-allow-headers', 'content-type, authorization');
  res.setHeader('access-control-allow-methods', 'GET,POST,DELETE,OPTIONS');
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
  const raw = req.method === 'POST' || req.method === 'DELETE' ? await readBody(req) : '';
  let body: Record<string, string> = {};
  try { body = parseBody(raw, String(req.headers['content-type'] ?? '')); } catch { return json(res, 400, { error: 'bad_json' }); }

  try {
    if (await handleAdmin({ req, res, path, url, body, raw, token: bearer(req), ip: clientIp(req) })) return;
    if (path === '/api/health') return json(res, 200, { ok: true, testMode: testMode(), login: ['whatsapp', 'email'] });

    // ---- public: updates, calendar, mistake reports, tests ----
    if (path === '/api/posters/first' && req.method === 'GET') {
      // Stable URL for <link rel="preload" as="image">: redirects to the first active poster image.
      const first = livePosters(null)[0];
      if (!first) return json(res, 404, { error: 'none' });
      res.writeHead(302, { location: first.image, 'cache-control': 'public, max-age=60' });
      return res.end();
    }
    if (path === '/api/posters' && req.method === 'GET') { res.setHeader('cache-control', 'public, max-age=60'); return json(res, 200, { posters: livePosters(url.searchParams.get('class')) }); }
    const um = path.match(/^\/api\/uploads\/([\w.-]+)$/);
    if (um && req.method === 'GET') { const f = readUpload(um[1]); if (!f) return json(res, 404, { error: 'not_found' }); res.writeHead(200, { 'content-type': f.type, 'cache-control': 'public, max-age=31536000, immutable' }); return res.end(f.body); }
    if (path === '/api/updates' && req.method === 'GET') { res.setHeader('cache-control', 'public, max-age=60'); return json(res, 200, { updates: liveUpdates(url.searchParams.get('class'), url.searchParams.get('category'), Number(url.searchParams.get('limit') ?? 50)) }); }
    if (path === '/api/exam-calendar' && req.method === 'GET') { res.setHeader('cache-control', 'public, max-age=300'); const c = examCalendar(); return json(res, 200, { _comment: c._comment, updated: c.updated, exams: c.exams }); }
    if (path === '/api/reports' && req.method === 'POST') {
      let u = null; try { u = userFromToken(bearer(req)); } catch { /* anonymous ok */ }
      const r = addReport({ userId: u?.id ?? null, phone: u?.phone ?? null, page: String(body.page ?? ''), refId: String(body.refId ?? ''), message: String(body.message ?? '') });
      return json(res, 200, { ok: true, id: r.id });
    }
    if (path === '/api/tests' && req.method === 'GET') {
      let u = null; try { u = userFromToken(bearer(req)); } catch { /* anonymous */ }
      const db = data();
      const cls = url.searchParams.get('class');
      const rows = db.series.filter((s) => !cls || s.class === cls).map((s) => ({
        ...s, accessible: canAccessSeries(u, s),
        tests: db.tests.filter((t) => t.seriesId === s.id && t.status !== 'draft').map((t) => ({ id: t.id, title: t.title, type: t.type, durationMin: t.durationMin, totalQuestions: t.totalQuestions, attemptLimit: t.attemptLimit, startAt: t.startAt, endAt: t.endAt, liveStatus: liveStatus(t), leaderboard: t.leaderboard, attempted: !!u && db.attempts.some((a) => a.testId === t.id && a.userId === u!.id) })),
      })).filter((s) => s.tests.length);
      return json(res, 200, { series: rows });
    }
    const tm = path.match(/^\/api\/tests\/([\w-]+)(\/submit|\/result|\/leaderboard)?$/);
    if (tm) {
      const db = data();
      const t = db.tests.find((x) => x.id === tm[1]);
      const series = t && db.series.find((s) => s.id === t.seriesId);
      if (!t || !series || t.status === 'draft') return json(res, 404, { error: 'not_found' });
      let u = null; try { u = userFromToken(bearer(req)); } catch { /* anonymous */ }
      if (tm[2] === '/leaderboard') return json(res, 200, { rows: leaderboard(t) });
      if (!canAccessSeries(u, series)) return json(res, 403, { error: 'plan_required', plans: series.plans });
      const medium = (url.searchParams.get('medium') === 'english' ? 'english' : 'hindi') as 'hindi' | 'english';
      const qs = t.questionIds.map((id) => db.questions.find((x) => x.id === id)).filter((x): x is NonNullable<typeof x> => !!x);
      if (!tm[2]) {
        const mine = u && db.attempts.find((a) => a.testId === t.id && a.userId === u!.id);
        return json(res, 200, { test: { id: t.id, title: t.title, type: t.type, durationMin: t.durationMin, totalQuestions: t.totalQuestions, attemptLimit: t.attemptLimit, marksPerQuestion: t.marksPerQuestion, negativeMarks: t.negativeMarks, instructions: t.instructions, resultsVisible: t.resultsVisible, leaderboard: t.leaderboard, startAt: t.startAt, endAt: t.endAt, liveStatus: liveStatus(t), series: { id: series.id, title: series.title, class: series.class } }, questions: liveStatus(t) === 'live' && !mine ? qs.map((q) => studentQuestion(q, medium)) : [], attempted: !!mine });
      }
      if (!u) return json(res, 401, { error: 'unauthorized' });
      if (tm[2] === '/submit' && req.method === 'POST') {
        const a = submitAttempt(u, t, (body as unknown as { answers: Record<string, number> }).answers ?? {}, String(body.startedAt ?? new Date().toISOString()));
        return json(res, 200, { attempt: { id: a.id, score: a.score, maxMarks: a.maxMarks, correct: a.correct, wrong: a.wrong, skipped: a.skipped, overLimit: a.overLimit }, resultsVisible: resultsVisibleNow(t) });
      }
      if (tm[2] === '/result') {
        const a = db.attempts.find((x) => x.testId === t.id && x.userId === u!.id);
        if (!a) return json(res, 404, { error: 'no_attempt' });
        const visible = resultsVisibleNow(t);
        return json(res, 200, { attempt: { id: a.id, score: a.score, maxMarks: a.maxMarks, correct: a.correct, wrong: a.wrong, skipped: a.skipped, overLimit: a.overLimit, submittedAt: a.submittedAt }, resultsVisible: visible, review: visible ? a.perQuestion.map((p) => { const qq = qs.find((x) => x.id === p.id)!; return { ...p, question: medium === 'hindi' ? qq.question.hi : qq.question.en, options: medium === 'hindi' ? qq.options.hi : qq.options.en, explanation: medium === 'hindi' ? qq.explanation.hi : qq.explanation.en }; }) : [], endAt: t.endAt });
      }
    }

    // ---- auth (WhatsApp OTP only) ----
    if (path === '/api/auth/otp/request' && req.method === 'POST') {
      const channel = body.channel === 'email' ? 'email' : 'whatsapp';
      const r = await requestOtp(String(body.phone ?? body.email ?? ''), clientIp(req), Date.now(), channel);
      if (body.consent !== undefined && channel === 'whatsapp') pendingConsent.set(r.phone, String(body.consent) === 'true');
      return json(res, 200, { ok: true, ...r });
    }
    if (path === '/api/auth/otp/verify' && req.method === 'POST') {
      const channel = body.channel === 'email' ? 'email' : 'whatsapp';
      const phone = verifyOtp(String(body.phone ?? body.email ?? ''), String(body.code ?? ''), Date.now(), channel);
      const consent = pendingConsent.get(phone);
      pendingConsent.delete(phone);
      const { user, isNew } = upsertUser(phone, { classId: body.classId, medium: body.medium, stream: body.stream ?? null, ref: body.ref }, consent, channel);
      if (user.blocked) return json(res, 403, { error: 'blocked' });
      const token = createSession(user);
      return json(res, 200, { token, account: publicAccount(user), isNew });
    }
    if (path === '/api/auth/logout' && req.method === 'POST') { const t = bearer(req); if (t) dropSession(t); return json(res, 200, { ok: true }); }

    // ---- PayU callbacks (unauthenticated; verified by hash) ----
    if (path === '/api/payments/payu/return' && req.method === 'POST') {
      let order;
      try { order = await settle(body, 'return'); } catch (e) { return redirect(res, `${APP()}/plans/status?order=${encodeURIComponent(body.txnid ?? '')}&error=${(e as PayError).code ?? 'error'}`); }
      return redirect(res, `${APP()}/plans/status?order=${encodeURIComponent(order.id)}`);
    }
    if (path === '/api/payments/payu/webhook' && req.method === 'POST') {
      const order = await settle(body, 'webhook');
      return json(res, 200, { ok: true, status: order.status });
    }

    // ---- authenticated ----
    const user = userFromToken(bearer(req));
    if (path === '/api/auth/logout-all' && req.method === 'POST') { if (user) dropAllSessions(user.id); return json(res, 200, { ok: true }); }
    if (!user) return json(res, 401, { error: 'unauthorized' });

    if (path === '/api/me' && req.method === 'GET') return json(res, 200, { account: publicAccount(user) });
    if (path === '/api/me' && req.method === 'DELETE') {
      const db = data();
      db.users = db.users.filter((u) => u.id !== user.id);
      db.sessions = db.sessions.filter((s) => s.userId !== user.id);
      db.orders = db.orders.filter((o) => o.userId !== user.id);
      save();
      return json(res, 200, { ok: true });
    }
    if (path === '/api/me/profile' && req.method === 'POST') {
      upsertUser(user.phone ?? user.email!, { name: body.name, email: body.email, classId: body.classId, medium: body.medium, stream: body.stream, contactPhone: body.contactPhone }, undefined, user.phone ? 'whatsapp' : 'email');
      if (body.district !== undefined) user.district = String(body.district ?? '').slice(0, 60) || null;
      if (body.leaderboardOptIn !== undefined) user.leaderboardOptIn = String(body.leaderboardOptIn) === 'true';
      save();
      return json(res, 200, { account: publicAccount(user) });
    }
    if (path === '/api/me/merge' && req.method === 'POST') {
      const incoming = ((body as unknown as { progress?: Record<string, unknown> }).progress ?? {}) as Record<string, unknown>;
      const existing = user.progress ?? {};
      const obj = (x: unknown) => (x && typeof x === 'object' ? (x as Record<string, unknown>) : {});
      const list = (x: unknown) => (Array.isArray(x) ? x : []) as Array<{ id: string; at: string }>;
      const merged = {
        completed: { ...obj(existing.completed), ...obj(incoming.completed) },
        bookmarks: { ...obj(existing.bookmarks), ...obj(incoming.bookmarks) },
        answers: { ...obj(existing.answers), ...obj(incoming.answers) },
        mockHistory: [...list(incoming.mockHistory), ...list(existing.mockHistory)].filter((e, i, a) => a.findIndex((x) => x.id === e.id) === i).sort((a, b) => String(b.at).localeCompare(String(a.at))).slice(0, 50),
        streak: ((obj(incoming.streak).days as number) ?? 0) >= ((obj(existing.streak).days as number) ?? 0) ? incoming.streak : existing.streak,
      };
      user.progress = merged;
      upsertUser(user.phone ?? user.email!, { classId: body.classId, medium: body.medium, stream: body.stream, ref: body.ref }, undefined, user.phone ? 'whatsapp' : 'email');
      return json(res, 200, { progress: merged });
    }

    // ---- orders / PayU ----
    if (path === '/api/orders' && req.method === 'POST') {
      const r = createOrder(user, String(body.planId));
      return json(res, 200, { order: publicOrder(r.order), payu: r.payu, testMode: r.testMode });
    }
    const om = path.match(/^\/api\/orders\/([A-Za-z0-9_-]+)(\/refund-request)?$/);
    if (om) {
      const order = data().orders.find((o) => o.id === om[1] && o.userId === user.id);
      if (!order) return json(res, 404, { error: 'unknown_order' });
      if (om[2] && req.method === 'POST') return json(res, 200, { order: publicOrder(requestRefund(user, order.id)) });
      return json(res, 200, { order: publicOrder(order) });
    }
    if (path === '/api/payments/test-pay' && req.method === 'POST') {
      if (!testMode()) return json(res, 403, { error: 'not_test_mode' });
      const order = data().orders.find((o) => o.id === body.orderId && o.userId === user.id);
      if (!order) return json(res, 404, { error: 'unknown_order' });
      const status = (['success', 'failure', 'pending'].includes(body.status) ? body.status : 'success') as 'success' | 'failure' | 'pending';
      const resp = buildTestResponse(order, status, user);
      const settled = await settle(resp, 'webhook'); // same path a real PayU webhook takes
      return json(res, 200, { order: publicOrder(settled) });
    }
    return json(res, 404, { error: 'not_found' });
  } catch (e) {
    if (e instanceof AuthError || e instanceof PayError) return json(res, e.status, { error: e.code, message: e.message, ...e.extra });
    if (e instanceof ValidationError) return json(res, 400, { error: 'validation', message: e.message, errors: e.errors });
    console.error(e);
    return json(res, 500, { error: 'server_error' });
  }
}

const pendingConsent = new Map<string, boolean>();

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/^.*\/server\//, 'server/'))) {
  load();
  seedOwners();
  seedExamDates();
  seedPoster();
  startNotificationLoop();
  const port = Number(process.env.PORT ?? 8787);
  createServer((req, res) => { handle(req, res); }).listen(port, () => console.log(`API on http://localhost:${port} (TEST_MODE=${process.env.TEST_MODE})`));
}
