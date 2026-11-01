import { useCallback, useSyncExternalStore } from 'react';
import { usePrefs, effectiveLang } from './prefs';
import { translate, pick, type Lang, type TranslationKey } from '@/i18n';

export function useLang() {
  const prefs = usePrefs();
  const lang: Lang = effectiveLang(prefs);
  const t = useCallback((key: TranslationKey, vars?: Record<string, string | number>) => translate(lang, key, vars), [lang]);
  const p = useCallback(<T,>(o: { hi: T; en: T }) => pick(lang, o), [lang]);
  return { lang, t, p, prefs };
}

const noop = () => () => {};

/** False during SSR and hydration; true once running on the client. */
export function useHydrated() {
  return useSyncExternalStore(noop, () => true, () => false);
}

const subscribeOnline = (fn: () => void) => {
  window.addEventListener('online', fn);
  window.addEventListener('offline', fn);
  return () => {
    window.removeEventListener('online', fn);
    window.removeEventListener('offline', fn);
  };
};
export function useOnline() {
  return useSyncExternalStore(subscribeOnline, () => navigator.onLine, () => true);
}
