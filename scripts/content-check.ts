/**
 * `npm run content:check` — validates every content file:
 * schema, duplicate ids, missing translations (chapter in one medium only), broken links.
 * Exits 1 on any error. Also regenerates the content index.
 */
import { readFileSync, existsSync } from 'node:fs';
import { join, sep } from 'node:path';
import { buildIndex, walk } from './content-index.ts';
import { hi } from '../src/i18n/hi.ts';
import { en } from '../src/i18n/en.ts';

const ROOT = new URL('..', import.meta.url).pathname;
const CONTENT = join(ROOT, 'content');
const errors: string[] = [];
const warn: string[] = [];
const err = (f: string, m: string) => errors.push(`${f}: ${m}`);

const isIso = (s: unknown) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s));
const STATUSES = ['sample', 'draft', 'reviewed', 'verified_official'];
const isUrl = (s: unknown) => typeof s === 'string' && (s === '' || /^https:\/\//.test(s) || s.startsWith('/'));

function checkMeta(f: string, o: Record<string, unknown>, where: string) {
  if (!STATUSES.includes(o.status as string)) err(f, `${where}: invalid status "${o.status}"`);
  if (typeof o.source !== 'string' || !o.source) err(f, `${where}: source required`);
  if (!isUrl(o.sourceUrl)) err(f, `${where}: sourceUrl must be https:// or empty`);
  if (o.status === 'verified_official' && !(o.sourceUrl as string)?.startsWith('https://')) err(f, `${where}: verified_official requires a cited sourceUrl`);
  if (!isIso(o.lastReviewed)) err(f, `${where}: lastReviewed must be YYYY-MM-DD`);
  if (typeof o.reviewer !== 'string' || !o.reviewer) err(f, `${where}: reviewer required`);
}

const chapterIds = new Map<string, string[]>(); // id -> files
const questionIds = new Map<string, string>();
const slugs = new Set<string>();
const byIdMedium = new Map<string, Record<string, unknown>>();

const files = walk(CONTENT).filter((f) => f.endsWith('.json'));
let chapterFiles = 0;
for (const abs of files) {
  const f = abs.replace(ROOT, '');
  let data: unknown;
  try {
    data = JSON.parse(readFileSync(abs, 'utf8'));
  } catch (e) {
    err(f, `invalid JSON: ${(e as Error).message}`);
    continue;
  }
  const rel = f.split(sep).join('/');
  if (/content\/class-1[02]\//.test(rel)) {
    chapterFiles++;
    const c = data as Record<string, unknown>;
    const [, cls, medium, subject] = rel.match(/content\/(class-1[02])\/(hindi|english)\/([^/]+)\//) ?? [];
    if (c.class !== cls) err(f, `class "${c.class}" does not match folder "${cls}"`);
    if (c.medium !== medium) err(f, `medium "${c.medium}" does not match folder "${medium}"`);
    if (c.subjectId !== subject) err(f, `subjectId "${c.subjectId}" does not match folder "${subject}"`);
    for (const k of ['id', 'slug', 'title', 'summary']) if (typeof c[k] !== 'string' || !c[k]) err(f, `${k} required`);
    if (typeof c.chapterNumber !== 'number') err(f, 'chapterNumber must be a number');
    if (!Array.isArray(c.aliases) || c.aliases.length === 0) err(f, 'aliases must be a non-empty array');
    if (!c.textbook || typeof (c.textbook as { url?: string }).url !== 'string') err(f, 'textbook {name,url} required');
    if (!(c.youtube === null || (typeof c.youtube === 'object' && c.youtube && typeof (c.youtube as { id: string }).id === 'string'))) err(f, 'youtube must be null or {id,title}');
    checkMeta(f, c, 'chapter');
    if (medium === 'hindi') {
      const text = JSON.stringify(c.notes) + JSON.stringify(c.objective) + c.title;
      if (!/[ऀ-ॿ]/.test(text)) err(f, 'Hindi file has no Devanagari text');
    }
    if (!Array.isArray(c.notes) || c.notes.length === 0) err(f, 'notes must be a non-empty array');
    else
      (c.notes as Array<Record<string, unknown>>).forEach((b, i) => {
        const t = b.type;
        if (!['heading', 'paragraph', 'list', 'formula', 'remember', 'image'].includes(t as string)) err(f, `notes[${i}]: unknown block type "${t}"`);
        if (t === 'list' && !Array.isArray(b.items)) err(f, `notes[${i}]: list needs items[]`);
        if (['heading', 'paragraph', 'formula', 'remember'].includes(t as string) && typeof b.text !== 'string') err(f, `notes[${i}]: text required`);
        if (t === 'image') {
          if (typeof b.alt !== 'string' || !b.alt) err(f, `notes[${i}]: image alt text required`);
          const src = b.src as string;
          if (src?.startsWith('/content/') && !existsSync(join(ROOT, src))) err(f, `notes[${i}]: image not found ${src}`);
        }
      });
    if (!Array.isArray(c.objective)) err(f, 'objective must be an array');
    else
      (c.objective as Array<Record<string, unknown>>).forEach((q, i) => {
        const w = `objective[${i}]`;
        if (typeof q.id !== 'string') err(f, `${w}: id required`);
        else if (questionIds.has(q.id + '|' + medium)) err(f, `${w}: duplicate question id ${q.id} (also in ${questionIds.get(q.id + '|' + medium)})`);
        else questionIds.set(q.id + '|' + medium, f);
        if (typeof q.question !== 'string' || !q.question) err(f, `${w}: question text required`);
        if (!Array.isArray(q.options) || q.options.length !== 4 || q.options.some((o) => typeof o !== 'string' || !o)) err(f, `${w}: exactly 4 non-empty options required`);
        if (![0, 1, 2, 3].includes(q.answer as number)) err(f, `${w}: answer must be 0–3`);
        if (typeof q.explanation !== 'string') err(f, `${w}: explanation required`);
        checkMeta(f, q, w);
      });
    if (!Array.isArray(c.important)) err(f, 'important must be an array');
    else
      (c.important as Array<Record<string, unknown>>).forEach((q, i) => {
        const w = `important[${i}]`;
        if (typeof q.id !== 'string') err(f, `${w}: id required`);
        if (!['short', 'long'].includes(q.type as string)) err(f, `${w}: type must be short|long`);
        if (typeof q.marks !== 'number') err(f, `${w}: marks required`);
        if (typeof q.question !== 'string' || !q.question) err(f, `${w}: question required`);
        if (!Array.isArray(q.answerOutline) || q.answerOutline.length === 0) err(f, `${w}: answerOutline required`);
        checkMeta(f, q, w);
      });
    const id = c.id as string;
    chapterIds.set(id, [...(chapterIds.get(id) ?? []), f]);
    const slugKey = `${cls}/${medium}/${subject}/${c.slug}`;
    if (slugs.has(slugKey)) err(f, `duplicate slug ${c.slug}`);
    slugs.add(slugKey);
    byIdMedium.set(`${id}|${medium}`, c);
  } else if (rel.endsWith('exam-calendar.json')) {
    const cal = data as { exams?: Array<Record<string, unknown>> };
    if (!Array.isArray(cal.exams)) err(f, 'exams[] required');
    else
      cal.exams.forEach((e, i) => {
        if (!['official', 'expected'].includes(e.status as string)) err(f, `exams[${i}]: status must be official|expected`);
        if (!isIso(e.start) || !isIso(e.end)) err(f, `exams[${i}]: start/end must be YYYY-MM-DD`);
        if ((e.start as string) > (e.end as string)) err(f, `exams[${i}]: start after end`);
        if (!['class-10', 'class-12'].includes(e.class as string)) err(f, `exams[${i}]: invalid class`);
        if (e.status === 'official' && !/^https:\/\//.test(e.sourceUrl as string)) err(f, `exams[${i}]: official date needs sourceUrl`);
      });
  } else if (rel.endsWith('papers.json')) {
    const ids = new Set<string>();
    (data as Array<Record<string, unknown>>).forEach((p, i) => {
      if (ids.has(p.id as string)) err(f, `papers[${i}]: duplicate id ${p.id}`);
      ids.add(p.id as string);
      if (!['bseb_official_model_paper', 'previous_year', 'sample'].includes(p.sourceType as string)) err(f, `papers[${i}]: invalid sourceType`);
      if (p.sourceType === 'bseb_official_model_paper' && !/^https:\/\/(www\.)?biharboardonline\./.test(p.url as string)) err(f, `papers[${i}]: official model paper must link to a biharboardonline.* page`);
      if (!isUrl(p.url)) err(f, `papers[${i}]: invalid url`);
      if (!(p.title as { hi?: string })?.hi || !(p.title as { en?: string })?.en) err(f, `papers[${i}]: title needs hi and en`);
    });
  } else if (/mock-tests\/(?!index)/.test(rel)) {
    const m = data as Record<string, unknown>;
    for (const k of ['id', 'class', 'medium', 'subjectId', 'title']) if (typeof m[k] !== 'string') err(f, `${k} required`);
    if (typeof m.given !== 'number' || typeof m.attempt !== 'number' || m.attempt > m.given) err(f, 'given/attempt invalid');
    if (!Array.isArray(m.questionIds) || m.questionIds.length === 0) err(f, 'questionIds required');
    checkMeta(f, m, 'mock');
  }
}

// Syllabus: schema + every content chapter's syllabus reference must exist.
const syllabusPath = join(CONTENT, 'syllabus.json');
if (!existsSync(syllabusPath)) err('content/syllabus.json', 'missing — run `npm run content:syllabus`');
else {
  const syl = JSON.parse(readFileSync(syllabusPath, 'utf8')) as { subjects: Array<{ id: string; class: string; codes: string[]; sections: Array<{ title: string; chapters: Array<{ no: number }> }>; status: string }> };
  const seen = new Set<string>();
  for (const s of syl.subjects) {
    const k = `${s.class}/${s.id}`;
    if (seen.has(k)) err('content/syllabus.json', `duplicate subject ${k}`);
    seen.add(k);
    if (!['verified_official', 'verified_textbook', 'gap'].includes(s.status)) err('content/syllabus.json', `${k}: bad status ${s.status}`);
    if (!Array.isArray(s.codes) || !s.codes.length) err('content/syllabus.json', `${k}: codes required`);
  }
  for (const [key, c] of byIdMedium) {
    const ref = c.syllabus as { section: string; no: number } | undefined;
    if (!ref) { warn.push(`${key}: no syllabus reference (chapter will be listed after the official chapters)`); continue; }
    const s = syl.subjects.find((x) => x.class === c.class && x.id === c.subjectId);
    const sec = s?.sections.find((x) => x.title === ref.section);
    if (!s) err(`content ${key}`, `subject ${c.class}/${c.subjectId} not in syllabus.json`);
    else if (!sec) err(`content ${key}`, `syllabus section "${ref.section}" not found (have: ${s.sections.map((x) => x.title).join(', ')})`);
    else if (!sec.chapters.some((x) => x.no === ref.no)) err(`content ${key}`, `syllabus chapter ${ref.no} not in section "${ref.section}"`);
  }
}

// Missing translations: every chapter id must exist in both mediums with identical question ids.
for (const [id, fs] of chapterIds) {
  const h = byIdMedium.get(`${id}|hindi`);
  const e = byIdMedium.get(`${id}|english`);
  if (!h || !e) {
    err(fs[0], `missing translation: chapter ${id} exists only in ${h ? 'hindi' : 'english'}`);
    continue;
  }
  const qh = (h.objective as Array<{ id: string; answer: number }>).map((q) => q.id + ':' + q.answer).join(',');
  const qe = (e.objective as Array<{ id: string; answer: number }>).map((q) => q.id + ':' + q.answer).join(',');
  if (qh !== qe) err(fs[0], `objective ids/answers differ between hindi and english for ${id}`);
  const ih = (h.important as Array<{ id: string }>).map((q) => q.id).join(',');
  const ie = (e.important as Array<{ id: string }>).map((q) => q.id).join(',');
  if (ih !== ie) err(fs[0], `important ids differ between hindi and english for ${id}`);
  if (fs.length > 2) err(fs[0], `chapter id ${id} appears in ${fs.length} files`);
}

// Mock tests must reference existing question ids in the same medium.
for (const abs of files.filter((f) => /mock-tests\/(?!index)/.test(f))) {
  const m = JSON.parse(readFileSync(abs, 'utf8')) as { medium: string; questionIds: string[] };
  for (const q of m.questionIds) if (!questionIds.has(q + '|' + m.medium)) err(abs.replace(ROOT, ''), `unknown question id ${q}`);
}

// Translation keys: en must cover hi exactly.
const hk = Object.keys(hi);
const ek = Object.keys(en);
for (const k of hk) if (!(k in en)) err('src/i18n/en.ts', `missing key ${k}`);
for (const k of ek) if (!(k in hi)) err('src/i18n/hi.ts', `extra key in en: ${k}`);

const { entries, mocks } = buildIndex();
for (const w of warn) console.warn('warn:', w);
if (errors.length) {
  console.error(`content:check FAILED with ${errors.length} error(s):`);
  for (const e of errors) console.error(' -', e);
  process.exit(1);
}
console.log(`content:check OK — ${chapterFiles} chapter files, ${entries.length} indexed, ${mocks.length} mock tests, ${hk.length} translation keys`);
