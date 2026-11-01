/**
 * Normalises content/sources/bseb_syllabus.raw.json (research export) into content/syllabus.json,
 * the file the UI reads. Re-run after updating the raw file: `npm run content:syllabus`.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const raw = JSON.parse(readFileSync(join(ROOT, 'content/sources/bseb_syllabus.raw.json'), 'utf8')) as {
  meta: Record<string, unknown>;
  subjects: Array<{ class: number; stream: string | null; code: string; name_hi: string | null; name_en: string | null; marks: Record<string, unknown> | null; textbook: string | string[] | null; chapters: Record<string, Array<{ no: number; name_hi: string | null; name_en: string | null }>> | null; source: string[]; status: string; note?: string }>;
};

/** (class, primary code) → subject id used in src/data/subjects.ts and content paths */
const IDS: Record<string, string> = {
  '10:101': 'hindi', '10:113': 'english', '10:105': 'sanskrit', '10:110': 'mathematics', '10:112': 'science', '10:111': 'social-science',
  '10:103': 'urdu', '10:104': 'maithili', '10:102': 'bangla', '10:106': 'sil-hindi', '10:107': 'arabic', '10:108': 'persian', '10:109': 'bhojpuri',
  '10:114': 'advanced-maths', '10:115': 'commerce', '10:116': 'economics', '10:117': 'fine-arts', '10:118': 'home-science', '10:119': 'dance', '10:120': 'music',
  '12:117': 'physics', '12:118': 'chemistry', '12:119': 'biology', '12:121': 'mathematics', '12:220': 'accountancy', '12:217': 'business-studies', '12:219': 'economics',
  '12:321': 'history', '12:323': 'geography', '12:322': 'political-science', '12:325': 'sociology', '12:324': 'psychology', '12:320': 'philosophy', '12:319': 'home-science',
  '12:318': 'music', '12:317': 'yoga-physical-education', '12:218': 'entrepreneurship', '12:122': 'computer-science', '12:123': 'multimedia-web-technology', '12:120': 'agriculture',
  '12:106': 'hindi', '12:105': 'english', '12:107': 'urdu', '12:108': 'maithili', '12:109': 'sanskrit', '12:110': 'prakrit', '12:111': 'magahi', '12:112': 'bhojpuri',
  '12:113': 'arabic', '12:114': 'persian', '12:115': 'pali', '12:116': 'bangla',
};

const streamsOf = (s: string | null): string[] => {
  if (!s || s === 'None' || s.startsWith('All')) return ['arts', 'science', 'commerce'];
  return s.split(',').map((x) => x.trim().toLowerCase());
};
const statusOf = (s: string): 'verified_official' | 'verified_textbook' | 'gap' =>
  s.startsWith('verified_official_2') ? 'verified_official' : s.startsWith('verified_official_textbook') ? 'verified_textbook' : 'gap';

const subjects = raw.subjects.map((s) => {
  const codes = s.code.replace(/\s*\(.*\)$/, '').split('/').map((c) => c.trim());
  const key = `${s.class}:${codes[0]}`;
  const id = IDS[key];
  if (!id) throw new Error(`No subject id mapping for ${key} (${s.name_en})`);
  const marks = s.marks ?? {};
  const sections = Object.entries(s.chapters ?? {}).map(([title, list]) => ({
    title,
    chapters: (list ?? []).map((c) => ({ no: c.no, title: { hi: c.name_hi ?? c.name_en ?? '', en: c.name_en ?? c.name_hi ?? '' }, hiMissing: !c.name_hi, enMissing: !c.name_en })),
  }));
  return {
    id,
    class: `class-${s.class}` as 'class-10' | 'class-12',
    codes,
    streams: streamsOf(s.stream),
    name: { hi: s.name_hi ?? s.name_en ?? '', en: s.name_en ?? s.name_hi ?? '' },
    marks: {
      total: (marks.total as number) ?? null,
      theory: (marks.theory as number) ?? null,
      practical: (marks.practical as number) ?? null,
      split: (marks.split as string) ?? null,
      objective: (marks.objective as string) ?? null,
      note: (marks.note as string) ?? null,
    },
    textbooks: Array.isArray(s.textbook) ? s.textbook : s.textbook ? [s.textbook] : [],
    sections,
    chapterCount: sections.reduce((n, x) => n + x.chapters.length, 0),
    status: statusOf(s.status),
    statusNote: s.status,
    note: s.note ?? null,
    sources: s.source ?? [],
  };
});

const out = {
  meta: { ...raw.meta, importedFrom: 'content/sources/bseb_syllabus.raw.json', importedOn: new Date().toISOString().slice(0, 10) },
  subjects,
};
writeFileSync(join(ROOT, 'content/syllabus.json'), JSON.stringify(out, null, 2));
console.log(`content:syllabus → ${subjects.length} subjects, ${subjects.reduce((n, s) => n + s.chapterCount, 0)} chapters`);
