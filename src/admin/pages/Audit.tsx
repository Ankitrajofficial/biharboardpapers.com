import { useState } from 'react';
import { useLang } from '@/lib/hooks';
import { adminApi, fmtDate, useFetch } from '../api';
import { DataTable, Pager, inputCls } from '../ui';

interface Row { id: string; at: string; adminPhone: string; role: string; action: string; entity: string; entityId: string; before: unknown; after: unknown; reason: string | null }
export default function Audit() {
  const { t } = useLang();
  const [q, setQ] = useState(''); const [page, setPage] = useState(1); const [open, setOpen] = useState<Row | null>(null);
  const { data, loading, error, reload } = useFetch(() => adminApi<{ rows: Row[]; total: number; perPage: number }>(`/audit?page=${page}&q=${encodeURIComponent(q)}`), [page, q]);
  return (
    <div className="space-y-3">
      <h1 className="h1">{t('admin.audit')}</h1>
      <input className={inputCls} placeholder={t('admin.search')} value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
      <DataTable<Row> columns={[
        { key: 'at', label: t('admin.audit.when'), render: (r) => fmtDate(r.at) },
        { key: 'adminPhone', label: t('admin.audit.who'), render: (r) => `${r.adminPhone.slice(2, 4)}•••••${r.adminPhone.slice(-3)} (${r.role})` },
        { key: 'action', label: t('admin.audit.what'), render: (r) => <span><strong>{r.action}</strong> {r.entity} <span className="meta">{r.entityId}</span>{r.reason ? <span className="meta block">“{r.reason}”</span> : null}</span> },
        { key: 'x', label: '', render: (r) => (r.before || r.after) ? <button type="button" className="btn-ghost btn-sm" onClick={() => setOpen(r)}>{t('admin.audit.view')}</button> : null },
      ]} rows={data?.rows ?? null} loading={loading} error={error} onRetry={reload} />
      {data && <Pager page={page} total={data.total} perPage={data.perPage} onPage={setPage} />}
      {open && (
        <div className="fixed inset-0 z-50 bg-[rgba(15,27,61,0.4)] grid place-items-center p-4" role="dialog" aria-modal="true" onClick={() => setOpen(null)}>
          <div className="card-static w-full max-w-2xl max-h-[80vh] overflow-auto space-y-2" onClick={(e) => e.stopPropagation()}>
            <h2 className="h2">{open.action} {open.entity} {open.entityId}</h2>
            <div className="grid sm:grid-cols-2 gap-2 text-[13px]">
              <div><p className="meta font-bold">{t('admin.audit.before')}</p><pre className="card p-2 overflow-auto whitespace-pre-wrap">{JSON.stringify(open.before, null, 1)}</pre></div>
              <div><p className="meta font-bold">{t('admin.audit.after')}</p><pre className="card p-2 overflow-auto whitespace-pre-wrap">{JSON.stringify(open.after, null, 1)}</pre></div>
            </div>
            <button type="button" className="btn-secondary btn-sm" onClick={() => setOpen(null)}>{t('action.close')}</button>
          </div>
        </div>
      )}
    </div>
  );
}
