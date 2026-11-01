import { useSyncExternalStore } from 'react';

/**
 * Tiny persistent store. SSR-safe: the server and the first client render both see
 * `initial`; `hydrate()` (called once after mount) loads the saved value from
 * localStorage. This avoids hydration mismatches on pre-rendered pages.
 */
export interface Store<T> {
  get: () => T;
  set: (next: T | ((prev: T) => T)) => void;
  subscribe: (fn: () => void) => () => void;
  hydrate: () => void;
  reset: () => void;
  key: string;
}

const isBrowser = () => typeof window !== 'undefined' && typeof localStorage !== 'undefined';

export function createStore<T>(key: string, initial: T, migrate?: (raw: unknown) => T): Store<T> {
  let state = initial;
  let hydrated = false;
  const listeners = new Set<() => void>();
  const emit = () => listeners.forEach((l) => l());

  const persist = () => {
    if (!isBrowser()) return;
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch {
      /* storage full or disabled: keep working in memory */
    }
  };

  return {
    key,
    get: () => state,
    set: (next) => {
      state = typeof next === 'function' ? (next as (p: T) => T)(state) : next;
      persist();
      emit();
    },
    subscribe: (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    hydrate: () => {
      if (hydrated || !isBrowser()) return;
      hydrated = true;
      try {
        const raw = localStorage.getItem(key);
        if (raw != null) {
          const parsed = JSON.parse(raw);
          state = migrate ? migrate(parsed) : { ...initial, ...parsed };
          emit();
        }
      } catch {
        /* corrupt value: ignore */
      }
    },
    reset: () => {
      state = initial;
      if (isBrowser()) localStorage.removeItem(key);
      emit();
    },
  };
}

export function useStore<T>(store: Store<T>): T {
  return useSyncExternalStore(store.subscribe, store.get, store.get);
}
