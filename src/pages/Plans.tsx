import { Suspense, use, useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { CheckCircle2, Lock } from 'lucide-react';
import { Seo } from '@/components/Seo';
import { Skeleton } from '@/components/Loading';
import { plans, planById, type Plan } from '@/config/plans';
import { siteConfig } from '@/config/site';
import { useLang, useHydrated } from '@/lib/hooks';
import { ApiError, createOrder, postToPayu, updateProfile, useAccount } from '@/lib/account';
import { planActive, planEnded } from '@/lib/access';
import { loadExamCalendar } from '@/content/loader';
import { formatDate, planExpiry } from '@/lib/dates';
import { track } from '@/lib/analytics';

/** P4: confirm plan + validity → server creates the order with the price and hash → PayU. */
function Confirm({ plan, validTill, next }: { plan: Plan; validTill: string; next: string }) {
  const { t, p, lang } = useLang();
  const nav = useNavigate();
  const { account } = useAccount();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [phone, setPhone] = useState('');
  const needPhone = !!account && !account.phone && !account.contactPhone;
  const upgrade = plan.id === 'all' && account?.plan && planActive(account) && account.plan.id !== 'all';
  const amount = upgrade ? plan.priceInr - account!.plan!.amountPaid : plan.priceInr;
  const pay = async () => {
    setBusy(true); setErr('');
    track('purchase_started', { plan: plan.id });
    try {
      if (needPhone) { if (!/^[6-9]\d{9}$/.test(phone)) { setErr(t('pay.phoneNeeded')); setBusy(false); return; } await updateProfile({ contactPhone: phone }); }
      const r = await createOrder(plan.id);
      if (r.testMode) { nav(`/plans/status?order=${encodeURIComponent(r.order.id)}&test=1&next=${encodeURIComponent(next)}`); return; }
      postToPayu(r.payu);
    } catch (e) {
      const a = e as ApiError;
      setErr(a.code === 'already_active' ? t('pay.alreadyActive') : a.code === 'network' ? t('auth.networkError') : a.message);
      setBusy(false);
    }
  };
  return (
    <section className="card-static space-y-3 max-w-md" data-testid="confirm-plan">
      <h2 className="h2">{t('pay.confirmTitle')}</h2>
      <p className="text-[18px] font-bold">{p(plan.name)} ₹{amount}{upgrade ? ` (${t('pay.upgrade', { diff: amount })})` : ''}</p>
      <p className="muted">{t('pay.validTillDate', { date: formatDate(validTill, lang) })}</p>
      {needPhone && (
        <label className="block"><span className="font-semibold">{t('pay.phoneNeeded')}</span>
          <span className="card flex items-center mt-1 overflow-hidden"><span className="px-3 font-bold text-muted border-r border-line min-h-14 inline-flex items-center">+91</span><input className="flex-1 min-w-0 px-3 min-h-14 text-[20px] bg-transparent outline-none" type="tel" inputMode="numeric" maxLength={10} value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} data-testid="checkout-phone" /></span>
        </label>
      )}
      <button type="button" className="btn-primary" disabled={busy} onClick={pay} data-testid="pay-upi">{t('pay.payUpi')}</button>
      <p className="muted">{t('pay.methods')} · {t('pay.receiptNote')}</p>
      {err && <p className="text-deep-red" role="alert">{err}</p>}
    </section>
  );
}

function PlanCards() {
  const cal = use(loadExamCalendar());
  const { t, p, lang, prefs } = useLang();
  const { account } = useAccount();
  const hydrated = useHydrated();
  const [sp] = useSearchParams();
  const nav = useNavigate();
  const buy = sp.get('buy');
  const next = sp.get('next') && sp.get('next')!.startsWith('/') ? sp.get('next')! : '/plans';
  useEffect(() => { track('plan_viewed'); }, []);
  const active = hydrated && planActive(account);
  const activeId = active ? account!.plan!.id : null;
  const covered = (pl: Plan) => activeId === pl.id || activeId === 'all';
  const upgradeDiff = active && activeId !== 'all' ? plans.find((x) => x.id === 'all')!.priceInr - account!.plan!.amountPaid : null;
  const chosen = buy ? planById(buy) : undefined;

  if (hydrated && chosen && account && !covered(chosen)) return <Confirm plan={chosen} validTill={planExpiry(cal, chosen.classes)} next={next} />;

  return (
    <>
      {hydrated && planEnded(account) && <p className="badge-sample text-[15px] mb-3">{t('pay.ended')}</p>}
      <ul className="grid gap-4 md:grid-cols-3">
        {plans.map((pl) => {
          const exp = planExpiry(cal, pl.classes);
          const mine = hydrated && activeId === pl.id;
          const forClass = hydrated && prefs.classId && pl.classes.length === 1 && pl.classes[0] === prefs.classId;
          return (
            <li key={pl.id} className={`plan-card flex flex-col gap-3 tone-${pl.id === 'matric' ? 'pink' : pl.id === 'inter' ? 'blue' : 'violet'} ${mine || forClass ? 'selected' : ''}`} data-testid={`plan-${pl.id}`}>
              {forClass && <span className="chip self-start">{t('pay.yourClassPlan')}</span>}
              <h2 className="h2">{p(pl.name)}</h2>
              <p className="price">₹{pl.priceInr} <span className="muted font-normal">{t('plans.oneTime')}</span></p>
              <p className="muted">{t('plans.validTill')}{exp ? ` (${formatDate(exp, lang)})` : ''}</p>
              <ul className="space-y-1 flex-1">{p(pl.includes).slice(0, 4).map((x) => <li key={x} className="flex gap-2"><CheckCircle2 size={18} className="text-deep-mint shrink-0 mt-1" aria-hidden="true" /> {x}</li>)}</ul>
              {!hydrated ? null : mine ? (
                <p className="badge-free text-[15px]">{t('plans.current')}</p>
              ) : covered(pl) ? (
                <p className="badge-lock text-[15px]">{t('pay.alreadyActive')}</p>
              ) : pl.id === 'all' && upgradeDiff ? (
                <button type="button" className="btn-primary" onClick={() => nav(account ? `/plans?buy=all&next=${encodeURIComponent(next)}` : `/login?next=${encodeURIComponent(`/plans?buy=all&next=${next}`)}`)} data-testid="buy-all">{t('pay.upgrade', { diff: upgradeDiff })}</button>
              ) : (
                <button type="button" className="btn-primary" onClick={() => nav(account ? `/plans?buy=${pl.id}&next=${encodeURIComponent(next)}` : `/login?next=${encodeURIComponent(`/plans?buy=${pl.id}&next=${next}`)}`)} data-testid={`buy-${pl.id}`}>{t('pay.buyFor', { price: pl.priceInr })}</button>
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}

export default function PlansPage() {
  const { t, lang } = useLang();
  const freeItems = t('plans.freeItems', { n: siteConfig.freeObjectivePerChapter }).split('|');
  return (
    <>
      <Seo title={t('plans.title')} description={t('plans.intro')} path="/plans" lang={lang} />
      <h1 className="h1 py-4">{t('plans.title')}</h1>
      <p className="mb-4">{t('plans.intro')}</p>
      <section className="card-static mb-5">
        <h2 className="h2 mb-2">{t('plans.free')}</h2>
        <ul className="space-y-1">{freeItems.map((x) => <li key={x} className="flex gap-2"><CheckCircle2 size={18} className="text-deep-mint shrink-0 mt-1" aria-hidden="true" /> {x}</li>)}</ul>
      </section>
      <Suspense fallback={<Skeleton lines={6} />}><PlanCards /></Suspense>
      <p className="muted mt-4 flex items-center gap-1"><Lock size={14} aria-hidden="true" /> {t('login.privacy')}</p>
      <p className="muted mt-2"><Link className="link" to="/my-study">{t('my.plan')}</Link></p>
    </>
  );
}
