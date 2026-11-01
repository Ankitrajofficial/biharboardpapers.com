import { useState, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useLang } from '@/lib/hooks';
import { EmptyState, ErrorState, Skeleton } from '@/components/Loading';

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="meta font-bold uppercase tracking-wide">{label}</span>
      <div className="mt-1">{children}</div>
      {hint && <span className="meta block mt-1">{hint}</span>}
    </label>
  );
}
export const inputCls = 'card w-full px-3 min-h-12 text-[16px] bg-white';
export const selectCls = 'card w-full px-3 min-h-12 text-[16px] bg-white';

/** hi/en pair */
export function BiInput({ label, value, onChange, multiline, hint }: { label: string; value: { hi: string; en: string }; onChange: (v: { hi: string; en: string }) => void; multiline?: boolean; hint?: string }) {
  const Tag = multiline ? 'textarea' : 'input';
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <Field label={`${label} (हिंदी)`} hint={hint}><Tag className={inputCls} lang="hi" value={value.hi} rows={multiline ? 3 : undefined} onChange={(e) => onChange({ ...value, hi: e.target.value })} /></Field>
      <Field label={`${label} (English)`}><Tag className={inputCls} lang="en" value={value.en} rows={multiline ? 3 : undefined} onChange={(e) => onChange({ ...value, en: e.target.value })} /></Field>
    </div>
  );
}

export function Pager({ page, total, perPage, onPage }: { page: number; total: number; perPage: number; onPage: (p: number) => void }) {
  const { t } = useLang();
  const pages = Math.max(1, Math.ceil(total / perPage));
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-between gap-2 mt-3">
      <button type="button" className="btn-secondary btn-sm" disabled={page <= 1} onClick={() => onPage(page - 1)}><ChevronLeft size={18} aria-hidden="true" /> {t('admin.prev')}</button>
      <span className="meta">{t('admin.page')} {page} {t('admin.of')} {pages} · {total}</span>
      <button type="button" className="btn-secondary btn-sm" disabled={page >= pages} onClick={() => onPage(page + 1)}>{t('admin.next')} <ChevronRight size={18} aria-hidden="true" /></button>
    </div>
  );
}

export interface Column<T> { key: string; label: string; render?: (row: T) => ReactNode; className?: string }
export function DataTable<T extends object>({ columns, rows, loading, error, onRetry, onRowClick, empty }: { columns: Column<T>[]; rows: T[] | null; loading: boolean; error: string | null; onRetry: () => void; onRowClick?: (r: T) => void; empty?: string }) {
  const { t } = useLang();
  if (loading && !rows) return <Skeleton lines={5} />;
  if (error) return <ErrorState text={error} onRetry={onRetry} retryLabel={t('admin.retry')} />;
  if (!rows?.length) return <EmptyState text={empty ?? t('admin.empty')} />;
  return (
    <div className="card-static p-0 overflow-x-auto">
      <table className="w-full text-[15px]">
        <thead><tr className="text-left border-b border-line">{columns.map((c) => <th key={c.key} className={`px-3 py-2 meta font-bold ${c.className ?? ''}`}>{c.label}</th>)}</tr></thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={(r as { id?: string }).id ?? i} className={`border-b border-line last:border-0 ${onRowClick ? 'cursor-pointer hover:bg-[#F7F9FF]' : ''}`} onClick={onRowClick ? () => onRowClick(r) : undefined}>
              {columns.map((c) => <td key={c.key} className={`px-3 py-2 align-top ${c.className ?? ''}`}>{c.render ? c.render(r) : String((r as Record<string, unknown>)[c.key] ?? '')}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Confirm dialog for destructive actions; shows the item name and (optionally) asks for a reason. */
export function Confirm({ open, name, onCancel, onConfirm, needReason, label }: { open: boolean; name: string; onCancel: () => void; onConfirm: (reason: string) => void; needReason?: boolean; label?: string }) {
  const { t } = useLang();
  const [reason, setReason] = useState('');
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-[rgba(15,27,61,0.4)] grid place-items-center p-4" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
      <div className="card-static w-full max-w-md space-y-3">
        <h2 id="confirm-title" className="h2">{t('admin.confirmDelete', { name })}</h2>
        {needReason && <Field label={t('admin.reason')}><input className={inputCls} value={reason} onChange={(e) => setReason(e.target.value)} data-testid="confirm-reason" /></Field>}
        <div className="flex gap-2">
          <button type="button" className="btn-secondary btn-sm" onClick={onCancel}>{t('admin.cancel')}</button>
          <button type="button" className="btn-primary btn-sm btn-danger-fill" disabled={needReason && !reason.trim()} onClick={() => onConfirm(reason.trim())} data-testid="confirm-ok">{label ?? t('admin.delete')}</button>
        </div>
      </div>
    </div>
  );
}

export function StatusPill({ s }: { s: string }) {
  const { t } = useLang();
  const cls: Record<string, string> = { live: 'badge-free', published: 'badge-free', success: 'badge-free', scheduled: 'chip', draft: 'badge-lock', closed: 'badge-lock', expired: 'badge-lock', failed: 'badge-sample', pending: 'badge-sample', open: 'badge-sample', resolved: 'badge-free', reviewed: 'badge-free' };
  const key = (`admin.status.${s}`) as Parameters<typeof t>[0];
  let label: string = s;
  try { label = t(key); if (label === key) label = s; } catch { /* keep raw */ }
  return <span className={`${cls[s] ?? 'chip'} text-[13px]`}>{label}</span>;
}

/** Simple 30-day line chart (SVG), two series. */
export function LineChart({ points, aKey, bKey, aLabel, bLabel }: { points: Array<Record<string, number | string>>; aKey: string; bKey: string; aLabel: string; bLabel: string }) {
  const w = 600, h = 160, pad = 24;
  const n = points.length;
  const max = (k: string) => Math.max(1, ...points.map((p) => Number(p[k])));
  const line = (k: string) => points.map((p, i) => `${pad + (i * (w - 2 * pad)) / Math.max(1, n - 1)},${h - pad - (Number(p[k]) / max(k)) * (h - 2 * pad)}`).join(' ');
  return (
    <figure className="card-static">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto" role="img" aria-label={`${aLabel}, ${bLabel}`}>
        <line x1={pad} y1={h - pad} x2={w - pad} y2={h - pad} stroke="#E3E8F5" />
        <polyline fill="none" stroke="#3B82F6" strokeWidth="2.5" points={line(aKey)} />
        <polyline fill="none" stroke="#22D3EE" strokeWidth="2.5" points={line(bKey)} />
      </svg>
      <figcaption className="meta flex gap-4 mt-2"><span><span className="inline-block w-3 h-3 rounded-full align-middle mr-1" style={{ background: '#3B82F6' }} />{aLabel} (max {max(aKey)})</span><span><span className="inline-block w-3 h-3 rounded-full align-middle mr-1" style={{ background: '#22D3EE' }} />{bLabel} (max ₹{max(bKey)})</span></figcaption>
    </figure>
  );
}
