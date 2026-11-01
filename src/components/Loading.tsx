import { Component, type ReactNode } from 'react';
import { AlertCircle, Inbox } from 'lucide-react';
import { translate } from '@/i18n';
import { effectiveLang, prefsStore } from '@/lib/prefs';

/** Loading: skeleton cards on #EEF2FB. */
export function Skeleton({ lines = 4 }: { lines?: number }) {
  return (
    <div className="space-y-3 py-4" aria-busy="true" aria-live="polite">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="skeleton h-14" style={{ width: `${100 - (i % 3) * 8}%` }} />
      ))}
    </div>
  );
}

/** Empty: neon icon circle, one sentence and one button. */
export function EmptyState({ text, action }: { text: string; action?: ReactNode }) {
  return (
    <div className="card-static text-center py-8" data-testid="empty-state">
      <div className="empty-icon"><Inbox aria-hidden="true" /></div>
      <p className="mb-4">{text}</p>
      {action}
    </div>
  );
}

/** Error: one line in deep red and a Retry button. */
export function ErrorState({ text, onRetry, retryLabel }: { text: string; onRetry: () => void; retryLabel: string }) {
  return (
    <div className="card-static text-center py-6" role="alert">
      <p className="error-line mb-4 flex items-center justify-center gap-2"><AlertCircle size={18} aria-hidden="true" /> {text}</p>
      <button type="button" className="btn-secondary btn-sm" onClick={onRetry}>{retryLabel}</button>
    </div>
  );
}

export class ErrorBoundary extends Component<{ children: ReactNode; fallback?: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      if (this.props.fallback) return this.props.fallback;
      const lang = effectiveLang(prefsStore.get());
      return <ErrorState text={translate(lang, 'error.title')} onRetry={() => location.reload()} retryLabel={translate(lang, 'action.tryAgain')} />;
    }
    return this.props.children;
  }
}
