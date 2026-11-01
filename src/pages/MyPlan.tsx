import { Link } from 'react-router';
import { Seo } from '@/components/Seo';
import { useLang, useHydrated } from '@/lib/hooks';
import { useAccount } from '@/lib/account';
import { planActive, planEnded } from '@/lib/access';
import { planById } from '@/config/plans';
import { formatDate } from '@/lib/dates';

/** My Plan: plan, validity, receipt; links to plans and My Study for actions. */
export default function MyPlanPage() {
  const { t, lang, p } = useLang();
  const hydrated = useHydrated();
  const { account } = useAccount();
  const plan = account?.plan ? planById(account.plan.id) : undefined;
  return (
    <>
      <Seo title={t('nav.myPlan')} description={t('plans.validTill')} path="/my-plan" lang={lang} noindex />
      <h1 className="h1 py-4">{t('nav.myPlan')}</h1>
      {!hydrated ? null : !account ? (
        <div className="card-static space-y-3 max-w-md"><p className="muted">{t('my.syncNote')}</p><Link to="/login?next=/my-plan" className="btn-primary">{t('action.login')}</Link></div>
      ) : (
        <div className="card-static space-y-3 max-w-md" data-testid="my-plan-page">
          {plan && planActive(account) ? (
            <>
              <p className="price">{p(plan.name)}</p>
              <p>{t('my.validTill')} · {t('my.expiresOn')}: <strong>{formatDate(account.plan!.validTill, lang)}</strong></p>
              <p className="muted">{t('my.receipt')}: {account.plan!.receiptId} · {t('pay.txn')} {account.plan!.txnid} · ₹{account.plan!.amountPaid}</p>
              {account.plan!.refund && <p className="badge-lock">{t(`pay.refund.${account.plan!.refund}`)}</p>}
              {account.plan!.id !== 'all' && <Link to="/plans" className="btn-secondary">{t('pay.upgrade', { diff: 299 - account.plan!.amountPaid })}</Link>}
            </>
          ) : (
            <>
              <p className="font-bold">{planEnded(account) ? t('pay.ended') : t('my.noPlan')}</p>
              <Link to="/plans" className="btn-primary">{t('nav.plansPricing')}</Link>
            </>
          )}
          <Link to="/my-study" className="link text-[14px]">{t('nav.myStudy')} →</Link>
        </div>
      )}
    </>
  );
}
