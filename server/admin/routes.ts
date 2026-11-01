/** /api/admin/* — every handler checks the admin session and role on the server. */
import type { IncomingMessage, ServerResponse } from 'node:http';
import { data, save, type Admin, type AdminRole } from '../db.ts';
import { AuthError, requestOtp, verifyOtp } from '../auth.ts';
import { adminFromToken, addAdmin, createAdminSession, dropAdminSession, findAdmin, publicAdmin, removeAdmin, requireRole, Forbidden } from './auth.ts';
import { listAudit, logAudit } from './audit.ts';
import { CSV_COLUMNS, ValidationError, csvTemplate, deleteQuestion, deleteSeries, deleteTest, importCsv, liveStatus, listQuestions, testResults, toCsv, upsertQuestion, upsertSeries, upsertTest } from './tests.ts';
import { CATEGORIES, deleteExamDate, deleteUpdate, examCalendar, updateState, upsertExamDate, upsertUpdate } from './updates.ts';
import { deleteUser, grantPlan, listPayments, listUsers, paymentsCsvRows, reconcilePending, revokePlan, setBlocked, setRefundState, userDetail, usersCsvRows } from './users.ts';
import { queueBroadcast } from './notify.ts';
import { stats } from './stats.ts';
import { listChapters, listReports, readContentFile, resolveReport, syllabusSummary, writeContentFile } from './content.ts';
import { deletePoster, savePosterImage, upsertPoster } from './posters.ts';

type Ctx = { req: IncomingMessage; res: ServerResponse; path: string; url: URL; body: Record<string, unknown>; raw: string; token: string | undefined; ip: string };
const json = (res: ServerResponse, status: number, body: unknown) => { res.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store' }); res.end(JSON.stringify(body)); };
const text = (res: ServerResponse, body: string, filename: string, type = 'text/csv; charset=utf-8') => { res.writeHead(200, { 'content-type': type, 'content-disposition': `attachment; filename="${filename}"`, 'cache-control': 'no-store' }); res.end(body); };
const page = (url: URL) => Math.max(1, Number(url.searchParams.get('page') ?? 1));
const q = (url: URL, k: string) => url.searchParams.get(k) ?? undefined;
const reason = (body: Record<string, unknown>) => { const r = String(body.reason ?? '').trim(); if (!r) throw new ValidationError(['a reason is required']); return r; };

/** Returns true when the request was handled. */
export async function handleAdmin(c: Ctx): Promise<boolean> {
  const { req, res, path, url, body } = c;
  if (!path.startsWith('/api/admin/')) return false;
  const m = req.method;
  try {
    // ---- login (same WhatsApp OTP, admins only) ----
    if (path === '/api/admin/auth/otp/request' && m === 'POST') {
      const phone = String(body.phone ?? '').replace(/\D/g, '').slice(-10);
      const a = findAdmin('91' + phone);
      if (!a) throw new Forbidden('not_admin');
      const r = await requestOtp(phone, c.ip);
      return json(res, 200, { ok: true, ...r }), true;
    }
    if (path === '/api/admin/auth/otp/verify' && m === 'POST') {
      const phone = verifyOtp(String(body.phone ?? ''), String(body.code ?? ''));
      const a = findAdmin(phone);
      if (!a) throw new Forbidden('not_admin');
      const token = createAdminSession(phone);
      logAudit(a, 'login', 'admin', phone, null, null);
      return json(res, 200, { token, admin: publicAdmin(a) }), true;
    }
    if (path === '/api/admin/auth/logout' && m === 'POST') { if (c.token) dropAdminSession(c.token); return json(res, 200, { ok: true }), true; }

    const admin = requireRole(adminFromToken(c.token));
    const owner = () => requireRole(admin, 'owner');
    if (path === '/api/admin/me') return json(res, 200, { admin: publicAdmin(admin) }), true;
    if (path === '/api/admin/stats') return json(res, 200, stats(new Date(), admin.role === 'owner')), true;

    // ---- test series ----
    const db = data();
    if (path === '/api/admin/series' && m === 'GET') return json(res, 200, { rows: db.series.map((s) => ({ ...s, tests: db.tests.filter((t) => t.seriesId === s.id).length })) }), true;
    if (path === '/api/admin/series' && m === 'POST') { const s = upsertSeries(admin, body); logAudit(admin, 'create', 'series', s.id, null, s); return json(res, 200, { series: s }), true; }
    let mm = path.match(/^\/api\/admin\/series\/([\w-]+)$/);
    if (mm) {
      const existing = db.series.find((s) => s.id === mm![1]);
      if (!existing) return json(res, 404, { error: 'not_found' }), true;
      if (m === 'PUT') { const s = upsertSeries(admin, body, existing); logAudit(admin, 'update', 'series', s.id, existing, s); return json(res, 200, { series: s }), true; }
      if (m === 'DELETE') { deleteSeries(existing.id); logAudit(admin, 'delete', 'series', existing.id, existing, null, body.reason ? String(body.reason) : null); return json(res, 200, { ok: true }), true; }
    }
    // ---- tests ----
    if (path === '/api/admin/tests' && m === 'GET') return json(res, 200, { rows: db.tests.map((t) => ({ ...t, liveStatus: liveStatus(t), attempts: db.attempts.filter((a) => a.testId === t.id).length })) }), true;
    if (path === '/api/admin/tests' && m === 'POST') { const t = upsertTest(admin, body); logAudit(admin, 'create', 'test', t.id, null, t); return json(res, 200, { test: { ...t, liveStatus: liveStatus(t) } }), true; }
    mm = path.match(/^\/api\/admin\/tests\/([\w-]+)(\/results|\/notify|\/results\.csv)?$/);
    if (mm) {
      const existing = db.tests.find((t) => t.id === mm![1]);
      if (!existing) return json(res, 404, { error: 'not_found' }), true;
      if (mm[2] === '/results') return json(res, 200, testResults(existing)), true;
      if (mm[2] === '/results.csv') return text(res, toCsv(testResults(existing).list), `${existing.id}-results.csv`), true;
      if (mm[2] === '/notify' && m === 'POST') {
        const series = db.series.find((s) => s.id === existing.seriesId);
        const job = queueBroadcast(admin, 'test_live', series?.class ?? null, series?.access === 'plan' ? series.plans : null, String(body.text ?? `${existing.title.hi} — टेस्ट अब लाइव है। Bihar Board Padhai पर दें।`));
        existing.notifiedAt = new Date().toISOString(); save();
        logAudit(admin, 'notify', 'test', existing.id, null, job);
        return json(res, 200, { job }), true;
      }
      if (m === 'GET') return json(res, 200, { test: { ...existing, liveStatus: liveStatus(existing) }, questions: existing.questionIds.map((id) => db.questions.find((x) => x.id === id)).filter(Boolean) }), true;
      if (m === 'PUT') { const t = upsertTest(admin, { ...(body as Partial<import('../db.ts').AdminTest>), seriesId: String(body.seriesId ?? existing.seriesId) }, existing); logAudit(admin, body.status !== existing.status ? 'publish' : 'update', 'test', t.id, existing, t); return json(res, 200, { test: { ...t, liveStatus: liveStatus(t) } }), true; }
      if (m === 'DELETE') { deleteTest(existing.id); logAudit(admin, 'delete', 'test', existing.id, existing, null, body.reason ? String(body.reason) : null); return json(res, 200, { ok: true }), true; }
    }
    // ---- question bank ----
    if (path === '/api/admin/questions' && m === 'GET') return json(res, 200, listQuestions({ class: q(url, 'class'), subjectId: q(url, 'subjectId'), chapter: q(url, 'chapter'), difficulty: q(url, 'difficulty'), status: q(url, 'status'), q: q(url, 'q') }, page(url), Number(q(url, 'perPage') ?? 25))), true;
    if (path === '/api/admin/questions' && m === 'POST') { const qq = upsertQuestion(admin, body); logAudit(admin, 'create', 'question', qq.id, null, qq); return json(res, 200, { question: qq }), true; }
    if (path === '/api/admin/questions/template.csv') return text(res, csvTemplate(), 'questions-template.csv'), true;
    if (path === '/api/admin/questions/import' && m === 'POST') {
      const r = importCsv(admin, String(body.csv ?? ''), body.commit === true);
      if (r.saved) logAudit(admin, 'import', 'question', `csv:${r.saved}`, null, { saved: r.saved, columns: CSV_COLUMNS });
      return json(res, 200, r), true;
    }
    mm = path.match(/^\/api\/admin\/questions\/([\w-]+)$/);
    if (mm) {
      const existing = db.questions.find((x) => x.id === mm![1]);
      if (!existing) return json(res, 404, { error: 'not_found' }), true;
      if (m === 'GET') return json(res, 200, { question: existing }), true;
      if (m === 'PUT') { const qq = upsertQuestion(admin, body, existing); logAudit(admin, 'update', 'question', qq.id, existing, qq); return json(res, 200, { question: qq }), true; }
      if (m === 'DELETE') { deleteQuestion(existing.id); logAudit(admin, 'delete', 'question', existing.id, existing, null); return json(res, 200, { ok: true }), true; }
    }
    // ---- updates ----
    if (path === '/api/admin/updates' && m === 'GET') return json(res, 200, { rows: [...db.updates].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).map((u) => ({ ...u, state: updateState(u) })), categories: CATEGORIES }), true;
    if (path === '/api/admin/updates' && m === 'POST') { const u = upsertUpdate(admin, body); logAudit(admin, u.status === 'published' ? 'publish' : 'create', 'update', u.id, null, u); return json(res, 200, { update: { ...u, state: updateState(u) } }), true; }
    mm = path.match(/^\/api\/admin\/updates\/([\w-]+)(\/notify)?$/);
    if (mm) {
      const existing = db.updates.find((x) => x.id === mm![1]);
      if (!existing) return json(res, 404, { error: 'not_found' }), true;
      if (mm[2] && m === 'POST') { const job = queueBroadcast(admin, 'update', existing.class === 'both' ? null : existing.class, null, String(body.text ?? `${existing.title.hi}: ${existing.text.hi}`.slice(0, 900))); existing.notifiedAt = new Date().toISOString(); save(); logAudit(admin, 'notify', 'update', existing.id, null, job); return json(res, 200, { job }), true; }
      if (m === 'PUT') { const u = upsertUpdate(admin, body, existing); logAudit(admin, u.status !== existing.status ? 'publish' : 'update', 'update', u.id, existing, u); return json(res, 200, { update: { ...u, state: updateState(u) } }), true; }
      if (m === 'DELETE') { deleteUpdate(existing.id); logAudit(admin, 'delete', 'update', existing.id, existing, null); return json(res, 200, { ok: true }), true; }
    }
    // ---- exam calendar ----
    if (path === '/api/admin/calendar' && m === 'GET') return json(res, 200, examCalendar()), true;
    if (path === '/api/admin/calendar' && m === 'POST') { const r = upsertExamDate(body); logAudit(admin, 'create', 'examDate', r.id, null, r); return json(res, 200, { row: r }), true; }
    mm = path.match(/^\/api\/admin\/calendar\/([\w-]+)$/);
    if (mm) {
      const existing = db.examDates.find((x) => x.id === mm![1]);
      if (!existing) return json(res, 404, { error: 'not_found' }), true;
      if (m === 'PUT') { const r = upsertExamDate(body, existing); logAudit(admin, 'update', 'examDate', r.id, existing, r); return json(res, 200, { row: r }), true; }
      if (m === 'DELETE') { deleteExamDate(existing.id); logAudit(admin, 'delete', 'examDate', existing.id, existing, null); return json(res, 200, { ok: true }), true; }
    }
    // ---- users ----
    if (path === '/api/admin/users' && m === 'GET') return json(res, 200, listUsers({ q: q(url, 'q'), class: q(url, 'class'), medium: q(url, 'medium'), stream: q(url, 'stream'), plan: q(url, 'plan'), planStatus: q(url, 'planStatus'), since: q(url, 'since'), optIn: q(url, 'optIn') }, page(url))), true;
    if (path === '/api/admin/users/export.csv') { owner(); logAudit(admin, 'export', 'user', 'csv', null, { rows: db.users.length }); return text(res, toCsv(usersCsvRows()), 'users.csv'), true; }
    mm = path.match(/^\/api\/admin\/users\/([\w-]+)(\/phone|\/plan|\/revoke|\/refund|\/block)?$/);
    if (mm) {
      const u = db.users.find((x) => x.id === mm![1]);
      if (!u) return json(res, 404, { error: 'not_found' }), true;
      const action = mm[2];
      if (!action && m === 'GET') return json(res, 200, { user: userDetail(u, false) }), true;
      if (action === '/phone') { owner(); logAudit(admin, 'view_phone', 'user', u.id, null, null); return json(res, 200, { phone: u.phone ?? u.contactPhone ?? u.email }), true; }
      if (!action && m === 'DELETE') { owner(); const r = reason(body); logAudit(admin, 'delete', 'user', u.id, userDetail(u, false), null, r); deleteUser(u); return json(res, 200, { ok: true }), true; }
      if (action === '/plan' && m === 'POST') { owner(); const r = reason(body); const before = u.plan; const after = grantPlan(u, String(body.planId), body.validTill ? String(body.validTill) : null, admin.phone); logAudit(admin, 'grant_plan', 'user', u.id, before, after, r); return json(res, 200, { plan: after }), true; }
      if (action === '/revoke' && m === 'POST') { owner(); const r = reason(body); const before = revokePlan(u); logAudit(admin, 'revoke_plan', 'user', u.id, before, null, r); return json(res, 200, { ok: true }), true; }
      if (action === '/refund' && m === 'POST') { owner(); const r = reason(body); const before = u.plan; const after = setRefundState(u, body.state as 'requested' | 'processing' | 'refunded'); logAudit(admin, 'refund_' + String(body.state), 'user', u.id, before, after, r); return json(res, 200, { plan: after }), true; }
      if (action === '/block' && m === 'POST') { owner(); const r = reason(body); const blocked = body.blocked !== false; setBlocked(u, blocked); logAudit(admin, blocked ? 'block' : 'unblock', 'user', u.id, { blocked: !blocked }, { blocked }, r); return json(res, 200, { ok: true, blocked }), true; }
    }
    // ---- payments (owner only) ----
    if (path.startsWith('/api/admin/payments')) {
      owner();
      if (path === '/api/admin/payments' && m === 'GET') return json(res, 200, listPayments({ status: q(url, 'status'), plan: q(url, 'plan'), q: q(url, 'q'), from: q(url, 'from'), to: q(url, 'to') }, page(url))), true;
      if (path === '/api/admin/payments/reconcile' && m === 'POST') { const r = await reconcilePending(); logAudit(admin, 'reconcile', 'payment', 'pending', null, r); return json(res, 200, { results: r }), true; }
      if (path === '/api/admin/payments/export.csv') { logAudit(admin, 'export', 'payment', 'csv', null, null); return text(res, toCsv(paymentsCsvRows()), 'payments.csv'), true; }
    }
    // ---- content ----
    if (path === '/api/admin/content/chapters' && m === 'GET') return json(res, 200, { rows: listChapters() }), true;
    if (path === '/api/admin/content/syllabus') return json(res, 200, syllabusSummary()), true;
    if (path === '/api/admin/content/papers' && m === 'GET') return json(res, 200, { papers: readContentFile('papers.json') }), true;
    if (path === '/api/admin/content/papers' && m === 'PUT') { const before = readContentFile('papers.json'); writeContentFile('papers.json', body.papers); logAudit(admin, 'update', 'papers', 'papers.json', before, body.papers); return json(res, 200, { ok: true }), true; }
    mm = path.match(/^\/api\/admin\/content\/file\/(.+\.json)$/);
    if (mm) {
      const rel = decodeURIComponent(mm[1]);
      if (m === 'GET') return json(res, 200, { file: rel, body: readContentFile(rel) }), true;
      if (m === 'PUT') { const before = readContentFile(rel); writeContentFile(rel, body.body); logAudit(admin, 'update', 'chapter', rel, { status: before.status, lastReviewed: before.lastReviewed }, { status: (body.body as { status: string }).status, lastReviewed: (body.body as { lastReviewed: string }).lastReviewed }); return json(res, 200, { ok: true, rebuildNeeded: true }), true; }
    }
    if (path === '/api/admin/reports' && m === 'GET') return json(res, 200, listReports(q(url, 'status'), page(url))), true;
    mm = path.match(/^\/api\/admin\/reports\/([\w-]+)$/);
    if (mm && m === 'PUT') { const r = resolveReport(mm[1], admin.phone, body.status === 'open' ? 'open' : 'resolved', body.reply ? String(body.reply) : null); logAudit(admin, 'resolve', 'report', r.id, null, { status: r.status, reply: r.reply }); return json(res, 200, { report: r }), true; }
    // ---- team (owner only) ----
    if (path === '/api/admin/team' && m === 'GET') { owner(); return json(res, 200, { rows: db.admins.map(publicAdmin) }), true; }
    if (path === '/api/admin/team' && m === 'POST') { owner(); const role = (body.role === 'owner' ? 'owner' : 'editor') as AdminRole; const a = addAdmin(admin, String(body.phone ?? ''), role, body.name ? String(body.name) : null); logAudit(admin, 'add_admin', 'admin', a.phone, null, publicAdmin(a)); return json(res, 200, { admin: publicAdmin(a) }), true; }
    mm = path.match(/^\/api\/admin\/team\/(\d+)$/);
    if (mm && m === 'DELETE') { owner(); const before = findAdmin(mm[1]); removeAdmin(mm[1]); logAudit(admin, 'remove_admin', 'admin', mm[1], before ? publicAdmin(before) : null, null); return json(res, 200, { ok: true }), true; }
    // ---- posters ----
    if (path === '/api/admin/posters' && m === 'GET') return json(res, 200, { rows: [...db.posters].sort((a, b) => a.order - b.order) }), true;
    if (path === '/api/admin/posters' && m === 'POST') { const po = upsertPoster(admin, body); logAudit(admin, 'create', 'poster', po.id, null, po); return json(res, 200, { poster: po }), true; }
    if (path === '/api/admin/posters/upload' && m === 'POST') { const r = savePosterImage(String(body.dataUrl ?? '')); return json(res, 200, r), true; }
    mm = path.match(/^\/api\/admin\/posters\/([\w-]+)$/);
    if (mm) {
      const existing = db.posters.find((x) => x.id === mm![1]);
      if (!existing) return json(res, 404, { error: 'not_found' }), true;
      if (m === 'PUT') { const po = upsertPoster(admin, body, existing); logAudit(admin, 'update', 'poster', po.id, existing, po); return json(res, 200, { poster: po }), true; }
      if (m === 'DELETE') { deletePoster(existing.id); logAudit(admin, 'delete', 'poster', existing.id, existing, null); return json(res, 200, { ok: true }), true; }
    }
    // ---- audit ----
    if (path === '/api/admin/audit') return json(res, 200, listAudit({ entity: q(url, 'entity'), admin: q(url, 'admin'), q: q(url, 'q') }, page(url))), true;

    return json(res, 404, { error: 'not_found' }), true;
  } catch (e) {
    if (e instanceof AuthError) return json(res, e.status, { error: e.code, ...e.extra }), true;
    if (e instanceof Forbidden) return json(res, 403, { error: 'forbidden', message: e.message }), true;
    if (e instanceof ValidationError) return json(res, 400, { error: 'validation', errors: e.errors }), true;
    console.error(e);
    return json(res, 500, { error: 'server_error' }), true;
  }
}

export type { Admin };
