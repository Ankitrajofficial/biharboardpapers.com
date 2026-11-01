import { createStore, useStore } from './store';

export interface MockHistoryEntry {
  id: string;
  mockId: string;
  subjectId: string;
  classId: string;
  title: string;
  score: number;
  total: number;
  correct: number;
  wrong: number;
  skipped: number;
  at: string;
}

export interface Progress {
  /** chapterId -> ISO date */
  completed: Record<string, string>;
  /** chapterId -> content path saved in the Cache API */
  offline: Record<string, string>;
  /** questionId -> chapterId */
  bookmarks: Record<string, string>;
  /** questionId -> last result */
  answers: Record<string, 'right' | 'wrong'>;
  mockHistory: MockHistoryEntry[];
  streak: { days: number; last: string | null };
  /** Account id this progress was last merged into (null = anonymous) */
  ownerId: string | null;
  /** In-progress mock test (saved on every tap) */
  activeMock: { mockId: string; answers: Record<string, number>; startedAt: string; elapsedSec: number; timer: boolean } | null;
}

export const defaultProgress: Progress = {
  completed: {},
  offline: {},
  bookmarks: {},
  answers: {},
  mockHistory: [],
  streak: { days: 0, last: null },
  ownerId: null,
  activeMock: null,
};

export const progressStore = createStore<Progress>('bbp.progress.v1', defaultProgress);
export const useProgress = () => useStore(progressStore);

const today = () => new Date().toISOString().slice(0, 10);

/** Call on any study action: keeps the "N days in a row" streak. */
export function touchStreak() {
  progressStore.set((p) => {
    const t = today();
    if (p.streak.last === t) return p;
    const y = new Date();
    y.setDate(y.getDate() - 1);
    const yesterday = y.toISOString().slice(0, 10);
    const days = p.streak.last === yesterday ? p.streak.days + 1 : 1;
    return { ...p, streak: { days, last: t } };
  });
}

export const markCompleted = (chapterId: string, done = true) =>
  progressStore.set((p) => {
    const completed = { ...p.completed };
    if (done) completed[chapterId] = today();
    else delete completed[chapterId];
    return { ...p, completed };
  });

export const toggleBookmark = (questionId: string, chapterId: string) =>
  progressStore.set((p) => {
    const bookmarks = { ...p.bookmarks };
    if (bookmarks[questionId]) delete bookmarks[questionId];
    else bookmarks[questionId] = chapterId;
    return { ...p, bookmarks };
  });

export const recordAnswer = (questionId: string, right: boolean) =>
  progressStore.set((p) => ({ ...p, answers: { ...p.answers, [questionId]: right ? 'right' : 'wrong' } }));

export const setOffline = (chapterId: string, path: string | null) =>
  progressStore.set((p) => {
    const offline = { ...p.offline };
    if (path) offline[chapterId] = path;
    else delete offline[chapterId];
    return { ...p, offline };
  });

export const addMockHistory = (e: MockHistoryEntry) =>
  progressStore.set((p) => ({ ...p, mockHistory: [e, ...p.mockHistory].slice(0, 50), activeMock: null }));

export const setActiveMock = (m: Progress['activeMock']) => progressStore.set((p) => ({ ...p, activeMock: m }));

export const resetProgress = () => progressStore.reset();

/** Merge progress from another source (e.g. account sync): union of everything, newest streak wins. */
export function mergeProgress(a: Progress, b: Progress): Progress {
  const seen = new Set<string>();
  const mockHistory = [...a.mockHistory, ...b.mockHistory]
    .filter((e) => (seen.has(e.id) ? false : (seen.add(e.id), true)))
    .sort((x, y) => y.at.localeCompare(x.at))
    .slice(0, 50);
  return {
    completed: { ...b.completed, ...a.completed },
    offline: a.offline,
    bookmarks: { ...b.bookmarks, ...a.bookmarks },
    answers: { ...b.answers, ...a.answers },
    mockHistory,
    streak: a.streak.days >= b.streak.days ? a.streak : b.streak,
    ownerId: a.ownerId ?? b.ownerId,
    activeMock: a.activeMock ?? b.activeMock,
  };
}
