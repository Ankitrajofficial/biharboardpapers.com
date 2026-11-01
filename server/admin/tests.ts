/** Test series, tests, question bank, CSV import, server-side scoring, results. */
import { randomBytes } from 'node:crypto';
import { data, save, type Admin, type AdminTest, type Attempt, type BankQuestion, type TestSeries, type User } from '../db.ts';
import { planActive, planPrices } from '../payments.ts';

export class ValidationError extends Error {
  status = 400;
  code = 'validation';
  errors: string[];
  constructor(errors: string[]) {
    super(errors.join('; '));
    this.errors = errors;
  }
}
const id = (p: string) => p + '_' + randomBytes(5).toString('hex');
const now = () => new Date().toISOString();
const bi = (v: unknown, what: string, errs: string[], required = true) => {
  const o = (v ?? {}) as { hi?: string; en?: string };
  const hi = String(o.hi ?? '').trim(); const en = String(o.en ?? '').trim();
  if (required && !hi && !en) errs.push(`${what} is required (hi or en)`);
  return { hi: hi || en, en: en || hi };
};

// ---------- Series ----------
export function upsertSeries(admin: Admin, input: Partial<TestSeries>, existing?: TestSeries): TestSeries {
  const errs: string[] = [];
  const title = bi(input.title, 'title', errs);
  const description = bi(input.description, 'description', errs, false);
  if (!['class-10', 'class-12'].includes(String(input.class))) errs.push('class must be class-10 or class-12');
  const stream = (['arts', 'science', 'commerce', 'all'].includes(String(input.stream)) ? input.stream : 'all') as TestSeries['stream'];
  const medium = (['hindi', 'english', 'both'].includes(String(input.medium)) ? input.medium : 'both') as TestSeries['medium'];
  const access = input.access === 'plan' ? 'plan' : 'free';
  const plans = (Array.isArray(input.plans) ? input.plans : []).filter((p) => p in planPrices) as TestSeries['plans'];
  if (access === 'plan' && !plans.length) errs.push('choose at least one plan for a plan-locked series');
  if (errs.length) throw new ValidationError(errs);
  const s: TestSeries = {
    id: existing?.id ?? id('ser'), title, description, class: input.class as TestSeries['class'], stream, subjectIds: Array.isArray(input.subjectIds) ? input.subjectIds.map(String) : [],
    medium, access, plans, color: String(input.color ?? 'blue'), createdAt: existing?.createdAt ?? now(), updatedAt: now(), createdBy: existing?.createdBy ?? admin.phone,
  };
  const db = data();
  if (existing) db.series = db.series.map((x) => (x.id === s.id ? s : x)); else db.series.push(s);
  save();
  return s;
}
export function deleteSeries(seriesId: string) {
  const db = data();
  if (db.tests.some((t) => t.seriesId === seriesId)) throw new ValidationError(['delete its tests first']);
  db.series = db.series.filter((s) => s.id !== seriesId);
  save();
}

// ---------- Tests ----------
export type LiveStatus = 'draft' | 'scheduled' | 'live' | 'closed';
/** Status is derived from the schedule, so no cron is needed. */
export function liveStatus(t: AdminTest, at = Date.now()): LiveStatus {
  if (t.status === 'draft') return 'draft';
  if (t.status === 'closed') return 'closed';
  const s = t.startAt ? new Date(t.startAt).getTime() : -Infinity;
  const e = t.endAt ? new Date(t.endAt).getTime() : Infinity;
  if (at < s) return 'scheduled';
  if (at >= e) return 'closed';
  return 'live';
}

export function upsertTest(admin: Admin, input: Partial<AdminTest>, existing?: AdminTest): AdminTest {
  const errs: string[] = [];
  const db = data();
  const series = db.series.find((s) => s.id === input.seriesId);
  if (!series) errs.push('seriesId must point at an existing series');
  const title = bi(input.title, 'title', errs);
  const instructions = bi(input.instructions, 'instructions', errs, false);
  const type = (['chapter', 'full', 'quick'].includes(String(input.type)) ? input.type : 'chapter') as AdminTest['type'];
  const durationMin = Number(input.durationMin ?? (type === 'full' ? 195 : 20));
  const totalQuestions = Number(input.totalQuestions ?? (input.questionIds?.length ?? 0));
  const attemptLimit = Number(input.attemptLimit ?? totalQuestions);
  if (!(durationMin > 0 && durationMin <= 600)) errs.push('duration must be 1–600 minutes');
  if (!(totalQuestions > 0)) errs.push('total questions must be at least 1');
  if (!(attemptLimit > 0 && attemptLimit <= totalQuestions)) errs.push('attempt limit must be between 1 and total questions');
  const marksPerQuestion = Number(input.marksPerQuestion ?? 1);
  const negativeMarks = Number(input.negativeMarks ?? 0);
  if (negativeMarks < 0) errs.push('negative marks cannot be negative');
  const questionIds = (Array.isArray(input.questionIds) ? input.questionIds.map(String) : []).filter((q, i, a) => a.indexOf(q) === i);
  for (const q of questionIds) if (!db.questions.some((x) => x.id === q)) errs.push(`unknown question ${q}`);
  const status = (['draft', 'scheduled', 'closed'].includes(String(input.status)) ? input.status : 'draft') as AdminTest['status'];
  const startAt = input.startAt ? new Date(input.startAt).toISOString() : null;
  const endAt = input.endAt ? new Date(input.endAt).toISOString() : null;
  if (status === 'scheduled') {
    if (!startAt || !endAt) errs.push('scheduled tests need start and end date-time');
    else if (endAt <= startAt) errs.push('end must be after start');
    if (questionIds.length < totalQuestions) errs.push(`add ${totalQuestions} questions before scheduling (have ${questionIds.length})`);
  }
  if (errs.length) throw new ValidationError(errs);
  const t: AdminTest = {
    id: existing?.id ?? id('tst'), seriesId: String(input.seriesId), title, type, durationMin, totalQuestions, attemptLimit, marksPerQuestion, negativeMarks, instructions, questionIds,
    status, startAt, endAt, resultsVisible: input.resultsVisible === 'after_end' ? 'after_end' : 'instant', leaderboard: !!input.leaderboard,
    notifiedAt: existing?.notifiedAt ?? null, createdAt: existing?.createdAt ?? now(), updatedAt: now(), createdBy: existing?.createdBy ?? admin.phone,
  };
  if (existing) db.tests = db.tests.map((x) => (x.id === t.id ? t : x)); else db.tests.push(t);
  save();
  return t;
}
export function deleteTest(testId: string) {
  const db = data();
  db.tests = db.tests.filter((t) => t.id !== testId);
  db.attempts = db.attempts.filter((a) => a.testId !== testId);
  save();
}

// ---------- Questions ----------
const DIFF = ['easy', 'medium', 'hard'];
const SRC = ['sample', 'pyq_pattern', 'official_model_paper'];
export function validateQuestion(input: Partial<BankQuestion> & Record<string, unknown>): { q: Omit<BankQuestion, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>; errors: string[] } {
  const errors: string[] = [];
  const question = bi(input.question, 'question', errors);
  const opts = (input.options ?? {}) as { hi?: unknown; en?: unknown };
  const norm = (v: unknown) => (Array.isArray(v) ? v.map((x) => String(x ?? '').trim()) : []);
  let hi = norm(opts.hi), en = norm(opts.en);
  if (hi.length !== 4 && en.length === 4) hi = en;
  if (en.length !== 4 && hi.length === 4) en = hi;
  if (hi.length !== 4 || hi.some((x) => !x)) errors.push('exactly four non-empty options are required');
  const answer = Number(input.answer);
  if (!Number.isInteger(answer) || answer < 0 || answer > 3) errors.push('answer must be 0–3 (A–D)');
  const explanation = bi(input.explanation, 'explanation', errors, false);
  if (!['class-10', 'class-12'].includes(String(input.class))) errors.push('class must be class-10 or class-12');
  if (!input.subjectId) errors.push('subjectId is required');
  const difficulty = (DIFF.includes(String(input.difficulty)) ? input.difficulty : 'medium') as BankQuestion['difficulty'];
  const src = (input.source ?? {}) as { type?: string; citation?: string };
  const type = (SRC.includes(String(src.type)) ? src.type : 'sample') as BankQuestion['source']['type'];
  const citation = src.citation ? String(src.citation).trim() : null;
  if (type === 'official_model_paper' && !citation) errors.push('official model paper questions need a citation (paper + year + question number)');
  const status = input.status === 'reviewed' ? 'reviewed' : 'draft';
  return { q: { question, options: { hi, en }, answer, explanation, class: input.class as BankQuestion['class'], subjectId: String(input.subjectId ?? ''), chapter: input.chapter ? String(input.chapter) : null, difficulty, source: { type, citation }, status }, errors };
}
export function upsertQuestion(admin: Admin, input: Partial<BankQuestion>, existing?: BankQuestion): BankQuestion {
  const { q, errors } = validateQuestion(input as Partial<BankQuestion> & Record<string, unknown>);
  if (errors.length) throw new ValidationError(errors);
  const full: BankQuestion = { ...q, id: existing?.id ?? id('q'), createdAt: existing?.createdAt ?? now(), updatedAt: now(), createdBy: existing?.createdBy ?? admin.phone };
  const db = data();
  if (existing) db.questions = db.questions.map((x) => (x.id === full.id ? full : x)); else db.questions.push(full);
  save();
  return full;
}
export function deleteQuestion(qid: string) {
  const db = data();
  const used = db.tests.filter((t) => t.questionIds.includes(qid));
  if (used.length) throw new ValidationError([`question is used in ${used.length} test(s); remove it there first`]);
  db.questions = db.questions.filter((q) => q.id !== qid);
  save();
}
export function listQuestions(f: { class?: string; subjectId?: string; chapter?: string; difficulty?: string; status?: string; q?: string }, page = 1, perPage = 25) {
  let rows = data().questions;
  if (f.class) rows = rows.filter((x) => x.class === f.class);
  if (f.subjectId) rows = rows.filter((x) => x.subjectId === f.subjectId);
  if (f.chapter) rows = rows.filter((x) => (x.chapter ?? '').toLowerCase().includes(f.chapter!.toLowerCase()));
  if (f.difficulty) rows = rows.filter((x) => x.difficulty === f.difficulty);
  if (f.status) rows = rows.filter((x) => x.status === f.status);
  if (f.q) { const q = f.q.toLowerCase(); rows = rows.filter((x) => `${x.question.hi} ${x.question.en} ${x.id}`.toLowerCase().includes(q)); }
  return { total: rows.length, page, perPage, rows: rows.slice((page - 1) * perPage, page * perPage) };
}

// ---------- CSV import ----------
export const CSV_COLUMNS = ['class', 'subjectId', 'chapter', 'question_hi', 'question_en', 'optionA_hi', 'optionB_hi', 'optionC_hi', 'optionD_hi', 'optionA_en', 'optionB_en', 'optionC_en', 'optionD_en', 'answer', 'explanation_hi', 'explanation_en', 'difficulty', 'source_type', 'citation', 'status'] as const;
export const csvTemplate = () => CSV_COLUMNS.join(',') + '\n' + ['class-12', 'physics', 'Electric Charges and Fields', 'वैद्युत आवेश का SI मात्रक है:', 'The SI unit of electric charge is:', 'ऐम्पियर', 'कूलॉम', 'वोल्ट', 'न्यूटन', 'Ampere', 'Coulomb', 'Volt', 'Newton', 'B', 'आवेश का SI मात्रक कूलॉम है।', 'Charge is measured in coulomb.', 'easy', 'sample', '', 'draft'].map((v) => `"${v.replace(/"/g, '""')}"`).join(',') + '\n';

/** Minimal RFC-4180 parser (quotes, escaped quotes, CRLF). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = []; let row: string[] = []; let cell = ''; let inQ = false;
  const src = text.replace(/^ /, '');
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (inQ) { if (c === '"') { if (src[i + 1] === '"') { cell += '"'; i++; } else inQ = false; } else cell += c; continue; }
    if (c === '"') inQ = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && src[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; }
    else cell += c;
  }
  if (cell.length || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((x) => x.trim() !== ''));
}
export interface ImportRow { row: number; errors: string[]; question?: ReturnType<typeof validateQuestion>['q'] }
/** Validates every row; nothing is saved unless `commit` is true and every row is valid. */
export function importCsv(admin: Admin, text: string, commit: boolean): { rows: ImportRow[]; saved: number } {
  const parsed = parseCsv(text);
  if (!parsed.length) return { rows: [{ row: 0, errors: ['file is empty'] }], saved: 0 };
  const header = parsed[0].map((h) => h.trim());
  const missing = CSV_COLUMNS.filter((c) => !header.includes(c));
  if (missing.length) return { rows: [{ row: 0, errors: [`missing columns: ${missing.join(', ')}`] }], saved: 0 };
  const col = (r: string[], name: string) => (r[header.indexOf(name)] ?? '').trim();
  const rows: ImportRow[] = parsed.slice(1).map((r, i) => {
    const letter = col(r, 'answer').toUpperCase();
    const answer = ['A', 'B', 'C', 'D'].indexOf(letter) >= 0 ? ['A', 'B', 'C', 'D'].indexOf(letter) : Number(letter) - 1;
    const { q, errors } = validateQuestion({
      class: col(r, 'class'), subjectId: col(r, 'subjectId'), chapter: col(r, 'chapter'),
      question: { hi: col(r, 'question_hi'), en: col(r, 'question_en') },
      options: { hi: ['A', 'B', 'C', 'D'].map((L) => col(r, `option${L}_hi`)), en: ['A', 'B', 'C', 'D'].map((L) => col(r, `option${L}_en`)) },
      answer, explanation: { hi: col(r, 'explanation_hi'), en: col(r, 'explanation_en') }, difficulty: col(r, 'difficulty') || 'medium',
      source: { type: col(r, 'source_type') || 'sample', citation: col(r, 'citation') }, status: col(r, 'status') || 'draft',
    } as Partial<BankQuestion> & Record<string, unknown>);
    if (!['A', 'B', 'C', 'D'].includes(letter) && !(answer >= 0 && answer <= 3)) errors.push('answer must be A, B, C or D');
    return { row: i + 2, errors, question: q };
  });
  const allOk = rows.every((r) => !r.errors.length);
  let saved = 0;
  if (commit && allOk) {
    const db = data();
    for (const r of rows) { db.questions.push({ ...r.question!, id: id('q'), createdAt: now(), updatedAt: now(), createdBy: admin.phone }); saved++; }
    save();
  }
  return { rows, saved };
}

// ---------- Student access, scoring, results ----------
export function canAccessSeries(user: User | null, s: TestSeries) {
  if (s.access === 'free') return true;
  if (!user || !planActive(user)) return false;
  return s.plans.includes(user.plan!.id) || user.plan!.id === 'all';
}
/** Questions as students see them: answers and explanations stripped. */
export const studentQuestion = (q: BankQuestion, medium: 'hindi' | 'english') => ({ id: q.id, question: medium === 'hindi' ? q.question.hi : q.question.en, options: medium === 'hindi' ? q.options.hi : q.options.en, source: q.source, status: q.status });

export function scoreAttempt(test: AdminTest, questions: BankQuestion[], answers: Record<string, number>) {
  let counted = 0, correct = 0, wrong = 0, overLimit = 0;
  const perQuestion: Attempt['perQuestion'] = [];
  for (const q of questions) {
    const chosen = answers[q.id];
    if (chosen === undefined || chosen === null) { perQuestion.push({ id: q.id, chosen: null, correct: q.answer, result: 'skipped' }); continue; }
    if (counted >= test.attemptLimit) { overLimit++; perQuestion.push({ id: q.id, chosen, correct: q.answer, result: 'not_counted' }); continue; }
    counted++;
    if (chosen === q.answer) { correct++; perQuestion.push({ id: q.id, chosen, correct: q.answer, result: 'right' }); }
    else { wrong++; perQuestion.push({ id: q.id, chosen, correct: q.answer, result: 'wrong' }); }
  }
  const total = Math.min(test.attemptLimit, questions.length);
  const score = Math.max(0, correct * test.marksPerQuestion - wrong * test.negativeMarks);
  return { score, maxMarks: total * test.marksPerQuestion, correct, wrong, skipped: Math.max(0, total - counted), overLimit, perQuestion };
}

export function submitAttempt(user: User, test: AdminTest, answers: Record<string, number>, startedAt: string) {
  const status = liveStatus(test);
  if (status !== 'live') throw new ValidationError([`test is ${status}`]);
  const db = data();
  if (db.attempts.some((a) => a.testId === test.id && a.userId === user.id)) throw new ValidationError(['already attempted']);
  const qs = test.questionIds.map((qid) => db.questions.find((q) => q.id === qid)!).filter(Boolean);
  const r = scoreAttempt(test, qs, answers);
  const a: Attempt = { id: id('att'), testId: test.id, userId: user.id, answers, ...r, startedAt, submittedAt: now() };
  db.attempts.push(a);
  save();
  return a;
}

export const resultsVisibleNow = (t: AdminTest) => t.resultsVisible === 'instant' || liveStatus(t) === 'closed';

export function testResults(test: AdminTest) {
  const db = data();
  const attempts = db.attempts.filter((a) => a.testId === test.id);
  const users = new Map(db.users.map((u) => [u.id, u]));
  const scores = attempts.map((a) => a.score);
  const avg = scores.length ? scores.reduce((x, y) => x + y, 0) / scores.length : 0;
  const buckets = Array.from({ length: 10 }, (_, i) => ({ from: i * 10, to: i * 10 + 10, count: 0 }));
  for (const a of attempts) { const pct = a.maxMarks ? (a.score / a.maxMarks) * 100 : 0; buckets[Math.min(9, Math.floor(pct / 10))].count++; }
  const top = [...attempts].sort((x, y) => y.score - x.score || x.submittedAt.localeCompare(y.submittedAt)).slice(0, 10).map((a) => { const u = users.get(a.userId); return { attemptId: a.id, score: a.score, maxMarks: a.maxMarks, phoneMasked: u ? (u.phone ? u.phone.slice(2, 4) + '•••••' + u.phone.slice(-3) : (u.email ?? '').slice(0, 2) + '•••') : '?', name: u?.name ?? null, submittedAt: a.submittedAt }; });
  const perQuestion = test.questionIds.map((qid) => {
    const rs = attempts.map((a) => a.perQuestion.find((p) => p.id === qid)).filter(Boolean) as Attempt['perQuestion'];
    const answered = rs.filter((p) => p.result === 'right' || p.result === 'wrong').length;
    const right = rs.filter((p) => p.result === 'right').length;
    const q = db.questions.find((x) => x.id === qid);
    return { id: qid, question: q ? q.question.en || q.question.hi : qid, answered, right, accuracy: answered ? Math.round((right / answered) * 100) : null };
  });
  return { attempts: attempts.length, average: Math.round(avg * 100) / 100, maxMarks: attempts[0]?.maxMarks ?? test.totalQuestions * test.marksPerQuestion, distribution: buckets, top, perQuestion, list: attempts.map((a) => ({ id: a.id, userId: a.userId, phoneMasked: users.get(a.userId) ? (users.get(a.userId)!.phone ? users.get(a.userId)!.phone!.slice(2, 4) + '•••••' + users.get(a.userId)!.phone!.slice(-3) : (users.get(a.userId)!.email ?? '').slice(0, 2) + '•••') : '?', score: a.score, maxMarks: a.maxMarks, correct: a.correct, wrong: a.wrong, skipped: a.skipped, submittedAt: a.submittedAt })) };
}

export function leaderboard(test: AdminTest) {
  if (!test.leaderboard) return [];
  const db = data();
  const users = new Map(db.users.map((u) => [u.id, u]));
  return db.attempts.filter((a) => a.testId === test.id).map((a) => ({ a, u: users.get(a.userId) })).filter((x) => x.u?.leaderboardOptIn)
    .sort((x, y) => y.a.score - x.a.score || x.a.submittedAt.localeCompare(y.a.submittedAt)).slice(0, 50)
    .map(({ a, u }, i) => ({ rank: i + 1, firstName: (u!.name ?? 'Student').split(' ')[0], district: u!.district ?? '', score: a.score, maxMarks: a.maxMarks }));
}

export const toCsv = (rows: Array<Record<string, unknown>>) => {
  if (!rows.length) return '';
  const cols = Object.keys(rows[0]);
  const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  return cols.join(',') + '\n' + rows.map((r) => cols.map((c) => esc(r[c])).join(',')).join('\n') + '\n';
};
