import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, ArrowLeft, ArrowRight, Grid3X3, PauseCircle, Timer } from 'lucide-react';
import { useLang } from '@/lib/hooks';
import { MathText } from './MathText';

export interface RunnerQuestion { id: string; question: string; options: string[]; status?: string }
interface Props {
  questions: RunnerQuestion[];
  attempt: number;
  durationMin: number;
  timer: boolean;
  initial?: { answers: Record<string, number>; elapsedSec: number };
  onTick?: (answers: Record<string, number>, elapsedSec: number) => void;
  onSubmit: (answers: Record<string, number>) => void;
  onExit?: () => void;
}
const LETTERS = ['A', 'B', 'C', 'D'];
const fmt = (sec: number) => `${Math.floor(sec / 3600)}:${String(Math.floor((sec % 3600) / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;

/** One question at a time, OMR sheet view, attempt-limit warning, optional timer that pauses when hidden. Saves on every tap. */
export function TestRunner({ questions, attempt, durationMin, timer, initial, onTick, onSubmit, onExit }: Props) {
  const { t, lang } = useLang();
  const [answers, setAnswers] = useState<Record<string, number>>(initial?.answers ?? {});
  const [i, setI] = useState(0);
  const [omr, setOmr] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [elapsed, setElapsed] = useState(initial?.elapsedSec ?? 0);
  const [paused, setPaused] = useState(false);
  const left = Math.max(0, durationMin * 60 - elapsed);
  const submitted = useRef(false);
  useEffect(() => { onTick?.(answers, elapsed); }, [answers, elapsed]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!timer) return;
    const onVis = () => setPaused(document.hidden);
    document.addEventListener('visibilitychange', onVis);
    const id = setInterval(() => { if (!document.hidden) setElapsed((e) => e + 1); }, 1000);
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', onVis); };
  }, [timer]);
  const submit = () => { if (submitted.current) return; submitted.current = true; onSubmit(answers); };
  useEffect(() => { if (timer && left === 0) submit(); }, [timer, left]); // eslint-disable-line react-hooks/exhaustive-deps
  const toggle = (qid: string, oi: number) => setAnswers((a) => (a[qid] === oi ? Object.fromEntries(Object.entries(a).filter(([k]) => k !== qid)) : { ...a, [qid]: oi }));
  const attempted = Object.keys(answers).length;
  const q = questions[i];
  if (!q) return null;
  return (
    <div className="space-y-3" lang={lang}>
      <div className="card-static p-3 flex flex-wrap items-center gap-3 sticky top-[60px] z-10">
        <span className="chip">{t('mock.attempted')}: <strong data-testid="attempted">{attempted}</strong> / {attempt}</span>
        {timer && <span className="chip tabular-nums"><Timer size={16} aria-hidden="true" /> {fmt(left)}{paused && <PauseCircle size={16} aria-label={t('mock.paused')} />}</span>}
        <button type="button" className="chip ml-auto" aria-pressed={omr} onClick={() => setOmr(!omr)}><Grid3X3 size={16} aria-hidden="true" /> {t('mock.omr')}</button>
      </div>
      {attempted > attempt && <p className="error-line card-static flex gap-2" role="alert" data-testid="over-limit"><AlertTriangle aria-hidden="true" className="shrink-0" /> {t('mock.overLimit', { attempt })}</p>}
      {omr ? (
        <div className="card-static">
          <h2 className="h2 mb-3">{t('mock.omr')}</h2>
          <ol className="grid gap-2 sm:grid-cols-2">
            {questions.map((qq, n) => (
              <li key={qq.id} className="flex items-center gap-2">
                <button type="button" className="w-10 text-left font-bold min-h-12" onClick={() => { setI(n); setOmr(false); }} aria-label={`${t('objective.question')} ${n + 1}`}>{n + 1}.</button>
                {LETTERS.map((L, oi) => <button key={L} type="button" className="omr-bubble min-w-12 min-h-12" data-filled={answers[qq.id] === oi} aria-pressed={answers[qq.id] === oi} aria-label={`${n + 1} ${L}`} onClick={() => toggle(qq.id, oi)}>{L}</button>)}
              </li>
            ))}
          </ol>
        </div>
      ) : (
        <article className="card" aria-labelledby={`mq-${q.id}`}>
          <div className="flex items-center justify-between mb-2"><span className="chip">{t('objective.question')} {i + 1} / {questions.length}</span></div>
          <h2 id={`mq-${q.id}`} className="text-[18px] font-bold leading-snug mb-3"><MathText text={q.question} /></h2>
          <div className="grid gap-2">
            {q.options.map((opt, oi) => (
              <button key={oi} type="button" className="option-btn" aria-pressed={answers[q.id] === oi} data-testid={`mock-option-${LETTERS[oi]}`} onClick={() => toggle(q.id, oi)}>
                <span className="option-letter">{LETTERS[oi]}</span><span className="flex-1"><MathText text={opt} /></span>
              </button>
            ))}
          </div>
        </article>
      )}
      <div className="flex gap-2">
        <button type="button" className="btn-secondary" disabled={i === 0} onClick={() => setI(i - 1)}><ArrowLeft aria-hidden="true" /> {t('action.previous')}</button>
        {i + 1 < questions.length ? <button type="button" className="btn-primary" onClick={() => setI(i + 1)} data-testid="mock-next">{t('action.next')} <ArrowRight aria-hidden="true" /></button>
          : <button type="button" className="btn-primary" onClick={() => setConfirm(true)} data-testid="mock-submit">{t('action.submit')}</button>}
      </div>
      {confirm && (
        <div className="card selected" role="dialog" aria-labelledby="confirm-h">
          <h2 id="confirm-h" className="h2">{t('mock.submitConfirm')}</h2>
          <p className="muted mb-3">{t('mock.submitNote')}</p>
          <div className="flex gap-2"><button type="button" className="btn-primary" onClick={submit} data-testid="mock-submit-confirm">{t('action.submit')}</button><button type="button" className="btn-secondary" onClick={() => setConfirm(false)}>{t('action.close')}</button></div>
        </div>
      )}
      {onExit && <button type="button" className="btn-ghost btn-sm" onClick={onExit}>{t('action.close')}</button>}
    </div>
  );
}
