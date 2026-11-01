import { useRef, useState } from 'react';
import { useLang } from '@/lib/hooks';
import { adminApi, adminDownload, useFetch } from '../api';
import { BiInput, Confirm, DataTable, Field, Pager, StatusPill, inputCls, selectCls } from '../ui';
import { subjects } from '@/data/subjects';
import { MathText } from '@/components/MathText';

type Bi = { hi: string; en: string };
export interface Q { id: string; question: Bi; options: { hi: string[]; en: string[] }; answer: number; explanation: Bi; class: 'class-10' | 'class-12'; subjectId: string; chapter: string | null; difficulty: 'easy' | 'medium' | 'hard'; source: { type: 'sample' | 'pyq_pattern' | 'official_model_paper'; citation: string | null }; status: 'draft' | 'reviewed' }
const blank = (): Partial<Q> => ({ question: { hi: '', en: '' }, options: { hi: ['', '', '', ''], en: ['', '', '', ''] }, answer: 0, explanation: { hi: '', en: '' }, class: 'class-12', subjectId: 'physics', chapter: '', difficulty: 'medium', source: { type: 'sample', citation: '' }, status: 'draft' });
const L = ['A', 'B', 'C', 'D'];

export function QuestionForm({ init, onDone }: { init: Partial<Q>; onDone: (q?: Q) => void }) {
  const { t, p } = useLang();
  const [q, setQ] = useState<Partial<Q>>(init); const [errs, setErrs] = useState<string[]>([]);
  const save = async () => { setErrs([]); try { const r = q.id ? await adminApi<{ question: Q }>(`/questions/${q.id}`, q, 'PUT') : await adminApi<{ question: Q }>('/questions', q); onDone(r.question); } catch (e) { setErrs((e as { errors?: string[] }).errors ?? [(e as Error).message]); } };
  const setOpt = (l: 'hi' | 'en', i: number, v: string) => { const o = { hi: [...q.options!.hi], en: [...q.options!.en] }; o[l][i] = v; setQ({ ...q, options: o }); };
  return (
    <form className="card-static space-y-3" onSubmit={(e) => { e.preventDefault(); save(); }} data-testid="question-form">
      <BiInput label={t('objective.question')} value={q.question!} onChange={(question) => setQ({ ...q, question })} multiline hint={t('admin.q.mathHint')} />
      <div className="grid sm:grid-cols-2 gap-2">
        {(['hi', 'en'] as const).map((l) => (
          <div key={l} className="space-y-1">{L.map((letter, i) => <label key={letter} className="flex items-center gap-2"><input type="radio" name="answer" className="w-5 h-5" checked={q.answer === i} onChange={() => setQ({ ...q, answer: i })} aria-label={`${t('admin.q.answer')} ${letter}`} /><span className="option-letter">{letter}</span><input className={inputCls} lang={l} value={q.options![l][i]} onChange={(e) => setOpt(l, i, e.target.value)} placeholder={l === 'hi' ? 'विकल्प' : 'Option'} /></label>)}</div>
        ))}
      </div>
      <BiInput label={t('admin.q.explanation')} value={q.explanation!} onChange={(explanation) => setQ({ ...q, explanation })} multiline />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Field label={t('papers.filter.class')}><select className={selectCls} value={q.class} onChange={(e) => setQ({ ...q, class: e.target.value as Q['class'] })}><option value="class-10">10</option><option value="class-12">12</option></select></Field>
        <Field label={t('nav.subjects')}><select className={selectCls} value={q.subjectId} onChange={(e) => setQ({ ...q, subjectId: e.target.value })}>{subjects.filter((s) => s.class === q.class).map((s) => <option key={s.id} value={s.id}>{p(s.name)}</option>)}</select></Field>
        <Field label={t('admin.q.chapter')}><input className={inputCls} value={q.chapter ?? ''} onChange={(e) => setQ({ ...q, chapter: e.target.value })} /></Field>
        <Field label={t('admin.q.difficulty')}><select className={selectCls} value={q.difficulty} onChange={(e) => setQ({ ...q, difficulty: e.target.value as Q['difficulty'] })}><option value="easy">{t('admin.q.easy')}</option><option value="medium">{t('admin.q.medium')}</option><option value="hard">{t('admin.q.hard')}</option></select></Field>
        <Field label={t('admin.q.source')}><select className={selectCls} value={q.source!.type} onChange={(e) => setQ({ ...q, source: { ...q.source!, type: e.target.value as Q['source']['type'] } })}><option value="sample">{t('admin.q.sample')}</option><option value="pyq_pattern">{t('admin.q.pyq')}</option><option value="official_model_paper">{t('admin.q.official')}</option></select></Field>
        <Field label={t('admin.q.citation')}><input className={inputCls} value={q.source!.citation ?? ''} onChange={(e) => setQ({ ...q, source: { ...q.source!, citation: e.target.value } })} /></Field>
        <Field label={t('admin.user.planStatus')}><select className={selectCls} value={q.status} onChange={(e) => setQ({ ...q, status: e.target.value as Q['status'] })}><option value="draft">{t('admin.status.draft')}</option><option value="reviewed">{t('admin.q.reviewed')}</option></select></Field>
      </div>
      {errs.length > 0 && <ul className="error-line list-disc pl-5" role="alert">{errs.map((e) => <li key={e}>{e}</li>)}</ul>}
      <div className="flex gap-2"><button type="submit" className="btn-primary btn-sm" data-testid="question-save">{t('admin.save')}</button><button type="button" className="btn-ghost btn-sm" onClick={() => onDone()}>{t('admin.cancel')}</button></div>
    </form>
  );
}

function Import({ onDone }: { onDone: () => void }) {
  const { t } = useLang();
  const [csv, setCsv] = useState(''); const [rows, setRows] = useState<Array<{ row: number; errors: string[]; question?: Q }> | null>(null); const [msg, setMsg] = useState('');
  const file = useRef<HTMLInputElement>(null);
  const preview = async (commit = false) => { const r = await adminApi<{ rows: typeof rows; saved: number }>('/questions/import', { csv, commit }); setRows(r.rows); if (commit) { setMsg(`${r.saved} ${t('admin.saved')}`); if (r.saved) onDone(); } };
  const ok = rows && rows.every((r) => !r.errors.length);
  return (
    <div className="card-static space-y-3" data-testid="import-panel">
      <div className="flex flex-wrap gap-2"><button type="button" className="btn-secondary btn-sm" onClick={() => adminDownload('/questions/template.csv', 'questions-template.csv')}>{t('admin.q.template')}</button><input ref={file} type="file" accept=".csv,text/csv" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if (f) setCsv(await f.text()); }} /><button type="button" className="btn-secondary btn-sm" onClick={() => file.current?.click()}>CSV…</button></div>
      <textarea className="card w-full p-3 font-mono text-[13px] min-h-[120px]" value={csv} onChange={(e) => setCsv(e.target.value)} placeholder="class,subjectId,chapter,question_hi,…" data-testid="import-csv" />
      <div className="flex gap-2"><button type="button" className="btn-secondary btn-sm" disabled={!csv.trim()} onClick={() => preview(false)} data-testid="import-preview">{t('admin.q.preview')}</button><button type="button" className="btn-primary btn-sm" disabled={!ok} onClick={() => preview(true)} data-testid="import-save">{t('admin.q.saveAll')}</button></div>
      {msg && <p className="badge-free" role="status">{msg}</p>}
      {rows && (
        <ul className="space-y-1 text-[14px]" data-testid="import-rows">
          {ok && <li className="badge-free">{t('admin.q.allOk')} ({rows.length})</li>}
          {rows.map((r) => <li key={r.row} className={r.errors.length ? 'error-line' : 'meta'}>{t('admin.q.rowErrors', { n: r.row })}: {r.errors.length ? r.errors.join('; ') : (r.question?.question.en || r.question?.question.hi)}</li>)}
        </ul>
      )}
    </div>
  );
}

export function QuestionBank({ onPick, picked }: { onPick?: (q: Q) => void; picked?: Set<string> }) {
  const { t, p } = useLang();
  const [f, setF] = useState({ q: '', class: '', subjectId: '', chapter: '', difficulty: '', status: '' }); const [page, setPage] = useState(1);
  const [edit, setEdit] = useState<Partial<Q> | null>(null); const [imp, setImp] = useState(false); const [del, setDel] = useState<Q | null>(null); const [err, setErr] = useState('');
  const qs = new URLSearchParams({ ...f, page: String(page) }).toString();
  const { data, loading, error, reload } = useFetch(() => adminApi<{ rows: Q[]; total: number; perPage: number }>(`/questions?${qs}`), [qs]);
  const set = (k: string, v: string) => { setF({ ...f, [k]: v }); setPage(1); };
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2"><h2 className="h2 flex-1">{t('admin.q.bank')}</h2><button type="button" className="btn-secondary btn-sm" onClick={() => setImp(!imp)}>{t('admin.q.import')}</button><button type="button" className="btn-primary btn-sm" onClick={() => setEdit(blank())} data-testid="question-new">{t('admin.q.new')}</button></div>
      {imp && <Import onDone={() => { setImp(false); reload(); }} />}
      {edit && <QuestionForm init={edit} onDone={() => { setEdit(null); reload(); }} />}
      {err && <p className="error-line">{err}</p>}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
        <input className={inputCls + ' col-span-2'} placeholder={t('admin.search')} value={f.q} onChange={(e) => set('q', e.target.value)} />
        <select className={selectCls} value={f.class} onChange={(e) => set('class', e.target.value)}><option value="">{t('papers.filter.class')}</option><option value="class-10">10</option><option value="class-12">12</option></select>
        <select className={selectCls} value={f.subjectId} onChange={(e) => set('subjectId', e.target.value)}><option value="">{t('nav.subjects')}</option>{subjects.filter((s) => !f.class || s.class === f.class).map((s) => <option key={s.class + s.id} value={s.id}>{p(s.name)}</option>)}</select>
        <select className={selectCls} value={f.difficulty} onChange={(e) => set('difficulty', e.target.value)}><option value="">{t('admin.q.difficulty')}</option><option value="easy">{t('admin.q.easy')}</option><option value="medium">{t('admin.q.medium')}</option><option value="hard">{t('admin.q.hard')}</option></select>
        <select className={selectCls} value={f.status} onChange={(e) => set('status', e.target.value)}><option value="">{t('admin.user.planStatus')}</option><option value="draft">{t('admin.status.draft')}</option><option value="reviewed">{t('admin.q.reviewed')}</option></select>
      </div>
      <DataTable<Q> columns={[
        { key: 'question', label: t('objective.question'), render: (r) => <span><MathText text={r.question.hi || r.question.en} /><span className="meta block">{r.class} · {r.subjectId}{r.chapter ? ` · ${r.chapter}` : ''} · {t(`admin.q.${r.difficulty}`)} · {r.source.type}{r.source.citation ? ` (${r.source.citation})` : ''} · ✓ {L[r.answer]}</span></span> },
        { key: 'status', label: '', render: (r) => <StatusPill s={r.status} /> },
        { key: 'x', label: '', render: (r) => <span className="flex gap-1">{onPick && <button type="button" className={`btn-sm ${picked?.has(r.id) ? 'btn-secondary' : 'btn-primary'}`} onClick={() => onPick(r)} data-testid={`pick-${r.id}`}>{picked?.has(r.id) ? '✓' : '+'}</button>}<button type="button" className="btn-ghost btn-sm" onClick={() => setEdit(r)}>{t('admin.edit')}</button><button type="button" className="btn-ghost btn-sm btn-danger" onClick={() => setDel(r)}>{t('admin.delete')}</button></span> },
      ]} rows={data?.rows ?? null} loading={loading} error={error} onRetry={reload} />
      {data && <Pager page={page} total={data.total} perPage={data.perPage} onPage={setPage} />}
      <Confirm open={!!del} name={del ? (del.question.en || del.question.hi).slice(0, 60) : ''} onCancel={() => setDel(null)} onConfirm={async () => { try { await adminApi(`/questions/${del!.id}`, undefined, 'DELETE'); } catch (e) { setErr((e as { errors?: string[] }).errors?.join('; ') ?? (e as Error).message); } setDel(null); reload(); }} />
    </div>
  );
}

export default function QuestionsPage() { return <QuestionBank />; }
