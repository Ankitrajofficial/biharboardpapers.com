import { createStore, useStore } from './store';
import type { ClassId, Medium, Stream } from '@/content/types';
import type { Lang } from '@/i18n';

export interface Prefs {
  classId: ClassId | null;
  medium: Medium | null;
  stream: Stream | null;
  /** Interface language. null = follow medium. */
  uiLang: Lang | null;
  lowData: boolean;
  /** Distribution partner code from ?ref=CODE */
  ref: string | null;
  firstVisitAt: string | null;
}

export const defaultPrefs: Prefs = {
  classId: null,
  medium: null,
  stream: null,
  uiLang: null,
  lowData: false,
  ref: null,
  firstVisitAt: null,
};

export const prefsStore = createStore<Prefs>('bbp.prefs.v1', defaultPrefs);

export const usePrefs = () => useStore(prefsStore);

export const setPrefs = (patch: Partial<Prefs>) => prefsStore.set((p) => ({ ...p, ...patch }));

export const setClass = (classId: ClassId) =>
  prefsStore.set((p) => ({ ...p, classId, stream: classId === 'class-10' ? null : p.stream }));
export const setMedium = (medium: Medium) => prefsStore.set((p) => ({ ...p, medium }));
export const setStream = (stream: Stream | null) => prefsStore.set((p) => ({ ...p, stream }));
export const setUiLang = (uiLang: Lang | null) => prefsStore.set((p) => ({ ...p, uiLang }));
export const toggleLowData = () => prefsStore.set((p) => ({ ...p, lowData: !p.lowData }));

/** True when the student can be sent straight to subjects. */
export const prefsComplete = (p: Prefs) =>
  !!p.classId && !!p.medium && (p.classId === 'class-10' || !!p.stream);

/** Effective interface language: explicit toggle wins, else the study medium, else Hindi. */
export const effectiveLang = (p: Prefs): Lang => p.uiLang ?? (p.medium === 'english' ? 'en' : 'hi');
