import { Lock } from 'lucide-react';
import { Link, useLocation } from 'react-router';
import { useLang } from '@/lib/hooks';
import { planForClass } from '@/config/plans';
import type { ClassId } from '@/content/types';

/** One small lock icon and one line. Never blocks free content around it. */
export function LockedCard({ classId, note }: { classId: ClassId; note?: string }) {
  const { t } = useLang();
  const plan = planForClass(classId);
  const loc = useLocation();
  const next = encodeURIComponent(loc.pathname + loc.search);
  return (
    <div className="space-y-2">
      <Link to={`/plans?next=${next}`} className="btn-locked" data-testid="locked-button">
        <Lock size={20} aria-hidden="true" /> {t('plans.unlockFor', { price: plan.priceInr })}
      </Link>
      <p className="muted">{t('plans.lockLine', { price: plan.priceInr })}{note ? ` · ${note}` : ''}</p>
    </div>
  );
}
