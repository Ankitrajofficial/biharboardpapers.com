import type { Chapter, ChapterIndexEntry, ClassId, ExamCalendar, Medium, MockTest, PaperEntry, Syllabus } from './types';
import contentIndex from '@/generated/content-index.json';

/**
 * Content loader. Content files are served as static JSON under /content/... (copied by the
 * Vite plugin in vite.config.ts). During pre-rendering the prerender script injects
 * `globalThis.__bbpReadContent` so the same code reads from disk.
 */
declare global {
  var __bbpReadContent: ((path: string) => Promise<unknown>) | undefined;
  /** Set by the pre-renderer to record which content paths a page used. */
  var __bbpUsed: Set<string> | undefined;
}

type Tracked<T> = Promise<T> & { status?: 'pending' | 'fulfilled' | 'rejected'; value?: T; reason?: unknown };
const cache = new Map<string, Promise<unknown>>();

/**
 * Pre-rendered pages inline the JSON they used (<script id="bbp-data">). Seeding the cache
 * from it means `use()` never suspends during hydration, so the server HTML is kept as-is.
 */
export function seedFromInlineData() {
  if (typeof document === 'undefined') return;
  const el = document.getElementById('bbp-data');
  if (!el?.textContent) return;
  try {
    const data = JSON.parse(el.textContent) as Record<string, unknown>;
    for (const [path, value] of Object.entries(data)) {
      const t: Tracked<unknown> = Promise.resolve(value);
      t.status = 'fulfilled';
      t.value = value;
      cache.set(path, t);
    }
  } catch {
    /* ignore bad inline data */
  }
}

export const OFFLINE_CACHE = 'bbp-offline';

async function fetchJson<T>(path: string): Promise<T> {
  if (typeof globalThis.__bbpReadContent === 'function') return (await globalThis.__bbpReadContent(path)) as T;
  // Offline-saved chapters first, then the network (service worker also caches /content/*).
  if (typeof caches !== 'undefined') {
    try {
      const hit = await caches.match(path, { cacheName: OFFLINE_CACHE });
      if (hit) return (await hit.json()) as T;
    } catch {
      /* Cache API unavailable */
    }
  }
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to load ${path}: ${res.status}`);
  return (await res.json()) as T;
}

/**
 * Caches a promise under `key` and, once settled, tags it with React's thenable
 * `status`/`value` fields so `use()` reads it synchronously. This is what lets the
 * pre-renderer emit plain HTML (no streamed Suspense segments) after a warm-up pass.
 */
function tracked<T>(key: string, factory: () => Promise<T>): Promise<T> {
  let p = cache.get(key) as Tracked<T> | undefined;
  if (!p) {
    const t: Tracked<T> = factory().then(
      (v) => { t.status = 'fulfilled'; t.value = v; return v; },
      (e) => { t.status = 'rejected'; t.reason = e; cache.delete(key); throw e; },
    );
    t.status = 'pending';
    cache.set(key, t);
    p = t;
  }
  return p;
}

/** Suspense-friendly JSON resource: the same promise for the same path. */
export const resource = <T,>(path: string): Promise<T> => {
  globalThis.__bbpUsed?.add(path);
  return tracked(path, () => fetchJson<T>(path));
};

/** Values of settled JSON resources (used by the pre-renderer to inline page data). */
export const resourceValue = (path: string): unknown => (cache.get(path) as Tracked<unknown> | undefined)?.value;

seedFromInlineData();

/** Resolves when every resource requested so far has settled (used by the pre-renderer). */
export const settleResources = () => Promise.allSettled([...cache.values()]);

export const index = contentIndex as ChapterIndexEntry[];

export const chaptersFor = (classId: ClassId, medium: Medium, subjectId: string): ChapterIndexEntry[] =>
  index.filter((c) => c.class === classId && c.medium === medium && c.subjectId === subjectId).sort((a, b) => a.chapterNumber - b.chapterNumber);

export const chapterEntryBySlug = (classId: ClassId, medium: Medium, subjectId: string, slug: string) =>
  chaptersFor(classId, medium, subjectId).find((c) => c.slug === slug);

export const chapterEntryById = (id: string, medium: Medium) => index.find((c) => c.id === id && c.medium === medium);

export const chapterPath = (e: ChapterIndexEntry) => `/content/${e.file}`;

export const loadChapter = (e: ChapterIndexEntry) => resource<Chapter>(chapterPath(e));
export const loadChapterByPath = (path: string) => resource<Chapter>(path);
export const loadExamCalendar = () => resource<ExamCalendar>('/content/exam-calendar.json');
export const loadPapers = () => resource<PaperEntry[]>('/content/papers.json');
export const loadSyllabus = () => resource<Syllabus>('/content/syllabus.json');
export const loadMockTest = (id: string) => resource<MockTest>(`/content/mock-tests/${id}.json`);
export const loadMockIndex = () => resource<Array<Pick<MockTest, 'id' | 'class' | 'medium' | 'subjectId' | 'title' | 'given' | 'attempt' | 'durationMin' | 'status'> & { questionCount: number }>>('/content/mock-tests/index.json');

/** Load every chapter of a subject (for subject-level objective practice and mock tests). */
export const loadSubjectChapters = (classId: ClassId, medium: Medium, subjectId: string): Promise<Chapter[]> => {
  const key = `subject:${classId}/${medium}/${subjectId}`;
  const existing = cache.get(key) as Promise<Chapter[]> | undefined;
  if (existing) return existing;
  const parts = chaptersFor(classId, medium, subjectId).map(loadChapter) as Array<Tracked<Chapter>>;
  if (parts.every((p) => p.status === 'fulfilled')) {
    // Everything is already loaded (inline data or cache): resolve synchronously for `use()`.
    const values = parts.map((p) => p.value as Chapter);
    const t: Tracked<Chapter[]> = Promise.resolve(values);
    t.status = 'fulfilled';
    t.value = values;
    cache.set(key, t);
    return t;
  }
  return tracked(key, () => Promise.all(parts));
};

/** Save a chapter JSON into the offline cache so it opens without internet. */
export async function saveChapterOffline(e: ChapterIndexEntry): Promise<boolean> {
  if (typeof caches === 'undefined') return false;
  try {
    const c = await caches.open(OFFLINE_CACHE);
    await c.add(chapterPath(e));
    return true;
  } catch {
    return false;
  }
}

export async function removeChapterOffline(e: ChapterIndexEntry) {
  if (typeof caches === 'undefined') return;
  try {
    const c = await caches.open(OFFLINE_CACHE);
    await c.delete(chapterPath(e));
  } catch {
    /* ignore */
  }
}
