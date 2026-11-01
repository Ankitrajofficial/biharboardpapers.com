import { siteConfig } from '@/config/site';
import { prefsStore } from './prefs';

export type EventName =
  | 'class_selected'
  | 'medium_selected'
  | 'stream_selected'
  | 'chapter_opened'
  | 'quiz_completed'
  | 'mock_completed'
  | 'share_clicked'
  | 'pwa_installed'
  | 'plan_viewed'
  | 'purchase_started'
  | 'purchase_completed';

declare global {
  interface Window {
    plausible?: (name: string, opts?: { props?: Record<string, string | number> }) => void;
    umami?: { track: (name: string, data?: Record<string, string | number>) => void };
  }
}

/**
 * Cookieless, privacy-respecting founder analytics. No personal data: only the event name,
 * the class/medium and the optional partner `ref` code. Account data never goes here.
 */
export function track(name: EventName, props: Record<string, string | number> = {}) {
  if (typeof window === 'undefined') return;
  const p = prefsStore.get();
  const data: Record<string, string | number> = {
    ...props,
    class: p.classId ?? '',
    medium: p.medium ?? '',
    ...(p.ref ? { ref: p.ref } : {}),
  };
  try {
    switch (siteConfig.analytics.provider) {
      case 'plausible':
        window.plausible?.(name, { props: data });
        break;
      case 'umami':
        window.umami?.track(name, data);
        break;
      case 'cloudflare':
        // Cloudflare Web Analytics is page-view only; custom events are not supported.
        break;
      default:
        if (import.meta.env.DEV) console.debug('[event]', name, data);
    }
  } catch {
    /* analytics must never break the site */
  }
}

/** Inject the analytics script once, only when a provider is configured. */
export function initAnalytics() {
  if (typeof document === 'undefined' || siteConfig.analytics.provider === 'none' || !siteConfig.analytics.script) return;
  if (document.querySelector('script[data-bbp-analytics]')) return;
  const s = document.createElement('script');
  s.defer = true;
  s.src = siteConfig.analytics.script;
  s.dataset.bbpAnalytics = '1';
  if (siteConfig.analytics.provider === 'plausible') s.dataset.domain = siteConfig.analytics.domain;
  if (siteConfig.analytics.provider === 'umami') s.dataset.websiteId = siteConfig.analytics.domain;
  if (siteConfig.analytics.provider === 'cloudflare') s.dataset.cfBeacon = JSON.stringify({ token: siteConfig.analytics.domain });
  document.head.appendChild(s);
}
