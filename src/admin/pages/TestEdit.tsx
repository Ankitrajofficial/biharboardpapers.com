import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { useLang } from '@/lib/hooks';
import { adminApi, adminDownload, fmtDate, fromLocalInput, toLocalInput, useFetch } from '../api';
import { BiInput, Confirm, Field, StatusPill, inputCls, selectCls } from '../ui';
import { QuestionBank, type Q } from './Questions';
import { MathText } from '@/components/MathText';
import type { Series } from './Tests';

type Bi = { hi: string; en: string };
interface T { id?: string; seriesId: string; title: Bi; type: 'chapter' | 'full' | 'quick'; durationMin: number; totalQuestions: number; attemptLimit: number; marksPerQuestion: number; negativeMarks: number; instructions: Bi; questionIds: string[]; status: 'draft' | 'scheduled' | 'closed'; startAt: string | null; endAt: string | null; resultsVisible: 'instant' | 'after_end'; leaderboard: boolean; liveStatus?: string; notifiedAt?: string | null }
interface Results { attempts: number; average: number; maxMarks: number; distribution: Array<{ from: number; to: number; count: number }>; top: Array<{ attemptId: string; score: number; maxMarks: number; phoneMasked: string; name: string | null }>; perQuestion: Array<{ id: string; question: string; answered: number; right: number; accuracy: number | null }> }

export default function TestEdit() {
  const { t, p } = useLang();
  const { id } = useParams();
  const [sp] = useSearchParams();
  const nav = useNavigate();
  const isNew = id === 'new';
  const [tt, setTt] = useState<T | null>(isNew ? { seriesId: sp.get('series') ?? '', title: { hi: '', en: '' }, type: 'chapter', durationMin: 20, totalQuestions: 10, attemptLimit: 10, marksPerQuestion: 1, negativeMarks: 0, instructions: { hi: '', en: '' }, questionIds: [], status: 'draft', startAt: null, endAt: null, resultsVisible: 'instant', leaderboard: false } : null);
  const [qs, setQs] = useState<Q[]>([]); const [errs, setErrs] = useState<string[]>([]); const [msg, setMsg] = useState(''); const [tab, setTab] = useState<'edit' | 'questions' | 'preview' | 'results'>('edit'); const [del, setDel] = useState(false);
  const series = useFetch(() => adminApi<{ rows: Series[] }>('/series'), []);
  const results = useFetch(() => (isNew || tab !== 'results' ? Promise.resolve(null) : adminApi<Results>(`/tests/${id}/results`)), [id, tab]);
  useEffect(() => { if (!isNew) adminApi<{ test: T; questions: Q[] }>(`/tests/${id}`).then((r) => { setTt(r.test); setQs(r.questions); }).catch((e) => setErrs([(e as Error).message])); }, [id, isNew]);
  if (!tt) return <p className="meta">{t('admin.loading')}</p>;
  const save = async (status?: T['status']) => {
    setErrs([]); setMsg('');
    const body = { ...tt, status: status ?? tt.status, questionIds: qs.map((q) => q.id) };
    try { const r = tt.id ? await adminApi<{ test: T }>(`/tests/${tt.id}`, body, 'PUT') : await adminApi<{ test: T }>('/tests', body); setTt(r.test); setMsg(t('admin.saved')); if (!tt.id) nav(`/admin/tests/${r.test.id}`, { replace: true }); } catch (e) { setErrs((e as { errors?: string[] }).errors ?? [(e as Error).message]); }
  };
  const pick = (q: Q) => setQs((cur) => (cur.some((x) => x.id === q.id) ? cur.filter((x) => x.id !== q.id) : [...cur, q]));
  const picked = new Set(qs.map((q) => q.id));
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2"><Link to="/admin/tests" className="link text-[14px]">← {t('admin.tests')}</Link><h1 className="h1 flex-1">{tt.id ? p(tt.title) : t('admin.test.new')}</h1>{tt.liveStatus && <StatusPill s={tt.liveStatus} />}</div>
      <div className="flex flex-wrap gap-2">{(['edit', 'questions', 'preview', 'results'] as const).map((k) => <button key={k} type="button" className={`chip ${tab === k ? 'selected' : ''}`} onClick={() => setTab(k)} data-testid={`tab-${k}`}>{k === 'edit' ? t('admin.edit') : k === 'questions' ? `${t('admin.test.questions')} (${qs.length}/${tt.totalQuestions})` : k === 'preview' ? t('admin.test.preview') : t('admin.test.results')}</button>)}</div>
      {errs.length > 0 && <ul className="error-line list-disc pl-5" role="alert" data-testid="test-errors">{errs.map((e) => <li key={e}>{e}</li>)}</ul>}
      {msg && <p className="badge-free" role="status">{msg}</p>}

      {tab === 'edit' && (
        <form className="card-static space-y-3" onSubmit={(e) => { e.preventDefault(); save(); }}>
          <Field label={t('admin.series')}><select className={selectCls} value={tt.seriesId} onChange={(e) => setTt({ ...tt, seriesId: e.target.value })} data-testid="test-series">{series.data?.rows.map((s) => <option key={s.id} value={s.id}>{p(s.title)} ({s.class})</option>)}</select></Field>
          <BiInput label="Title" value={tt.title} onChange={(title) => setTt({ ...tt, title })} />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <Field label={t('admin.test.type')}><select className={selectCls} value={tt.type} onChange={(e) => { const type = e.target.value as T['type']; setTt({ ...tt, type, ...(type === 'full' ? { durationMin: 195, totalQuestions: 100, attemptLimit: 50 } : type === 'quick' ? { durationMin: 15, totalQuestions: 10, attemptLimit: 10 } : {}) }); }}><option value="chapter">{t('admin.test.chapter')}</option><option value="full">{t('admin.test.full')}</option><option value="quick">{t('admin.test.quick')}</option></select></Field>
            <Field label={t('admin.test.duration')}><input className={inputCls} type="number" min={1} value={tt.durationMin} onChange={(e) => setTt({ ...tt, durationMin: Number(e.target.value) })} /></Field>
            <Field label={t('admin.test.total')}><input className={inputCls} type="number" min={1} value={tt.totalQuestions} onChange={(e) => setTt({ ...tt, totalQuestions: Number(e.target.value) })} data-testid="test-total" /></Field>
            <Field label={t('admin.test.attempt')}><input className={inputCls} type="number" min={1} value={tt.attemptLimit} onChange={(e) => setTt({ ...tt, attemptLimit: Number(e.target.value) })} data-testid="test-attempt" /></Field>
            <Field label={t('admin.test.marks')}><input className={inputCls} type="number" min={0} step="0.5" value={tt.marksPerQuestion} onChange={(e) => setTt({ ...tt, marksPerQuestion: Number(e.target.value) })} /></Field>
            <Field label={t('admin.test.negative')}><input className={inputCls} type="number" min={0} step="0.25" value={tt.negativeMarks} onChange={(e) => setTt({ ...tt, negativeMarks: Number(e.target.value) })} /></Field>
          </div>
          <BiInput label={t('admin.test.instructions')} value={tt.instructions} onChange={(instructions) => setTt({ ...tt, instructions })} multiline />
          <h2 className="h2">{t('admin.test.schedule')}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <Field label={t('admin.test.start')}><input className={inputCls} type="datetime-local" value={toLocalInput(tt.startAt)} onChange={(e) => setTt({ ...tt, startAt: fromLocalInput(e.target.value) })} data-testid="test-start" /></Field>
            <Field label={t('admin.test.end')}><input className={inputCls} type="datetime-local" value={toLocalInput(tt.endAt)} onChange={(e) => setTt({ ...tt, endAt: fromLocalInput(e.target.value) })} data-testid="test-end" /></Field>
            <Field label={t('admin.test.results')}><select className={selectCls} value={tt.resultsVisible} onChange={(e) => setTt({ ...tt, resultsVisible: e.target.value as T['resultsVisible'] })}><option value="instant">{t('admin.test.resultsInstant')}</option><option value="after_end">{t('admin.test.resultsAfter')}</option></select></Field>
            <label className="flex items-end gap-2 min-h-12 pb-2"><input type="checkbox" className="w-5 h-5" checked={tt.leaderboard} onChange={(e) => setTt({ ...tt, leaderboard: e.target.checked })} /> {t('admin.test.leaderboard')}</label>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="submit" className="btn-secondary btn-sm" data-testid="test-save-draft">{t('admin.save')} ({t('admin.status.draft')})</button>
            <button type="button" className="btn-primary btn-sm" onClick={() => save('scheduled')} data-testid="test-schedule">{t('admin.test.schedule')} →</button>
            {tt.id && tt.status !== 'closed' && <button type="button" className="btn-ghost btn-sm" onClick={() => save('closed')}>{t('admin.status.closed')}</button>}
            {tt.id && tt.status === 'scheduled' && <button type="button" className="btn-ghost btn-sm" onClick={async () => { const r = await adminApi<{ job: { count: number; scheduledAt: string } }>(`/tests/${tt.id}/notify`, {}); setMsg(`WhatsApp: ${r.job.count} · ${fmtDate(r.job.scheduledAt)}`); }}>{t('admin.test.notify')}</button>}
            {tt.id && <button type="button" className="btn-ghost btn-sm btn-danger" onClick={() => setDel(true)}>{t('admin.delete')}</button>}
          </div>
        </form>
      )}

      {tab === 'questions' && (
        <div className="space-y-4">
          <div className="card-static space-y-2"><p className="font-bold">{t('admin.q.selected', { n: qs.length })} / {tt.totalQuestions}</p>
            <ol className="space-y-1 text-[14px]">{qs.map((q, i) => <li key={q.id} className="flex gap-2 items-start"><span className="meta w-6">{i + 1}.</span><span className="flex-1"><MathText text={q.question.hi || q.question.en} /></span><button type="button" className="btn-ghost btn-sm" onClick={() => pick(q)}>✕</button></li>)}</ol>
            <button type="button" className="btn-primary btn-sm" onClick={() => save()} data-testid="questions-save">{t('admin.save')}</button></div>
          <QuestionBank onPick={pick} picked={picked} />
        </div>
      )}

      {tab === 'preview' && (
        <div className="max-w-md space-y-3 mx-auto" data-testid="test-preview">
          <p className="meta">{t('admin.test.preview')} · {tt.durationMin} min · {tt.attemptLimit}/{tt.totalQuestions}</p>
          {qs.map((q, i) => (
            <article key={q.id} className="card">
              <span className="chip">{t('objective.question')} {i + 1} / {qs.length}</span>
              <h3 className="text-[18px] font-bold mt-2 mb-2"><MathText text={q.question.hi || q.question.en} /></h3>
              <div className="grid gap-2">{(q.options.hi.some(Boolean) ? q.options.hi : q.options.en).map((o, oi) => <div key={oi} className="option-btn"><span className="option-letter">{'ABCD'[oi]}</span><MathText text={o} /></div>)}</div>
            </article>
          ))}
        </div>
      )}

      {tab === 'results' && (
        results.loading ? <p className="meta">{t('admin.loading')}</p> : results.data ? (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2"><div className="card-static"><p className="meta">{t('admin.test.attempts')}</p><p className="price">{results.data.attempts}</p></div><div className="card-static"><p className="meta">{t('admin.test.avg')}</p><p className="price">{results.data.average}</p><p className="meta">/ {results.data.maxMarks}</p></div><div className="card-static flex items-end"><button type="button" className="btn-secondary btn-sm" onClick={() => adminDownload(`/tests/${id}/results.csv`, `${id}-results.csv`)}>{t('admin.export')}</button></div></div>
            <section className="card-static"><h3 className="font-bold mb-2">{t('admin.test.distribution')}</h3><div className="flex items-end gap-1 h-24">{results.data.distribution.map((b) => { const max = Math.max(1, ...results.data!.distribution.map((x) => x.count)); return <div key={b.from} className="flex-1 text-center"><div className="mx-auto w-full rounded-t-md" style={{ height: `${(b.count / max) * 80}px`, background: 'linear-gradient(180deg,#3B82F6,#22D3EE)' }} title={`${b.from}–${b.to}%: ${b.count}`} /><span className="meta text-[11px]">{b.from}</span></div>; })}</div></section>
            <section className="card-static"><h3 className="font-bold mb-2">{t('admin.test.top')}</h3><ol className="list-decimal pl-5 text-[15px]">{results.data.top.map((x) => <li key={x.attemptId}>{x.name ? `${x.name} · ` : ''}{x.phoneMasked} — {x.score}/{x.maxMarks}</li>)}</ol></section>
            <section className="card-static"><h3 className="font-bold mb-2">{t('admin.test.accuracy')}</h3><ul className="space-y-1 text-[14px]">{results.data.perQuestion.map((x, i) => <li key={x.id} className="flex items-center gap-2"><span className="meta w-6">{i + 1}.</span><span className="flex-1 truncate">{x.question}</span><span className={`chip ${x.accuracy !== null && x.accuracy < 40 ? 'badge-sample' : ''}`}>{x.accuracy === null ? '—' : `${x.accuracy}%`} ({x.right}/{x.answered})</span></li>)}</ul></section>
          </div>
        ) : null
      )}
      <Confirm open={del} name={p(tt.title)} onCancel={() => setDel(false)} onConfirm={async () => { await adminApi(`/tests/${tt.id}`, undefined, 'DELETE'); nav('/admin/tests'); }} />
    </div>
  );
}
