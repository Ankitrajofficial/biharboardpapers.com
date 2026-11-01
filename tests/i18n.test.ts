import { describe, expect, it } from 'vitest';
import { hi } from '@/i18n/hi';
import { en } from '@/i18n/en';
import { translate, translationKeys } from '@/i18n';

describe('translations', () => {
  it('English covers every Hindi key with a non-empty string', () => {
    for (const k of translationKeys) expect(en[k], k).toBeTruthy();
    expect(Object.keys(en).sort()).toEqual(Object.keys(hi).sort());
  });
  it('switches language and substitutes placeholders', () => {
    expect(translate('hi', 'nav.home')).toBe('होम');
    expect(translate('en', 'nav.home')).toBe('Home');
    expect(translate('hi', 'my.streak', { n: 3 })).toBe('लगातार 3 दिन');
    expect(translate('en', 'plans.lockLine', { price: 149 })).toBe('Full practice for ₹149');
  });
  it('Hindi strings contain no English-only labels for primary actions', () => {
    for (const k of ['action.read', 'action.practice', 'action.next', 'nav.home', 'nav.subjects', 'nav.tests', 'nav.myStudy'] as const) expect(hi[k]).toMatch(/[ऀ-ॿ]/);
  });
});
