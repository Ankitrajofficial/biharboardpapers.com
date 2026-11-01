/** Live updates / news and the editable exam calendar. Status is derived from timestamps. */
import { randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { data, save, type Admin, type ExamDateRow, type Update, type UpdateCategory } from '../db.ts';
import { ValidationError } from './tests.ts';

const here = import.meta.url.startsWith('file:') ? fileURLToPath(import.meta.url) : import.meta.url;
const ROOT = resolve(dirname(here), '../..') + '/';
const id = (p: string) => p + '_' + randomBytes(5).toString('hex');
const now = () => new Date().toISOString();
export const CATEGORIES: UpdateCategory[] = ['exam_date', 'admit_card', 'result', 'model_paper', 'notice', 'site_update'];
const OFFICIAL_HOSTS = ['biharboardonline.bihar.gov.in', 'biharboardonline.com', 'bsebstet.com', 'secondary.biharboardonline.com', 'seniorsecondary.biharboardonline.com', 'bseb.bihar.gov.in'];
export const isOfficialLink = (url: string | null) => { if (!url) return false; try { const h = new URL(url).hostname; return OFFICIAL_HOSTS.some((o) => h === o || h.endsWith('.' + o)); } catch { return false; } };

export type UpdateState = 'draft' | 'scheduled' | 'published' | 'expired';
export function updateState(u: Update, at = Date.now()): UpdateState {
  if (u.status === 'draft') return 'draft';
  if (u.expiresAt && new Date(u.expiresAt).getTime() <= at) return 'expired';
  if (u.publishAt && new Date(u.publishAt).getTime() > at) return 'scheduled';
  return 'published';
}

export function upsertUpdate(admin: Admin, input: Partial<Update>, existing?: Update): Update {
  const errs: string[] = [];
  const t = (v: unknown) => { const o = (v ?? {}) as { hi?: string; en?: string }; const hi = String(o.hi ?? '').trim(), en = String(o.en ?? '').trim(); return { hi: hi || en, en: en || hi }; };
  const title = t(input.title); const text = t(input.text);
  if (!title.hi) errs.push('title is required');
  if (!CATEGORIES.includes(input.category as UpdateCategory)) errs.push('invalid category');
  if (!['class-10', 'class-12', 'both'].includes(String(input.class ?? 'both'))) errs.push('class must be class-10, class-12 or both');
  const link = input.link ? String(input.link).trim() : null;
  if (link && !/^https?:\/\//.test(link)) errs.push('link must start with http(s)://');
  const source = String(input.source ?? '').trim();
  if (!source) errs.push('source is required (where did this information come from?)');
  const publishAt = input.publishAt ? new Date(input.publishAt).toISOString() : null;
  const expiresAt = input.expiresAt ? new Date(input.expiresAt).toISOString() : null;
  if (publishAt && expiresAt && expiresAt <= publishAt) errs.push('expiry must be after publish time');
  const att = input.attachment as { url?: string; kind?: string } | null | undefined;
  const attachment = att?.url ? { url: String(att.url), kind: att.kind === 'pdf' ? 'pdf' as const : 'image' as const } : null;
  if (errs.length) throw new ValidationError(errs);
  const u: Update = {
    id: existing?.id ?? id('upd'), title, text, category: input.category as UpdateCategory, class: (input.class ?? 'both') as Update['class'], link, attachment,
    pinned: !!input.pinned, important: !!input.important, source, status: input.status === 'published' ? 'published' : 'draft', publishAt, expiresAt,
    notifiedAt: existing?.notifiedAt ?? null, createdAt: existing?.createdAt ?? now(), updatedAt: now(), createdBy: existing?.createdBy ?? admin.phone,
  };
  const db = data();
  if (existing) db.updates = db.updates.map((x) => (x.id === u.id ? u : x)); else db.updates.push(u);
  save();
  return u;
}
export function deleteUpdate(uid: string) { const db = data(); db.updates = db.updates.filter((u) => u.id !== uid); save(); }

export const publicUpdate = (u: Update) => ({ id: u.id, title: u.title, text: u.text, category: u.category, class: u.class, link: u.link, official: isOfficialLink(u.link), attachment: u.attachment, pinned: u.pinned, important: u.important, source: u.source, publishedAt: u.publishAt ?? u.createdAt, expiresAt: u.expiresAt });

/** Student feed: published, not expired, newest first with pinned/important on top. */
export function liveUpdates(cls?: string | null, category?: string | null, limit = 50, at = Date.now()) {
  return data().updates
    .filter((u) => updateState(u, at) === 'published' && (!cls || u.class === 'both' || u.class === cls) && (!category || u.category === category))
    .sort((a, b) => Number(b.pinned) - Number(a.pinned) || Number(b.important) - Number(a.important) || (b.publishAt ?? b.createdAt).localeCompare(a.publishAt ?? a.createdAt))
    .slice(0, limit).map(publicUpdate);
}

// ---------- Exam calendar ----------
/** Seed from content/exam-calendar.json the first time, so the admin table starts with what the site ships. */
export function seedExamDates() {
  const db = data();
  if (db.examDates.length) return;
  try {
    const cal = JSON.parse(readFileSync(`${ROOT}content/exam-calendar.json`, 'utf8')) as { exams: Array<{ class: 'class-10' | 'class-12'; start: string; end: string; status: 'official' | 'expected'; note?: string; sourceUrl?: string }> };
    for (const e of cal.exams) {
      db.examDates.push({ id: id('ex'), class: e.class, subject: 'first paper', date: e.start, shift: 'morning', status: e.status, note: e.note ?? null, sourceUrl: e.sourceUrl ?? null });
      db.examDates.push({ id: id('ex'), class: e.class, subject: 'last paper', date: e.end, shift: 'afternoon', status: e.status, note: e.note ?? null, sourceUrl: e.sourceUrl ?? null });
    }
    save();
  } catch { /* no file */ }
}
export function upsertExamDate(input: Partial<ExamDateRow>, existing?: ExamDateRow): ExamDateRow {
  const errs: string[] = [];
  if (!['class-10', 'class-12'].includes(String(input.class))) errs.push('class is required');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(input.date)) || isNaN(Date.parse(String(input.date)))) errs.push('date must be YYYY-MM-DD');
  const status = input.status === 'official' ? 'official' : 'expected';
  if (status === 'official' && !/^https?:\/\//.test(String(input.sourceUrl ?? ''))) errs.push('official dates need a source URL');
  if (errs.length) throw new ValidationError(errs);
  const r: ExamDateRow = { id: existing?.id ?? id('ex'), class: input.class as ExamDateRow['class'], subject: input.subject ? String(input.subject) : null, date: String(input.date), shift: input.shift === 'afternoon' ? 'afternoon' : input.shift === 'morning' ? 'morning' : null, status, note: input.note ? String(input.note) : null, sourceUrl: input.sourceUrl ? String(input.sourceUrl) : null };
  const db = data();
  if (existing) db.examDates = db.examDates.map((x) => (x.id === r.id ? r : x)); else db.examDates.push(r);
  save();
  return r;
}
export function deleteExamDate(rid: string) { const db = data(); db.examDates = db.examDates.filter((x) => x.id !== rid); save(); }

/** Same shape as content/exam-calendar.json so the countdown and plan expiry work unchanged. */
export function examCalendar() {
  const rows = data().examDates;
  const exams: Array<{ class: string; year: number; status: 'official' | 'expected'; start: string; end: string; note?: string; sourceUrl: string }> = [];
  for (const cls of ['class-10', 'class-12'] as const) {
    const byYear = new Map<number, ExamDateRow[]>();
    for (const r of rows.filter((x) => x.class === cls)) { const y = Number(r.date.slice(0, 4)); byYear.set(y, [...(byYear.get(y) ?? []), r]); }
    for (const [year, list] of byYear) {
      const dates = list.map((r) => r.date).sort();
      exams.push({ class: cls, year, status: list.every((r) => r.status === 'official') ? 'official' : 'expected', start: dates[0], end: dates[dates.length - 1], note: list.find((r) => r.note)?.note ?? undefined, sourceUrl: list.find((r) => r.sourceUrl)?.sourceUrl ?? 'https://biharboardonline.bihar.gov.in' });
    }
  }
  return { _comment: 'Edited from the admin panel', updated: now().slice(0, 10), exams, rows };
}
