import { useState } from 'react';
import { useLang } from '@/lib/hooks';
import { adminApi, fmtDate, fromLocalInput, toLocalInput, useFetch } from '../api';
import { BiInput, Confirm, DataTable, Field, StatusPill, inputCls, selectCls } from '../ui';

type Bi = { hi: string; en: string };
interface Upd { id: string; title: Bi; text: Bi; category: string; class: string; link: string | null; attachment: { url: string; kind: 'image' | 'pdf' } | null; pinned: boolean; important: boolean; source: string; status: 'draft' | 'published'; publishAt: string | null; expiresAt: string | null; notifiedAt: string | null; state: string; updatedAt: string }
interface ExamRow { id: string; class: string; subject: string | null; date: string; shift: string | null; status: 'official' | 'expected'; note: string | null; sourceUrl: string | null }
const blank = (): Partial<Upd> => ({ title: { hi: '', en: '' }, text: { hi: '', en: '' }, category: 'notice', class: 'both', link: '', attachment: null, pinned: false, important: false, source: '', status: 'draft', publishAt: null, expiresAt: null });

function UpdateForm({ init, onDone }: { init: Partial<Upd>; onDone: () => void }) {
  const { t } = useLang();
  const [u, setU] = useState<Partial<Upd>>(init); const [errs, setErrs] = useState<string[]>([]); const [busy, setBusy] = useState(false);
  const save = async (status: 'draft' | 'published') => {
    setBusy(true); setErrs([]);
    try { const body = { ...u, status, attachment: u.attachment?.url ? u.attachment : null }; if (u.id) await adminApi(`/updates/${u.id}`, body, 'PUT'); else await adminApi('/updates', body); onDone(); }
    catch (e) { setErrs((e as { errors?: string[] }).errors?.length ? (e as { errors: string[] }).errors : [(e as Error).message]); }
    finally { setBusy(false); }
  };
  const cats = ['exam_date', 'admit_card', 'result', 'model_paper', 'notice', 'site_update'] as const;
  return (
    <form className="card-static space-y-3" onSubmit={(e) => { e.preventDefault(); save(u.status ?? 'draft'); }} data-testid="update-form">
      <BiInput label={t('subject.chapter') === '' ? '' : 'Title'} value={u.title!} onChange={(title) => setU({ ...u, title })} />
      <BiInput label="Text" value={u.text!} onChange={(text) => setU({ ...u, text })} multiline />
      <div className="grid sm:grid-cols-3 gap-2">
        <Field label={t('admin.upd.category')}><select className={selectCls} value={u.category} onChange={(e) => setU({ ...u, category: e.target.value })}>{cats.map((c) => <option key={c} value={c}>{t(`admin.upd.${c}`)}</option>)}</select></Field>
        <Field label={t('papers.filter.class')}><select className={selectCls} value={u.class} onChange={(e) => setU({ ...u, class: e.target.value })}><option value="both">10 + 12</option><option value="class-10">10</option><option value="class-12">12</option></select></Field>
        <Field label={t('admin.upd.source')}><input className={inputCls} value={u.source ?? ''} onChange={(e) => setU({ ...u, source: e.target.value })} data-testid="update-source" /></Field>
        <Field label={t('admin.upd.link')}><input className={inputCls} type="url" value={u.link ?? ''} onChange={(e) => setU({ ...u, link: e.target.value })} placeholder="https://biharboardonline.bihar.gov.in/…" /></Field>
        <Field label={t('admin.upd.attachment')}><input className={inputCls} type="url" value={u.attachment?.url ?? ''} onChange={(e) => setU({ ...u, attachment: e.target.value ? { url: e.target.value, kind: /\.pdf($|\?)/i.test(e.target.value) ? 'pdf' : 'image' } : null })} /></Field>
        <div className="flex items-end gap-4">
          <label className="flex items-center gap-2 min-h-12"><input type="checkbox" className="w-5 h-5" checked={!!u.pinned} onChange={(e) => setU({ ...u, pinned: e.target.checked })} /> {t('admin.upd.pin')}</label>
          <label className="flex items-center gap-2 min-h-12"><input type="checkbox" className="w-5 h-5" checked={!!u.important} onChange={(e) => setU({ ...u, important: e.target.checked })} /> {t('admin.upd.important')}</label>
        </div>
        <Field label={t('admin.upd.publishAt')}><input className={inputCls} type="datetime-local" value={toLocalInput(u.publishAt ?? null)} onChange={(e) => setU({ ...u, publishAt: fromLocalInput(e.target.value) })} /></Field>
        <Field label={t('admin.upd.expiresAt')}><input className={inputCls} type="datetime-local" value={toLocalInput(u.expiresAt ?? null)} onChange={(e) => setU({ ...u, expiresAt: fromLocalInput(e.target.value) })} /></Field>
      </div>
      {errs.length > 0 && <ul className="error-line list-disc pl-5" role="alert">{errs.map((e) => <li key={e}>{e}</li>)}</ul>}
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn-secondary btn-sm" disabled={busy} onClick={() => save('draft')}>{t('admin.status.draft')}</button>
        <button type="button" className="btn-primary btn-sm" disabled={busy} onClick={() => save('published')} data-testid="update-publish">{t('admin.upd.publish')}</button>
        <button type="button" className="btn-ghost btn-sm" onClick={onDone}>{t('admin.cancel')}</button>
      </div>
    </form>
  );
}

function Calendar() {
  const { t } = useLang();
  const { data, loading, error, reload } = useFetch(() => adminApi<{ rows: ExamRow[] }>('/calendar'), []);
  const [row, setRow] = useState<Partial<ExamRow> | null>(null); const [errs, setErrs] = useState<string[]>([]); const [del, setDel] = useState<ExamRow | null>(null);
  const save = async () => { setErrs([]); try { if (row!.id) await adminApi(`/calendar/${row!.id}`, row, 'PUT'); else await adminApi('/calendar', row); setRow(null); reload(); } catch (e) { setErrs((e as { errors?: string[] }).errors ?? [(e as Error).message]); } };
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2"><h2 className="h2 flex-1">{t('admin.upd.calendar')}</h2><button type="button" className="btn-secondary btn-sm" onClick={() => setRow({ class: 'class-12', subject: '', date: '', shift: 'morning', status: 'expected', note: '', sourceUrl: '' })}>{t('admin.upd.addDate')}</button></div>
      {row && (
        <form className="card-static grid sm:grid-cols-3 gap-2" onSubmit={(e) => { e.preventDefault(); save(); }}>
          <Field label={t('papers.filter.class')}><select className={selectCls} value={row.class} onChange={(e) => setRow({ ...row, class: e.target.value })}><option value="class-10">10</option><option value="class-12">12</option></select></Field>
          <Field label={t('admin.upd.subject')}><input className={inputCls} value={row.subject ?? ''} onChange={(e) => setRow({ ...row, subject: e.target.value })} /></Field>
          <Field label={t('admin.upd.date')}><input className={inputCls} type="date" value={row.date ?? ''} onChange={(e) => setRow({ ...row, date: e.target.value })} /></Field>
          <Field label={t('admin.upd.shift')}><select className={selectCls} value={row.shift ?? ''} onChange={(e) => setRow({ ...row, shift: e.target.value || null })}><option value="morning">{t('admin.upd.morning')}</option><option value="afternoon">{t('admin.upd.afternoon')}</option><option value="">—</option></select></Field>
          <Field label={t('home.countdown.official')}><select className={selectCls} value={row.status} onChange={(e) => setRow({ ...row, status: e.target.value as 'official' | 'expected' })}><option value="expected">{t('home.countdown.expected')}</option><option value="official">{t('home.countdown.official')}</option></select></Field>
          <Field label={t('syllabus.source')}><input className={inputCls} type="url" value={row.sourceUrl ?? ''} onChange={(e) => setRow({ ...row, sourceUrl: e.target.value })} /></Field>
          {errs.length > 0 && <ul className="error-line sm:col-span-3 list-disc pl-5">{errs.map((e) => <li key={e}>{e}</li>)}</ul>}
          <div className="flex gap-2 sm:col-span-3"><button type="submit" className="btn-primary btn-sm">{t('admin.save')}</button><button type="button" className="btn-ghost btn-sm" onClick={() => setRow(null)}>{t('admin.cancel')}</button></div>
        </form>
      )}
      <DataTable<ExamRow> columns={[
        { key: 'class', label: t('papers.filter.class') }, { key: 'subject', label: t('admin.upd.subject') }, { key: 'date', label: t('admin.upd.date') }, { key: 'shift', label: t('admin.upd.shift') },
        { key: 'status', label: t('home.countdown.official'), render: (r) => <span className={r.status === 'official' ? 'badge-free' : 'badge-sample'}>{r.status}</span> },
        { key: 'x', label: '', render: (r) => <span className="flex gap-1"><button type="button" className="btn-ghost btn-sm" onClick={() => setRow(r)}>{t('admin.edit')}</button><button type="button" className="btn-ghost btn-sm btn-danger" onClick={() => setDel(r)}>{t('admin.delete')}</button></span> },
      ]} rows={data?.rows ?? null} loading={loading} error={error} onRetry={reload} />
      <Confirm open={!!del} name={`${del?.class} ${del?.date}`} onCancel={() => setDel(null)} onConfirm={async () => { await adminApi(`/calendar/${del!.id}`, undefined, 'DELETE'); setDel(null); reload(); }} />
    </section>
  );
}

export default function Updates() {
  const { t, p } = useLang();
  const { data, loading, error, reload } = useFetch(() => adminApi<{ rows: Upd[] }>('/updates'), []);
  const [edit, setEdit] = useState<Partial<Upd> | null>(null); const [del, setDel] = useState<Upd | null>(null); const [msg, setMsg] = useState('');
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2"><h1 className="h1 flex-1">{t('admin.updates')}</h1><button type="button" className="btn-primary btn-sm" onClick={() => setEdit(blank())} data-testid="update-new">{t('admin.upd.new')}</button></div>
      {edit && <UpdateForm init={edit} onDone={() => { setEdit(null); reload(); }} />}
      {msg && <p className="meta" role="status">{msg}</p>}
      <DataTable<Upd> columns={[
        { key: 'title', label: t('admin.updates'), render: (r) => <span>{r.pinned ? '📌 ' : ''}{r.important ? '❗ ' : ''}{p(r.title)}<span className="meta block">{t(`admin.upd.${r.category}` as 'admin.upd.notice')} · {r.class} · {r.source}</span></span> },
        { key: 'state', label: t('admin.user.planStatus'), render: (r) => <span><StatusPill s={r.state} />{r.publishAt ? <span className="meta block">{fmtDate(r.publishAt)}</span> : null}</span> },
        { key: 'x', label: '', render: (r) => <span className="flex flex-wrap gap-1"><button type="button" className="btn-ghost btn-sm" onClick={() => setEdit(r)}>{t('admin.edit')}</button>{r.important && r.state === 'published' && <button type="button" className="btn-ghost btn-sm" onClick={async () => { const j = await adminApi<{ job: { count: number; scheduledAt: string } }>(`/updates/${r.id}/notify`, {}); setMsg(`WhatsApp: ${j.job.count} · ${fmtDate(j.job.scheduledAt)}`); }}>WhatsApp</button>}<button type="button" className="btn-ghost btn-sm btn-danger" onClick={() => setDel(r)}>{t('admin.delete')}</button></span> },
      ]} rows={data?.rows ?? null} loading={loading} error={error} onRetry={reload} />
      <Confirm open={!!del} name={del ? p(del.title) : ''} onCancel={() => setDel(null)} onConfirm={async () => { await adminApi(`/updates/${del!.id}`, undefined, 'DELETE'); setDel(null); reload(); }} />
      <Calendar />
    </div>
  );
}
