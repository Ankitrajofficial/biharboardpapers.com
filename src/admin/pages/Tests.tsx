import { useState } from 'react';
import { Link } from 'react-router';
import { useLang } from '@/lib/hooks';
import { adminApi, fmtDate, useFetch } from '../api';
import { BiInput, Confirm, DataTable, Field, StatusPill, selectCls } from '../ui';
import { subjects } from '@/data/subjects';

type Bi = { hi: string; en: string };
export interface Series { id: string; title: Bi; description: Bi; class: 'class-10' | 'class-12'; stream: string; subjectIds: string[]; medium: string; access: 'free' | 'plan'; plans: string[]; color: string; tests?: number }
interface TestRow { id: string; seriesId: string; title: Bi; type: string; liveStatus: string; startAt: string | null; endAt: string | null; totalQuestions: number; questionIds: string[]; attempts: number }
const blankSeries = (): Partial<Series> => ({ title: { hi: '', en: '' }, description: { hi: '', en: '' }, class: 'class-12', stream: 'all', subjectIds: [], medium: 'both', access: 'free', plans: [], color: 'blue' });

function SeriesForm({ init, onDone }: { init: Partial<Series>; onDone: () => void }) {
  const { t, p } = useLang();
  const [s, setS] = useState(init); const [errs, setErrs] = useState<string[]>([]);
  const save = async () => { setErrs([]); try { if (s.id) await adminApi(`/series/${s.id}`, s, 'PUT'); else await adminApi('/series', s); onDone(); } catch (e) { setErrs((e as { errors?: string[] }).errors ?? [(e as Error).message]); } };
  const subj = subjects.filter((x) => x.class === s.class);
  return (
    <form className="card-static space-y-3" onSubmit={(e) => { e.preventDefault(); save(); }} data-testid="series-form">
      <BiInput label="Title" value={s.title!} onChange={(title) => setS({ ...s, title })} />
      <BiInput label="Description" value={s.description!} onChange={(description) => setS({ ...s, description })} multiline />
      <div className="grid sm:grid-cols-3 gap-2">
        <Field label={t('papers.filter.class')}><select className={selectCls} value={s.class} onChange={(e) => setS({ ...s, class: e.target.value as Series['class'], subjectIds: [] })}><option value="class-10">10</option><option value="class-12">12</option></select></Field>
        <Field label={t('choose.stream.title')}><select className={selectCls} value={s.stream} onChange={(e) => setS({ ...s, stream: e.target.value })}><option value="all">{t('admin.all')}</option><option value="arts">{t('stream.arts')}</option><option value="science">{t('stream.science')}</option><option value="commerce">{t('stream.commerce')}</option></select></Field>
        <Field label={t('medium.hindi')}><select className={selectCls} value={s.medium} onChange={(e) => setS({ ...s, medium: e.target.value })}><option value="both">हिंदी + English</option><option value="hindi">हिंदी</option><option value="english">English</option></select></Field>
        <Field label={t('admin.series.access')}><select className={selectCls} value={s.access} onChange={(e) => setS({ ...s, access: e.target.value as 'free' | 'plan' })}><option value="free">{t('admin.series.free')}</option><option value="plan">{t('admin.series.plan')}</option></select></Field>
        {s.access === 'plan' && <Field label={t('admin.user.plan')}><div className="flex gap-2 flex-wrap">{['matric', 'inter', 'all'].map((pl) => <label key={pl} className="chip"><input type="checkbox" className="mr-1" checked={s.plans!.includes(pl)} onChange={(e) => setS({ ...s, plans: e.target.checked ? [...s.plans!, pl] : s.plans!.filter((x) => x !== pl) })} />{pl}</label>)}</div></Field>}
        <Field label={t('admin.series.color')}><select className={selectCls} value={s.color} onChange={(e) => setS({ ...s, color: e.target.value })}>{['blue', 'mint', 'pink', 'violet', 'indigo', 'cyan'].map((c) => <option key={c} value={c}>{c}</option>)}</select></Field>
      </div>
      <Field label={t('nav.subjects')}><div className="flex gap-2 flex-wrap">{subj.map((x) => <label key={x.id} className={`chip ${s.subjectIds!.includes(x.id) ? 'selected' : ''}`}><input type="checkbox" className="sr-only" checked={s.subjectIds!.includes(x.id)} onChange={(e) => setS({ ...s, subjectIds: e.target.checked ? [...s.subjectIds!, x.id] : s.subjectIds!.filter((y) => y !== x.id) })} />{p(x.name)}</label>)}</div></Field>
      {errs.length > 0 && <ul className="error-line list-disc pl-5" role="alert">{errs.map((e) => <li key={e}>{e}</li>)}</ul>}
      <div className="flex gap-2"><button type="submit" className="btn-primary btn-sm" data-testid="series-save">{t('admin.save')}</button><button type="button" className="btn-ghost btn-sm" onClick={onDone}>{t('admin.cancel')}</button></div>
    </form>
  );
}

export default function Tests() {
  const { t, p } = useLang();
  const series = useFetch(() => adminApi<{ rows: Series[] }>('/series'), []);
  const tests = useFetch(() => adminApi<{ rows: TestRow[] }>('/tests'), []);
  const [edit, setEdit] = useState<Partial<Series> | null>(null); const [del, setDel] = useState<Series | null>(null); const [err, setErr] = useState('');
  const reload = () => { series.reload(); tests.reload(); };
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2"><h1 className="h1 flex-1">{t('admin.tests')}</h1>
        <Link to="/admin/questions" className="btn-secondary btn-sm">{t('admin.q.bank')}</Link>
        <button type="button" className="btn-primary btn-sm" onClick={() => setEdit(blankSeries())} data-testid="series-new">{t('admin.series.new')}</button></div>
      {edit && <SeriesForm init={edit} onDone={() => { setEdit(null); reload(); }} />}
      {err && <p className="error-line">{err}</p>}
      <DataTable<Series> columns={[
        { key: 'title', label: t('admin.series'), render: (r) => <span><strong>{p(r.title)}</strong><span className="meta block">{r.class} · {r.stream} · {r.medium} · {r.access === 'free' ? t('admin.series.free') : `${t('admin.series.plan')}: ${r.plans.join(', ')}`}</span></span> },
        { key: 'tests', label: t('admin.tests') },
        { key: 'x', label: '', render: (r) => <span className="flex gap-1"><Link to={`/admin/tests/new?series=${r.id}`} className="btn-secondary btn-sm" data-testid={`test-new-${r.id}`}>{t('admin.test.new')}</Link><button type="button" className="btn-ghost btn-sm" onClick={() => setEdit(r)}>{t('admin.edit')}</button><button type="button" className="btn-ghost btn-sm btn-danger" onClick={() => setDel(r)}>{t('admin.delete')}</button></span> },
      ]} rows={series.data?.rows ?? null} loading={series.loading} error={series.error} onRetry={reload} />
      <h2 className="h2">{t('admin.tests')}</h2>
      <DataTable<TestRow> columns={[
        { key: 'title', label: t('admin.tests'), render: (r) => <Link className="link" to={`/admin/tests/${r.id}`}>{p(r.title)}</Link> },
        { key: 'type', label: t('admin.test.type'), render: (r) => t(`admin.test.${r.type}` as 'admin.test.chapter') },
        { key: 'liveStatus', label: t('admin.user.planStatus'), render: (r) => <span><StatusPill s={r.liveStatus} />{r.startAt ? <span className="meta block">{fmtDate(r.startAt)} → {fmtDate(r.endAt)}</span> : null}</span> },
        { key: 'questionIds', label: t('admin.test.questions'), render: (r) => `${r.questionIds.length}/${r.totalQuestions}` },
        { key: 'attempts', label: t('admin.test.attempts') },
      ]} rows={tests.data?.rows ?? null} loading={tests.loading} error={tests.error} onRetry={reload} />
      <Confirm open={!!del} name={del ? p(del.title) : ''} onCancel={() => setDel(null)} onConfirm={async () => { try { await adminApi(`/series/${del!.id}`, undefined, 'DELETE'); } catch (e) { setErr((e as Error).message); } setDel(null); reload(); }} />
    </div>
  );
}
