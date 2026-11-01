import { beforeEach, describe, expect, it } from 'vitest';
import { createStore } from '@/lib/store';
import { defaultPrefs, prefsStore, setClass, setMedium, setStream, prefsComplete, effectiveLang, setUiLang } from '@/lib/prefs';

describe('class / medium / stream persistence', () => {
  beforeEach(() => { localStorage.clear(); prefsStore.reset(); });

  it('saves every choice to localStorage and restores it', () => {
    setClass('class-12'); setMedium('hindi'); setStream('science');
    const saved = JSON.parse(localStorage.getItem('bbp.prefs.v1')!);
    expect(saved).toMatchObject({ classId: 'class-12', medium: 'hindi', stream: 'science' });
    // A fresh store (new page load) starts with defaults, then hydrates to the saved value.
    const fresh = createStore('bbp.prefs.v1', defaultPrefs);
    expect(fresh.get().classId).toBeNull();
    fresh.hydrate();
    expect(fresh.get()).toMatchObject({ classId: 'class-12', medium: 'hindi', stream: 'science' });
  });

  it('Class 10 needs no stream; Class 12 does', () => {
    setClass('class-10'); setMedium('english');
    expect(prefsComplete(prefsStore.get())).toBe(true);
    setClass('class-12');
    expect(prefsComplete(prefsStore.get())).toBe(false);
    setStream('arts');
    expect(prefsComplete(prefsStore.get())).toBe(true);
  });

  it('switching to Class 10 clears the stream', () => {
    setClass('class-12'); setStream('commerce'); setClass('class-10');
    expect(prefsStore.get().stream).toBeNull();
  });

  it('interface language follows the medium unless the toggle overrides it', () => {
    setMedium('english');
    expect(effectiveLang(prefsStore.get())).toBe('en');
    setUiLang('hi');
    expect(effectiveLang(prefsStore.get())).toBe('hi');
    setUiLang(null);
    setMedium('hindi');
    expect(effectiveLang(prefsStore.get())).toBe('hi');
  });
});
