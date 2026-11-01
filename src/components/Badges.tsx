import { AlertTriangle, CheckCircle2, Lock, ShieldCheck } from 'lucide-react';
import type { ContentStatus } from '@/content/types';
import { useLang } from '@/lib/hooks';

export function StatusBadge({ status, short }: { status: ContentStatus; short?: boolean }) {
  const { t } = useLang();
  if (status === 'verified_official')
    return (
      <span className="badge-free"><ShieldCheck size={14} aria-hidden="true" /> {t('chapter.officialBadge')}</span>
    );
  if (status === 'reviewed')
    return (
      <span className="badge-free"><CheckCircle2 size={14} aria-hidden="true" /> {t('chapter.reviewedBadge')}</span>
    );
  return (
    <span className="badge-sample">
      <AlertTriangle size={14} aria-hidden="true" /> {short ? t('sample.short') : status === 'draft' ? t('chapter.draftBadge') : t('chapter.sampleBadge')}
    </span>
  );
}

export function LockBadge({ label }: { label: string }) {
  return (
    <span className="badge-lock"><Lock size={13} aria-hidden="true" /> {label}</span>
  );
}
