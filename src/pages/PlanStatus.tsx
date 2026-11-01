import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { CheckCircle2 } from 'lucide-react';
import { Seo } from '@/components/Seo';
import { useLang } from '@/lib/hooks';
import { getOrder, refreshAccount, testPay, useAccount, type Order } from '@/lib/account';
import { planById } from '@/config/plans';
import { track } from '@/lib/analytics';
import { siteConfig } from '@/config/site';

const POLL_MS = 5000;
const POLL_MAX_MS = 2 * 60 * 1000;

/** surl/furl/pending landing page: polls the order; nothing here unlocks anything. */
export default function PlanStatusPage() {
  const { t, lang, p } = useLang();
  const [sp] = useSearchParams();
  const id = sp.get('order') ?? '';
  const test = sp.get('test') === '1';
  const next = sp.get('next') && sp.get('next')!.startsWith('/') ? sp.get('next')! : '/my-study';
  const { token } = useAccount();
  const [order, setOrder] = useState<Order | null>(null);
  const [timedOut, setTimedOut] = useState(false);
  const started = useRef(0);
  const doneRef = useRef(false);

  useEffect(() => {
    if (!id || !token) return;
    started.current = Date.now();
    let stop = false;
    const tick = async () => {
      try {
        const r = await getOrder(id);
        if (stop) return;
        setOrder(r.order);
        const final = ['success', 'failed', 'duplicate', 'refund_requested', 'refund_processing', 'refunded'].includes(r.order.status);
        if (r.order.status === 'success' && !doneRef.current) { doneRef.current = true; await refreshAccount(); track('purchase_completed', { plan: r.order.planId }); }
        if (final) return;
        if (Date.now() - started.current > POLL_MAX_MS) { setTimedOut(true); return; }
      } catch { /* keep polling */ }
      if (!stop) setTimeout(tick, POLL_MS);
    };
    tick();
    return () => { stop = true; };
  }, [id, token]);

  const simulate = async (status: 'success' | 'failure' | 'pending') => {
    const r = await testPay(id, status);
    setOrder(r.order);
    if (r.order.status === 'success') { doneRef.current = true; await refreshAccount(); track('purchase_completed', { plan: r.order.planId }); }
  };

  const plan = order ? planById(order.planId) : undefined;
  const status = order?.status;
  const body = !token ? (
    <p className="badge-sample">{t('auth.sessionExpired')} · <Link className="link" to={`/login?next=${encodeURIComponent(`/plans/status?order=${id}`)}`}>{t('action.login')}</Link></p>
  ) : status === 'success' ? (
    <section className="card p-5 space-y-3" data-testid="pay-success">
      <p className="text-[22px] font-bold flex items-center gap-2"><CheckCircle2 className="text-deep-mint" aria-hidden="true" /> {t('pay.activated')}</p>
      {plan && <p>{p(plan.name)} · ₹{order!.amount} · {t('pay.txn')} {order!.id}{order!.receiptId ? ` · ${t('my.receipt')} ${order!.receiptId}` : ''}</p>}
      <p className="muted">{t('pay.receiptNote')}</p>
      <Link to={next} className="btn-primary" data-testid="back-to-item">{t('pay.backToItem')}</Link>
    </section>
  ) : status === 'failed' ? (
    <section className="card p-5 space-y-3" data-testid="pay-failed">
      <p className="text-[20px] font-bold text-deep-red">{t('pay.failed')}</p>
      <p>{t('pay.failedNote')}</p>
      <Link to={`/plans?buy=${order!.planId}&next=${encodeURIComponent(next)}`} className="btn-primary">{t('pay.retry')}</Link>
    </section>
  ) : status === 'duplicate' ? (
    <section className="card p-5 space-y-3"><p className="font-bold">{t('pay.alreadyActive')}</p><p className="muted">{t('pay.refund.processing')} · {t('pay.txn')} {order!.id}</p><Link to="/my-study" className="btn-secondary">{t('my.plan')}</Link></section>
  ) : (
    <section className="card p-5 space-y-3" role="status" data-testid="pay-pending">
      <p className="text-[20px] font-bold">{timedOut || status === 'pending' ? t('pay.pending') : t('pay.confirming')}</p>
      <p>{t('pay.pendingNote')}</p>
      <p className="muted">{t('pay.txn')} {id}</p>
      <a className="link text-[14px]" href={`https://wa.me/${siteConfig.contact.whatsappNumber}`} target="_blank" rel="noopener noreferrer">{t('auth.help')} ↗</a>
    </section>
  );

  return (
    <>
      <Seo title={t('pay.confirming')} description={t('pay.pendingNote')} path="/plans/status" lang={lang} noindex />
      <h1 className="h1 py-4">{t('plans.title')}</h1>
      {body}
      {test && token && status !== 'success' && (
        <div className="card p-4 mt-4 space-y-2" data-testid="test-pay">
          <p className="muted">TEST_MODE</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-primary btn-sm" onClick={() => simulate('success')} data-testid="test-success">{t('pay.testSuccess')}</button>
            <button type="button" className="btn-secondary btn-sm" onClick={() => simulate('failure')} data-testid="test-fail">{t('pay.testFail')}</button>
            <button type="button" className="btn-secondary btn-sm" onClick={() => simulate('pending')} data-testid="test-pending">{t('pay.testPending')}</button>
          </div>
        </div>
      )}
    </>
  );
}
