import { useState } from 'react';
import { useLang } from '@/lib/hooks';
import { adminApi, adminDownload, fmtDate, useAdmin, useFetch } from '../api';
import { Confirm, DataTable, Field, Pager, inputCls, selectCls } from '../ui';

interface Row { id: string; phoneMasked: string; name: string | null; classId: string | null; medium: string | null; stream: string | null; plan: { id: string; validTill: string; active: boolean; refund: string | null } | null; optIn: boolean; blocked: boolean; createdAt: string }
interface Detail extends Row { phone: string | null; email: string | null; district: string | null; leaderboardOptIn: boolean; consent: { granted: boolean; at: string } | null; planFull: { id: string; validTill: string; receiptId: string; txnid: string; amountPaid: number; refund: string | null } | null; payments: Array<{ id: string; planId: string; amount: number; status: string; createdAt: string }>; attempts: Array<{ id: string; test: { hi: string; en: string } | null; score: number; maxMarks: number; submittedAt: string }>; admitCardUploaded: boolean }

function UserDetail({ id, onClose, onChanged }: { id: string; onClose: () => void; onChanged: () => void }) {
  const { t, p } = useLang();
  const { admin } = useAdmin();
  const owner = admin?.role === 'owner';
  const { data, loading, error, reload } = useFetch(() => adminApi<{ user: Detail }>(`/users/${id}`), [id]);
  const [phone, setPhone] = useState<string | null>(null);
  const [reason, setReason] = useState(''); const [planId, setPlanId] = useState('inter'); const [till, setTill] = useState(''); const [msg, setMsg] = useState('');
  const [confirm, setConfirm] = useState<'revoke' | 'block' | 'delete' | null>(null);
  const u = data?.user;
  const act = async (path: string, body: Record<string, unknown>, method = 'POST') => { setMsg(''); try { await adminApi(`/users/${id}${path}`, body, method); setMsg(t('admin.saved')); reload(); onChanged(); } catch (e) { setMsg((e as Error).message); } };
  return (
    <div className="fixed inset-0 z-40 bg-[rgba(15,27,61,0.4)] md:grid md:place-items-center overflow-auto" onClick={onClose}>
      <div className="card-static w-full md:max-w-2xl min-h-dvh md:min-h-0 md:max-h-[90vh] overflow-auto space-y-4" onClick={(e) => e.stopPropagation()} data-testid="user-detail">
        <div className="flex items-center gap-2"><h2 className="h2 flex-1">{t('admin.user.detail')}</h2><button type="button" className="btn-ghost btn-sm" onClick={onClose}>{t('action.close')}</button></div>
        {loading && !u ? <p className="meta">{t('admin.loading')}</p> : error || !u ? <p className="error-line">{error}</p> : (
          <>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-[15px]">
              <dt className="meta">{t('auth.enterNumber')}</dt><dd>{phone ?? u.phoneMasked} {owner && !phone && <button type="button" className="link text-[14px]" onClick={async () => setPhone((await adminApi<{ phone: string }>(`/users/${id}/phone`)).phone)} data-testid="show-phone">{t('admin.user.showPhone')}</button>}</dd>
              <dt className="meta">{t('auth.nameTitle')}</dt><dd>{u.name ?? '—'} {u.email ? `· ${u.email}` : ''} {u.district ? `· ${u.district}` : ''}</dd>
              <dt className="meta">{t('choose.class.title')}</dt><dd>{u.classId ?? '—'} · {u.medium ?? '—'} · {u.stream ?? '—'}</dd>
              <dt className="meta">{t('admin.user.plan')}</dt><dd data-testid="detail-plan">{u.planFull ? `${u.planFull.id} · ${t('admin.user.validTill')} ${u.planFull.validTill} · ₹${u.planFull.amountPaid} · ${u.plan?.active ? t('admin.user.active') : t('admin.user.expired')}${u.planFull.refund ? ` · refund ${u.planFull.refund}` : ''}` : t('admin.user.none')}</dd>
              <dt className="meta">{t('admin.user.optIn')}</dt><dd>{u.consent?.granted ? `✓ ${fmtDate(u.consent.at)}` : '✗'}</dd>
              <dt className="meta">{t('admin.user.admitCard')}</dt><dd>{u.admitCardUploaded ? '✓' : '✗'}</dd>
              <dt className="meta">{t('admin.user.signup')}</dt><dd>{fmtDate(u.createdAt)} {u.blocked && <span className="badge-sample">{t('admin.user.blocked')}</span>}</dd>
            </dl>
            <section><h3 className="font-bold mb-1">{t('admin.user.payments')}</h3>{u.payments.length ? <ul className="text-[14px] space-y-1">{u.payments.map((o) => <li key={o.id} className="font-mono">{o.id} · {o.planId} · ₹{o.amount} · {o.status} · {fmtDate(o.createdAt)}</li>)}</ul> : <p className="meta">{t('admin.empty')}</p>}</section>
            <section><h3 className="font-bold mb-1">{t('admin.user.attempts')}</h3>{u.attempts.length ? <ul className="text-[14px] space-y-1">{u.attempts.map((a) => <li key={a.id}>{a.test ? p(a.test) : a.id} · {a.score}/{a.maxMarks} · {fmtDate(a.submittedAt)}</li>)}</ul> : <p className="meta">{t('admin.empty')}</p>}</section>
            {owner && (
              <section className="space-y-3 border-t border-line pt-3">
                <Field label={t('admin.reason')}><input className={inputCls} value={reason} onChange={(e) => setReason(e.target.value)} data-testid="action-reason" /></Field>
                <div className="grid sm:grid-cols-3 gap-2 items-end">
                  <Field label={t('admin.user.plan')}><select className={selectCls} value={planId} onChange={(e) => setPlanId(e.target.value)}><option value="matric">matric ₹149</option><option value="inter">inter ₹199</option><option value="all">all ₹299</option></select></Field>
                  <Field label={t('admin.user.validTill')}><input className={inputCls} type="date" value={till} onChange={(e) => setTill(e.target.value)} /></Field>
                  <button type="button" className="btn-primary btn-sm" disabled={!reason.trim()} onClick={() => act('/plan', { planId, validTill: till || null, reason })} data-testid="grant-plan">{t('admin.user.grant')}</button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {u.planFull && <button type="button" className="btn-secondary btn-sm" disabled={!reason.trim()} onClick={() => setConfirm('revoke')} data-testid="revoke-plan">{t('admin.user.revoke')}</button>}
                  {u.planFull && <select className={selectCls + ' w-auto'} value="" disabled={!reason.trim()} onChange={(e) => e.target.value && act('/refund', { state: e.target.value, reason })} aria-label={t('admin.user.refund')}><option value="">{t('admin.user.refund')}…</option><option value="requested">requested</option><option value="processing">processing</option><option value="refunded">refunded</option></select>}
                  <button type="button" className="btn-secondary btn-sm" disabled={!reason.trim()} onClick={() => (u.blocked ? act('/block', { blocked: false, reason }) : setConfirm('block'))}>{u.blocked ? t('admin.user.unblock') : t('admin.user.block')}</button>
                  <button type="button" className="btn-ghost btn-sm btn-danger" disabled={!reason.trim()} onClick={() => setConfirm('delete')}>{t('admin.user.deleteUser')}</button>
                </div>
                {msg && <p className="meta" role="status" data-testid="action-msg">{msg}</p>}
                <Confirm open={!!confirm} name={`${u.name ?? ''} ${u.phoneMasked}`} label={confirm === 'revoke' ? t('admin.user.revoke') : confirm === 'block' ? t('admin.user.block') : t('admin.delete')} onCancel={() => setConfirm(null)} onConfirm={async () => { const c = confirm; setConfirm(null); if (c === 'revoke') await act('/revoke', { reason }); if (c === 'block') await act('/block', { blocked: true, reason }); if (c === 'delete') { await act('', { reason }, 'DELETE'); onClose(); } }} />
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function Users() {
  const { t } = useLang();
  const { admin } = useAdmin();
  const [f, setF] = useState({ q: '', class: '', medium: '', stream: '', plan: '', planStatus: '', since: '', optIn: '' }); const [page, setPage] = useState(1); const [open, setOpen] = useState<string | null>(null);
  const qs = new URLSearchParams({ ...f, page: String(page) }).toString();
  const { data, loading, error, reload } = useFetch(() => adminApi<{ rows: Row[]; total: number; perPage: number }>(`/users?${qs}`), [qs]);
  const set = (k: string, v: string) => { setF({ ...f, [k]: v }); setPage(1); };
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2"><h1 className="h1 flex-1">{t('admin.users')}</h1>{admin?.role === 'owner' && <button type="button" className="btn-secondary btn-sm" onClick={() => adminDownload('/users/export.csv', 'users.csv')}>{t('admin.export')}</button>}</div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <input className={inputCls + ' col-span-2'} placeholder={t('admin.search')} value={f.q} onChange={(e) => set('q', e.target.value)} data-testid="user-search" />
        <select className={selectCls} value={f.class} onChange={(e) => set('class', e.target.value)}><option value="">{t('papers.filter.class')}: {t('admin.all')}</option><option value="class-10">10</option><option value="class-12">12</option></select>
        <select className={selectCls} value={f.medium} onChange={(e) => set('medium', e.target.value)}><option value="">{t('medium.hindi')}/{t('medium.english')}</option><option value="hindi">{t('medium.hindi')}</option><option value="english">{t('medium.english')}</option></select>
        <select className={selectCls} value={f.stream} onChange={(e) => set('stream', e.target.value)}><option value="">{t('choose.stream.title')}</option><option value="arts">{t('stream.arts')}</option><option value="science">{t('stream.science')}</option><option value="commerce">{t('stream.commerce')}</option></select>
        <select className={selectCls} value={f.plan} onChange={(e) => set('plan', e.target.value)}><option value="">{t('admin.user.plan')}: {t('admin.all')}</option><option value="matric">matric</option><option value="inter">inter</option><option value="all">all</option></select>
        <select className={selectCls} value={f.planStatus} onChange={(e) => set('planStatus', e.target.value)}><option value="">{t('admin.user.planStatus')}</option><option value="active">{t('admin.user.active')}</option><option value="expired">{t('admin.user.expired')}</option><option value="none">{t('admin.user.none')}</option></select>
        <input className={inputCls} type="date" value={f.since} onChange={(e) => set('since', e.target.value)} aria-label={t('admin.user.signup')} />
        <select className={selectCls} value={f.optIn} onChange={(e) => set('optIn', e.target.value)}><option value="">{t('admin.user.optIn')}</option><option value="yes">✓</option><option value="no">✗</option></select>
      </div>
      <DataTable<Row> columns={[
        { key: 'phoneMasked', label: t('auth.enterNumber'), render: (r) => <span>{r.phoneMasked}{r.name ? <span className="meta block">{r.name}</span> : null}</span> },
        { key: 'classId', label: t('choose.class.title'), render: (r) => `${r.classId ?? '—'} · ${r.medium ?? '—'}${r.stream ? ` · ${r.stream}` : ''}` },
        { key: 'plan', label: t('admin.user.plan'), render: (r) => r.plan ? <span className={r.plan.active ? 'badge-free' : 'badge-lock'}>{r.plan.id} · {r.plan.validTill}</span> : <span className="meta">—</span> },
        { key: 'optIn', label: 'WA', render: (r) => (r.optIn ? '✓' : '✗') },
        { key: 'createdAt', label: t('admin.user.signup'), render: (r) => <span>{fmtDate(r.createdAt, false)}{r.blocked ? <span className="badge-sample ml-1">{t('admin.user.blocked')}</span> : null}</span> },
      ]} rows={data?.rows ?? null} loading={loading} error={error} onRetry={reload} onRowClick={(r) => setOpen(r.id)} />
      {data && <Pager page={page} total={data.total} perPage={data.perPage} onPage={setPage} />}
      {open && <UserDetail id={open} onClose={() => setOpen(null)} onChanged={reload} />}
    </div>
  );
}
