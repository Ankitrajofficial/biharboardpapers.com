import { hi, type TranslationKey } from './hi';
import { en } from './en';
import type { Medium } from '@/content/types';

export type Lang = 'hi' | 'en';
export type { TranslationKey };

const dict: Record<Lang, Record<TranslationKey, string>> = { hi, en };

/** Translate a key, substituting `{name}` placeholders. Falls back to Hindi, then the key. */
export function translate(lang: Lang, key: TranslationKey, vars?: Record<string, string | number>): string {
  let s = dict[lang][key] ?? hi[key] ?? key;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(String(v));
  return s;
}

export const langFromMedium = (m: Medium | null | undefined): Lang => (m === 'english' ? 'en' : 'hi');

/** Pick from a {hi,en} pair */
export const pick = <T,>(lang: Lang, o: { hi: T; en: T }): T => (lang === 'en' ? o.en : o.hi);

export const translationKeys = Object.keys(hi) as TranslationKey[];
