/**
 * Builds src/generated/content-index.json and content/mock-tests/index.json from /content.
 * Run via `npm run content:index` (also part of content:check and dev/build).
 */
import { readdirSync, readFileSync, writeFileSync, mkdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const CONTENT = join(ROOT, 'content');
const OUT = join(ROOT, 'src', 'generated');

export function walk(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

export function buildIndex() {
  const files = walk(CONTENT).filter((f) => f.endsWith('.json') && /content\/class-1[02]\//.test(f.split(sep).join('/')));
  const entries = files.map((f) => {
    const c = JSON.parse(readFileSync(f, 'utf8'));
    return {
      id: c.id,
      class: c.class,
      medium: c.medium,
      subjectId: c.subjectId,
      chapterNumber: c.chapterNumber,
      syllabus: c.syllabus ?? null,
      slug: c.slug,
      title: c.title,
      summary: c.summary ?? '',
      aliases: c.aliases ?? [],
      status: c.status,
      objectiveCount: (c.objective ?? []).length,
      importantCount: (c.important ?? []).length,
      file: relative(CONTENT, f).split(sep).join('/'),
    };
  });
  entries.sort((a, b) => a.file.localeCompare(b.file));
  mkdirSync(OUT, { recursive: true });
  writeFileSync(join(OUT, 'content-index.json'), JSON.stringify(entries, null, 2));

  const mockDir = join(CONTENT, 'mock-tests');
  const mocks = walk(mockDir)
    .filter((f) => f.endsWith('.json') && !f.endsWith('index.json'))
    .map((f) => {
      const m = JSON.parse(readFileSync(f, 'utf8'));
      return { id: m.id, class: m.class, medium: m.medium, subjectId: m.subjectId, title: m.title, given: m.given, attempt: m.attempt, durationMin: m.durationMin, status: m.status, questionCount: (m.questionIds ?? []).length };
    });
  mkdirSync(mockDir, { recursive: true });
  writeFileSync(join(mockDir, 'index.json'), JSON.stringify(mocks, null, 2));
  return { entries, mocks };
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split(sep).join('/').replace(/^.*\/scripts\//, 'scripts/'))) {
  const { entries, mocks } = buildIndex();
  console.log(`content:index → ${entries.length} chapters, ${mocks.length} mock tests`);
}
