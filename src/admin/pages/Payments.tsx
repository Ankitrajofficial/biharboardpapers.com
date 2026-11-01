import { useState } from 'react';
import { useLang } from '@/lib/hooks';
import { adminApi, adminDownload, fmtDate, useFetch } from '../api';
import { DataTable, Pager, StatusPill, inputCls, selectCls } from '../ui';

interface Row { id: string; planId: string; kind: string; amount: number; status: string; mihpayid: string | null; phoneMasked: string; createdAt: string; updatedAt: string }
export default function Payments() {
  const { t } = useLang();
  const [f, setF] = useState({ status: '', plan: '', q: '', from: '', to: '' }); const [page, setPage] = useState(1); const [msg, setMsg] = useState('');
  const qs = new URLSearchParams({ ...f, page: String(page) }).toString();
  const { data, loading, error, reload } = useFetch(() => adminApi<{ rows: Row[]; total: number; perPage: number }>(`/payments?${qs}`), [qs]);
  const reconcile = async () => { const r = await adminApi<{ results: Array<{ id: string; before: string; after: string }> }>('/payments/reconcile', {}); setMsg(r.results.map((x) => `${x.id}: ${x.before} → ${x.after}`).join('; ') || t('admin.empty')); reload(); };
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2"><h1 className="h1 flex-1">{t('admin.payments')}</h1>
        <button type="button" className="btn-secondary btn-sm" onClick={reconcile}>{t('admin.pay.reconcile')}</button>
        <button type="button" className="btn-secondary btn-sm" onClick={() => adminDownload('/payments/export.csv', 'payments.csv')}>{t('admin.export')}</button></div>
      {msg && <p className="meta" role="status">{msg}</p>}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        <input className={inputCls} placeholder={t('admin.search')} value={f.q} onChange={(e) => { setF({ ...f, q: e.target.value }); setPage(1); }} />
        <select className={selectCls} value={f.status} onChange={(e) => { setF({ ...f, status: e.target.value }); setPage(1); }}><option value="">{t('admin.all')}</option>{['success', 'pending', 'failed', 'refunded'].map((s) => <option key={s} value={s}>{t(`admin.pay.${s}` as 'admin.pay.success')}</option>)}</select>
        <select className={selectCls} value={f.plan} onChange={(e) => { setF({ ...f, plan: e.target.value }); setPage(1); }}><option value="">{t('admin.all')}</option><option value="matric">₹149</option><option value="inter">₹199</option><option value="all">₹299</option></select>
        <input className={inputCls} type="date" value={f.from} onChange={(e) => setF({ ...f, from: e.target.value })} aria-label={t('admin.pay.from')} />
        <input className={inputCls} type="date" value={f.to} onChange={(e) => setF({ ...f, to: e.target.value })} aria-label={t('admin.pay.to')} />
      </div>
      <DataTable<Row> columns={[
        { key: 'id', label: t('admin.pay.txn'), render: (r) => <span className="font-mono text-[13px]">{r.id}<span className="meta block">{r.mihpayid ?? ''}</span></span> },
        { key: 'phoneMasked', label: t('admin.users') },
        { key: 'planId', label: t('admin.user.plan'), render: (r) => `${r.planId}${r.kind === 'upgrade' ? ' (upgrade)' : ''}` },
        { key: 'amount', label: '₹', render: (r) => `₹${r.amount}` },
        { key: 'status', label: t('admin.user.planStatus'), render: (r) => <StatusPill s={r.status} /> },
        { key: 'updatedAt', label: t('admin.audit.when'), render: (r) => fmtDate(r.updatedAt) },
      ]} rows={data?.rows ?? null} loading={loading} error={error} onRetry={reload} />
      {data && <Pager page={page} total={data.total} perPage={data.perPage} onPage={setPage} />}
    </div>
  );
}
