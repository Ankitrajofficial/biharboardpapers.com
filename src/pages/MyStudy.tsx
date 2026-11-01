import { useState, useSyncExternalStore } from 'react';
import { Link } from 'react-router';
import { Download, Flame, LogOut, Trash2 } from 'lucide-react';
import { Seo } from '@/components/Seo';
import { useLang, useHydrated } from '@/lib/hooks';
import { resetProgress, useProgress } from '@/lib/progress';
import { toggleLowData } from '@/lib/prefs';
import { ApiError, deleteAccount, logout, requestRefund, syncProgress, updateProfile, useAccount } from '@/lib/account';
import { planActive, planEnded } from '@/lib/access';
import { planById } from '@/config/plans';
import { chapterEntryById, chaptersFor, index } from '@/content/loader';
import { getSubject, subjectsFor } from '@/data/subjects';
import { chapterPath } from '@/lib/paths';
import { formatDate } from '@/lib/dates';
import { canInstall, onInstallChange, promptInstall } from '@/lib/pwa';

export default function MyStudyPage() {
  const { t, lang, p, prefs } = useLang();
  const progress = useProgress();
  const { account } = useAccount();
  const hydrated = useHydrated();
  const install = useSyncExternalStore(onInstallChange, canInstall, () => false);
  const [synced, setSynced] = useState(false);
  const [refundMsg, setRefundMsg] = useState('');

  const medium = prefs.medium ?? 'hindi';
  const completed = Object.keys(progress.completed);
  const offline = Object.keys(progress.offline);
  const bookmarks = Object.entries(progress.bookmarks);
  const subjectList = prefs.classId ? subjectsFor(prefs.classId, prefs.stream).filter((s) => chaptersFor(s.class, medium, s.id).length) : [];
  const chapterLink = (id: string) => {
    const e = chapterEntryById(id, medium) ?? index.find((c) => c.id === id);
    const s = e && getSubject(e.class, e.subjectId);
    return e && s ? <Link className="card-tap font-semibold" to={chapterPath(s, e.medium, e)}>{e.chapterNumber}. {e.title}</Link> : <span className="muted">{id}</span>;
  };
  const active = planActive(account);
  const plan = account?.plan ? planById(account.plan.id) : undefined;

  return (
    <>
      <Seo title={t('my.title')} description={t('my.onDevice')} path="/my-study" lang={lang} noindex />
      <h1 className="h1 py-4">{t('my.title')}</h1>
      <p className="muted mb-4">{t('my.onDevice')}</p>
      {!hydrated ? null : (
        <div className="space-y-6">
          <div className="streak flex items-center gap-3"><Flame aria-hidden="true" /><span className="font-bold text-[18px]">{t('my.streak', { n: progress.streak.days })}</span></div>

          <section><h2 className="h2 mb-2">{t('my.progress')}</h2>
            {subjectList.length === 0 ? <p className="muted">{t('my.empty')}</p> : (
              <ul className="grid gap-2">{subjectList.map((s) => { const ch = chaptersFor(s.class, medium, s.id); const done = ch.filter((c) => progress.completed[c.id]).length; const pct = Math.round((done / ch.length) * 100); return (
                <li key={s.id} className="card p-3"><div className="flex justify-between font-semibold"><span>{p(s.name)}</span><span>{done}/{ch.length}</span></div><div className="progress-bar mt-2" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${pct}%` }} /></div></li>); })}</ul>
            )}
          </section>

          <section><h2 className="h2 mb-2">{t('my.completed')} ({completed.length})</h2>{completed.length ? <ul className="grid gap-2">{completed.map((id) => <li key={id}>{chapterLink(id)}</li>)}</ul> : <p className="muted">{t('my.empty')}</p>}</section>
          <section><h2 className="h2 mb-2">{t('my.offline')} ({offline.length})</h2>{offline.length ? <ul className="grid gap-2">{offline.map((id) => <li key={id}>{chapterLink(id)}</li>)}</ul> : <p className="muted">{t('my.empty')}</p>}</section>
          <section><h2 className="h2 mb-2">{t('my.bookmarks')} ({bookmarks.length})</h2>{bookmarks.length ? <ul className="grid gap-2">{bookmarks.map(([q, ch]) => <li key={q}><span className="chip mr-2">{q}</span>{chapterLink(ch)}</li>)}</ul> : <p className="muted">{t('my.empty')}</p>}</section>
          <section><h2 className="h2 mb-2">{t('my.history')}</h2>{progress.mockHistory.length ? <ul className="grid gap-2">{progress.mockHistory.map((h) => <li key={h.id} className="card p-3 flex justify-between"><span className="font-semibold">{h.title}</span><span className="tabular-nums">{h.score}/{h.total} · {formatDate(h.at.slice(0, 10), lang)}</span></li>)}</ul> : <p className="muted">{t('my.empty')}</p>}</section>

          <section className="card p-4 space-y-3"><h2 className="h2">{t('my.account')}</h2>
            {account ? (
              <>
                <p className="font-semibold">{account.name ? `${account.name} · ` : ''}{account.identityMasked}{account.phone && account.email ? ` · ${account.email}` : ''}</p>
                <div data-testid="my-plan">
                  <p><span className="muted">{t('my.plan')}:</span> {plan && active ? <strong>{p(plan.name)} · {t('my.validTill')} ({t('my.expiresOn')}: {formatDate(account.plan!.validTill, lang)})</strong> : planEnded(account) ? <span className="badge-sample">{t('pay.ended')}</span> : t('my.noPlan')}</p>
                  {account.plan && <p className="muted">{t('my.receipt')}: {account.plan.receiptId} · {t('pay.txn')} {account.plan.txnid} · ₹{account.plan.amountPaid}</p>}
                  {account.plan?.refund && <p className="badge-lock">{t(`pay.refund.${account.plan.refund}`)}</p>}
                  {active && !account.plan!.refund && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {account.plan!.id !== 'all' && <Link to="/plans" className="btn-secondary btn-sm">{t('pay.upgrade', { diff: 299 - account.plan!.amountPaid })}</Link>}
                      <button type="button" className="btn-ghost btn-sm" data-testid="refund-request" onClick={async () => { try { await requestRefund(account.plan!.orderId); await syncProgress(); setRefundMsg(t('pay.refund.requested')); } catch (e) { setRefundMsg((e as ApiError).code === 'refund_window_over' ? t('pay.refundWindow', { days: Number((e as ApiError).extra.windowDays ?? 7) }) : (e as ApiError).message); } }}>{t('pay.refundRequest')} ({t('pay.refundWindow', { days: 7 })})</button>
                    </div>
                  )}
                  {refundMsg && <p className="muted mt-1" role="status">{refundMsg}</p>}
                  {account.receipts.length > 1 && <ul className="muted mt-2 space-y-1">{account.receipts.map((r) => <li key={r.orderId}>{r.receiptId ?? r.orderId} · {r.planId}{r.kind === 'upgrade' ? ' (upgrade)' : ''} · ₹{r.amount} · {r.status}</li>)}</ul>}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" className="btn-secondary btn-sm" onClick={async () => setSynced(await syncProgress())}>{t('my.syncNote')}</button>
                  <button type="button" className="btn-secondary btn-sm" data-testid="logout" onClick={() => { if (confirm(t('auth.logoutConfirm'))) logout(false); }}><LogOut size={18} aria-hidden="true" /> {t('action.logout')}</button>
                  <button type="button" className="btn-ghost btn-sm" onClick={() => { if (confirm(t('auth.logoutConfirm'))) logout(true); }}>{t('auth.logoutAll')}</button>
                  <button type="button" className="btn-ghost btn-sm btn-danger" onClick={() => { if (confirm(t('my.deleteConfirm'))) deleteAccount(); }}><Trash2 size={18} aria-hidden="true" /> {t('my.deleteAccount')}</button>
                </div>
                {synced && <p className="badge-free">{t('my.synced')}</p>}
                <div className="border-t border-line pt-3 space-y-2" id="leaderboard">
                  <label className="flex items-center gap-3 min-h-12"><input type="checkbox" className="w-6 h-6" checked={!!account.leaderboardOptIn} onChange={(e) => updateProfile({ leaderboardOptIn: e.target.checked })} data-testid="lb-optin" /><span>{t('student.tests.optIn')}</span></label>
                  <label className="block"><span className="meta font-bold">{t('student.tests.district')}</span><input className="card w-full mt-1 px-3 min-h-12" defaultValue={account.district ?? ''} onBlur={(e) => updateProfile({ district: e.target.value })} /></label>
                </div>
              </>
            ) : (
              <><p className="muted">{t('my.syncNote')}</p><Link to="/login?next=/my-study" className="btn-primary" data-testid="login-link">{t('action.login')}</Link></>
            )}
          </section>

          <section className="card-static" id="admit-card"><h2 className="h2 mb-1">{t('nav.admitCard')}</h2><p className="muted">{t('admitCard.soon')}</p></section>

          <section className="card p-4 space-y-3">
            <label className="flex items-center gap-3 min-h-12"><input type="checkbox" className="w-6 h-6" checked={prefs.lowData} onChange={toggleLowData} /><span><span className="block font-bold">{t('my.lowData')}</span><span className="muted block">{t('my.lowDataNote')}</span></span></label>
            {install && <button type="button" className="btn-secondary" onClick={promptInstall}><Download aria-hidden="true" /> {t('action.install')}</button>}
            <button type="button" className="btn-ghost btn-sm btn-danger" onClick={() => { if (confirm(t('my.resetConfirm'))) resetProgress(); }}><Trash2 size={18} aria-hidden="true" /> {t('action.reset')}</button>
          </section>
        </div>
      )}
    </>
  );
}
