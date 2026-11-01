import { track } from './analytics';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferred: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();

export function initPwa() {
  if (typeof window === 'undefined') return;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e as BeforeInstallPromptEvent;
    listeners.forEach((l) => l());
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    track('pwa_installed');
    listeners.forEach((l) => l());
  });
}

export const canInstall = () => deferred !== null;
export const onInstallChange = (fn: () => void) => {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
};
export async function promptInstall() {
  if (!deferred) return false;
  await deferred.prompt();
  const r = await deferred.userChoice;
  deferred = null;
  listeners.forEach((l) => l());
  return r.outcome === 'accepted';
}
