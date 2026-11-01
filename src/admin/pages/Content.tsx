import { useState } from 'react';
import { useLang } from '@/lib/hooks';
import { adminApi, fmtDate, useFetch } from '../api';
import { DataTable, Pager, StatusPill, inputCls } from '../ui';

interface Ch { file: string; id: string; class: string; medium: string; subjectId: string; chapterNumber: number; title: string; status: string; source: string; lastReviewed: string; reviewer: string; objective: number; important: number }
interface Rep { id: string; at: string; phone: string | null; page: string; refId: string; message: string; status: 'open' | 'resolved'; reply: string | null }

function JsonEditor({ file, onClose }: { file: string; onClose: () => void }) {
  const { t } = useLang();
  const { data, loading } = useFetch(() => adminApi<{ body: unknown }>(`/content/file/${encodeURIComponent(file)}`), [file]);
  const [text, setText] = useState<string | null>(null); const [msg, setMsg] = useState(''); const [errs, setErrs] = useState<string[]>([]);
  const value = text ?? (data ? JSON.stringify(data.body, null, 2) : '');
  const save = async () => { setErrs([]); setMsg(''); let body: unknown; try { body = JSON.parse(value); } catch { setErrs(['invalid JSON']); return; } try { await adminApi(`/content/file/${encodeURIComponent(file)}`, { body }, 'PUT'); setMsg(t('admin.content.rebuild')); } catch (e) { setErrs((e as { errors?: string[] }).errors ?? [(e as Error).message]); } };
  return (
    <div className="card-static space-y-2">
      <div className="flex items-center gap-2"><h2 className="h2 flex-1 font-mono text-[15px]">{file}</h2><button type="button" className="btn-ghost btn-sm" onClick={onClose}>{t('action.close')}</button></div>
      {loading && !data ? <p className="meta">{t('admin.loading')}</p> : <textarea className="card w-full p-3 font-mono text-[13px] min-h-[320px]" value={value} onChange={(e) => setText(e.target.value)} spellCheck={false} />}
      {errs.length > 0 && <ul className="error-line list-disc pl-5">{errs.map((e) => <li key={e}>{e}</li>)}</ul>}
      {msg && <p className="badge-free" role="status">{msg}</p>}
      <button type="button" className="btn-primary btn-sm" onClick={save}>{t('admin.save')}</button>
    </div>
  );
}

export default function Content() {
  const { t } = useLang();
  const [tab, setTab] = useState<'chapters' | 'papers' | 'syllabus' | 'reports'>('reports');
  const chapters = useFetch(() => adminApi<{ rows: Ch[] }>('/content/chapters'), [tab]);
  const syllabus = useFetch(() => adminApi<{ subjects: Array<{ id: string; class: string; codes: string[]; name: { hi: string; en: string }; chapterCount: number; status: string }> }>('/content/syllabus'), [tab]);
  const [rstatus, setRstatus] = useState('open'); const [rpage, setRpage] = useState(1);
  const reports = useFetch(() => adminApi<{ rows: Rep[]; total: number; perPage: number }>(`/reports?status=${rstatus}&page=${rpage}`), [rstatus, rpage, tab]);
  const [file, setFile] = useState<string | null>(null); const [reply, setReply] = useState<Record<string, string>>({});
  const tabs = [['reports', t('admin.content.reports')], ['chapters', t('admin.content.chapters')], ['papers', t('admin.content.papers')], ['syllabus', t('admin.content.syllabus')]] as const;
  return (
    <div className="space-y-3">
      <h1 className="h1">{t('admin.content')}</h1>
      <div className="flex flex-wrap gap-2">{tabs.map(([k, l]) => <button key={k} type="button" className={`chip ${tab === k ? 'selected' : ''}`} aria-pressed={tab === k} onClick={() => { setTab(k); setFile(null); }}>{l}</button>)}</div>
      {tab === 'reports' && (
        <>
          <div className="flex gap-2">{(['open', 'resolved'] as const).map((s) => <button key={s} type="button" className={`chip ${rstatus === s ? 'selected' : ''}`} onClick={() => { setRstatus(s); setRpage(1); }}>{t(`admin.content.${s}`)}</button>)}</div>
          <DataTable<Rep> columns={[
            { key: 'at', label: t('admin.audit.when'), render: (r) => <span>{fmtDate(r.at)}<span className="meta block">{r.phone ?? '—'}</span></span> },
            { key: 'message', label: t('student.report.title'), render: (r) => <span>{r.message}<span className="meta block font-mono">{r.refId} · {r.page}</span>{r.reply ? <span className="meta block">↳ {r.reply}</span> : null}</span> },
            { key: 'x', label: '', render: (r) => <span className="flex flex-col gap-1 min-w-[160px]"><input className={inputCls} placeholder={t('admin.content.reply')} value={reply[r.id] ?? ''} onChange={(e) => setReply({ ...reply, [r.id]: e.target.value })} /><button type="button" className="btn-secondary btn-sm" onClick={async () => { await adminApi(`/reports/${r.id}`, { status: r.status === 'open' ? 'resolved' : 'open', reply: reply[r.id] ?? r.reply }, 'PUT'); reports.reload(); }}>{r.status === 'open' ? t('admin.content.resolve') : t('admin.content.reopen')}</button></span> },
          ]} rows={reports.data?.rows ?? null} loading={reports.loading} error={reports.error} onRetry={reports.reload} />
          {reports.data && <Pager page={rpage} total={reports.data.total} perPage={reports.data.perPage} onPage={setRpage} />}
        </>
      )}
      {tab === 'chapters' && (
        <>
          {file && <JsonEditor file={file} onClose={() => setFile(null)} />}
          <DataTable<Ch> columns={[
            { key: 'title', label: t('subject.chapter'), render: (r) => <span>{r.chapterNumber}. {r.title}<span className="meta block font-mono">{r.file}</span></span> },
            { key: 'status', label: t('admin.user.planStatus'), render: (r) => <span><StatusPill s={r.status} /><span className="meta block">{r.lastReviewed} · {r.reviewer}</span></span> },
            { key: 'objective', label: t('subject.objective'), render: (r) => `${r.objective} / ${r.important}` },
            { key: 'x', label: '', render: (r) => <button type="button" className="btn-ghost btn-sm" onClick={() => setFile(r.file)}>{t('admin.content.json')}</button> },
          ]} rows={chapters.data?.rows.map((r) => ({ ...r, id: r.file })) ?? null} loading={chapters.loading} error={chapters.error} onRetry={chapters.reload} />
        </>
      )}
      {tab === 'papers' && <JsonEditor file="papers.json" onClose={() => setTab('reports')} />}
      {tab === 'syllabus' && (
        <DataTable columns={[
          { key: 'name', label: t('nav.subjects'), render: (r: { name: { hi: string; en: string }; class: string; codes: string[] }) => `${r.name.hi} / ${r.name.en} · ${r.class} · ${r.codes.join('/')}` },
          { key: 'chapterCount', label: t('subject.chapters') },
          { key: 'status', label: t('admin.user.planStatus'), render: (r: { status: string }) => <span className={r.status === 'gap' ? 'badge-sample' : 'badge-free'}>{r.status}</span> },
        ]} rows={syllabus.data?.subjects.map((s) => ({ ...s, id: s.class + s.id })) ?? null} loading={syllabus.loading} error={syllabus.error} onRetry={syllabus.reload} />
      )}
    </div>
  );
}
