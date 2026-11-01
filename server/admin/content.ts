/** Content files (chapters, papers), syllabus summary and the mistake-report inbox. */
import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { data, save, type MistakeReport } from '../db.ts';
import { ValidationError } from './tests.ts';

const here = import.meta.url.startsWith('file:') ? fileURLToPath(import.meta.url) : import.meta.url;
const ROOT = resolve(dirname(here), '../..');
const CONTENT = join(ROOT, 'content');
const STATUSES = ['sample', 'draft', 'reviewed', 'verified_official'];

const walk = (dir: string): string[] => (existsSync(dir) ? readdirSync(dir).flatMap((f) => { const p = join(dir, f); return statSync(p).isDirectory() ? walk(p) : [p]; }) : []);
const safeRel = (rel: string) => { const p = resolve(CONTENT, rel); if (!p.startsWith(CONTENT + '/') || !p.endsWith('.json')) throw new ValidationError(['bad path']); return p; };

export function listChapters() {
  return walk(CONTENT).filter((f) => /content\/class-1[02]\//.test(f)).map((f) => {
    const c = JSON.parse(readFileSync(f, 'utf8'));
    return { file: f.slice(CONTENT.length + 1), id: c.id, class: c.class, medium: c.medium, subjectId: c.subjectId, chapterNumber: c.chapterNumber, title: c.title, status: c.status, source: c.source, lastReviewed: c.lastReviewed, reviewer: c.reviewer, objective: (c.objective ?? []).length, important: (c.important ?? []).length };
  }).sort((a, b) => a.file.localeCompare(b.file));
}
export const readContentFile = (rel: string) => JSON.parse(readFileSync(safeRel(rel), 'utf8'));
/** Writes a chapter/papers JSON back to disk after a light validation. Pre-rendered pages need a rebuild to pick it up. */
export function writeContentFile(rel: string, body: unknown) {
  const p = safeRel(rel);
  const errs: string[] = [];
  if (/class-1[02]\//.test(rel)) {
    const c = body as Record<string, unknown>;
    for (const k of ['id', 'class', 'medium', 'subjectId', 'title', 'slug', 'status', 'source', 'lastReviewed', 'reviewer']) if (!c[k]) errs.push(`${k} is required`);
    if (!STATUSES.includes(String(c.status))) errs.push('invalid status');
    if (c.status === 'verified_official' && !String(c.sourceUrl ?? '').startsWith('https://')) errs.push('verified_official needs an https sourceUrl');
    if (!Array.isArray(c.notes) || !Array.isArray(c.objective) || !Array.isArray(c.important)) errs.push('notes, objective and important must be arrays');
    for (const q of (c.objective ?? []) as Array<Record<string, unknown>>) if (!Array.isArray(q.options) || q.options.length !== 4 || ![0, 1, 2, 3].includes(Number(q.answer))) errs.push(`question ${q.id ?? '?'}: 4 options and answer 0–3 required`);
  } else if (rel === 'papers.json') {
    if (!Array.isArray(body)) errs.push('papers.json must be an array');
  } else errs.push('only chapter files and papers.json can be edited here');
  if (errs.length) throw new ValidationError(errs);
  writeFileSync(p, JSON.stringify(body, null, 2));
}
export function syllabusSummary() {
  const s = JSON.parse(readFileSync(join(CONTENT, 'syllabus.json'), 'utf8')) as { meta: Record<string, unknown>; subjects: Array<{ id: string; class: string; codes: string[]; name: { hi: string; en: string }; chapterCount: number; status: string }> };
  return { meta: s.meta, subjects: s.subjects.map((x) => ({ id: x.id, class: x.class, codes: x.codes, name: x.name, chapterCount: x.chapterCount, status: x.status })) };
}

// ---------- Mistake reports ----------
export function addReport(input: { userId?: string | null; phone?: string | null; page: string; refId: string; message: string }) {
  const message = String(input.message ?? '').trim().slice(0, 1000);
  if (!message) throw new ValidationError(['message is required']);
  const r: MistakeReport = { id: 'rep_' + randomBytes(5).toString('hex'), at: new Date().toISOString(), userId: input.userId ?? null, phone: input.phone ?? null, page: String(input.page ?? '').slice(0, 300), refId: String(input.refId ?? '').slice(0, 100), message, status: 'open', reply: null, resolvedBy: null, resolvedAt: null };
  data().reports.unshift(r);
  save();
  return r;
}
export function listReports(status?: string, page = 1, perPage = 25) {
  let rows = data().reports;
  if (status) rows = rows.filter((r) => r.status === status);
  return { total: rows.length, page, perPage, rows: rows.slice((page - 1) * perPage, page * perPage).map((r) => ({ ...r, phone: r.phone ? r.phone.slice(2, 4) + '•••••' + r.phone.slice(-3) : null })) };
}
export function resolveReport(rid: string, by: string, status: 'open' | 'resolved', reply: string | null) {
  const r = data().reports.find((x) => x.id === rid);
  if (!r) throw new ValidationError(['unknown report']);
  r.status = status; r.reply = reply; r.resolvedBy = status === 'resolved' ? by : null; r.resolvedAt = status === 'resolved' ? new Date().toISOString() : null;
  save();
  return r;
}
