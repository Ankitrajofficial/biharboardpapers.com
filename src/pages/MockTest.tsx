import { Suspense, use, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { TestRunner } from '@/components/TestRunner';
import { Seo } from '@/components/Seo';
import { Skeleton } from '@/components/Loading';
import { LockedCard } from '@/components/Locked';
import { StatusBadge } from '@/components/Badges';
import { loadMockTest, loadSubjectChapters } from '@/content/loader';
import { getSubject } from '@/data/subjects';
import { useLang } from '@/lib/hooks';
import { addMockHistory, setActiveMock, touchStreak, useProgress } from '@/lib/progress';
import { useAccount } from '@/lib/account';
import { featureUnlocked } from '@/lib/access';
import { scoreMock } from '@/lib/scoring';
import { track } from '@/lib/analytics';
import type { MockTest, ObjectiveQuestion } from '@/content/types';
import { NotFoundPage } from './Static';

type Mode = 'full' | 'quick10' | 'quick25';

export const LAST_RESULT_KEY = 'bbp.lastResult';

function Runner({ mock, questions, mode, timer, onExit }: { mock: MockTest; questions: ObjectiveQuestion[]; mode: Mode; timer: boolean; onExit: () => void }) {
  const { lang } = useLang();
  const nav = useNavigate();
  const progress = useProgress();
  const attempt = mode === 'full' ? mock.attempt : questions.length;
  const saved = progress.activeMock?.mockId === mock.id ? progress.activeMock : null;
  const startedAt = useRef(saved?.startedAt ?? new Date().toISOString());
  const submit = (answers: Record<string, number>) => {
    const score = scoreMock(questions, answers, attempt);
    const s = getSubject(mock.class, mock.subjectId);
    const entry = { id: `${mock.id}-${Date.now()}`, mockId: mock.id, subjectId: mock.subjectId, classId: mock.class, title: mock.title, score: score.score, total: score.total, correct: score.correct, wrong: score.wrong, skipped: score.skipped, at: new Date().toISOString() };
    addMockHistory(entry);
    touchStreak();
    track('mock_completed', { mock: mock.id, score: score.score, total: score.total });
    try { sessionStorage.setItem(LAST_RESULT_KEY, JSON.stringify({ entry, score, questions, subjectName: s?.name, lang })); } catch { /* ignore */ }
    nav(`/mock-test/${mock.id}/result`);
  };
  return (
    <TestRunner
      questions={questions.map((q) => ({ id: q.id, question: q.question, options: q.options, status: q.status }))}
      attempt={attempt}
      durationMin={mock.durationMin}
      timer={timer}
      initial={saved ? { answers: saved.answers, elapsedSec: saved.elapsedSec } : undefined}
      onTick={(answers, elapsedSec) => setActiveMock({ mockId: mock.id, answers, startedAt: startedAt.current, elapsedSec, timer })}
      onSubmit={submit}
      onExit={onExit}
    />
  );
}

function Setup({ mock }: { mock: MockTest }) {
  const { t } = useLang();
  const [sp] = useSearchParams();
  const chapters = use(loadSubjectChapters(mock.class, mock.medium, mock.subjectId));
  const { account } = useAccount();
  const progress = useProgress();
  const pool = useMemo(() => {
    const byId = new Map(chapters.flatMap((c) => c.objective).map((q) => [q.id, q]));
    return mock.questionIds.map((id) => byId.get(id)).filter((q): q is ObjectiveQuestion => !!q);
  }, [chapters, mock.questionIds]);
  const quick = sp.get('quick');
  const [mode, setMode] = useState<Mode>(quick === '10' ? 'quick10' : quick === '25' ? 'quick25' : 'full');
  const [timer, setTimer] = useState(false);
  const [more, setMore] = useState(false);
  const [running, setRunning] = useState(progress.activeMock?.mockId === mock.id);
  const fullUnlocked = featureUnlocked('mock_full', account, mock.class);
  const questions = useMemo(() => (mode === 'quick10' ? pool.slice(0, 10) : mode === 'quick25' ? pool.slice(0, 25) : pool), [mode, pool]);

  if (running) return <Runner mock={mock} questions={questions} mode={mode} timer={timer} onExit={() => { setActiveMock(null); setRunning(false); }} />;

  const modes: Array<{ id: Mode; label: string; sub: string; locked: boolean }> = [
    { id: 'quick10', label: t('mock.quick10'), sub: `10 ${t('mock.questions')}`, locked: false },
    { id: 'quick25', label: t('mock.quick25'), sub: `25 ${t('mock.questions')}`, locked: !fullUnlocked },
    { id: 'full', label: t('mock.full'), sub: t('mock.pattern', { given: pool.length, attempt: mock.attempt }), locked: !fullUnlocked },
  ];
  return (
    <div className="space-y-4 max-w-md">
      <div className="flex items-center gap-2"><StatusBadge status={mock.status} /></div>
      {mock.status === 'sample' && <p className="muted">{t('mock.sampleNote')}</p>}
      <div className="grid gap-3" role="radiogroup" aria-label={t('mock.choose')}>
        {modes.map((m) => (
          <button key={m.id} type="button" role="radio" aria-checked={mode === m.id} disabled={m.locked} className={`card-tap ${mode === m.id ? 'selected' : ''} disabled:opacity-60`} onClick={() => setMode(m.id)} data-testid={`mode-${m.id}`}>
            <span className="flex-1"><span className="block font-bold">{m.label}</span><span className="muted block text-[14px]">{m.sub}</span></span>
            {m.locked && <span className="badge-lock">{t('locked.short')}</span>}
          </button>
        ))}
      </div>
      {!fullUnlocked && <LockedCard classId={mock.class} note={t('mock.locked')} />}
      <button type="button" className="btn-ghost btn-sm" aria-expanded={more} onClick={() => setMore(!more)}>{more ? t('action.lessOptions') : t('action.moreOptions')}</button>
      {more && (
        <label className="card-tap"><input type="checkbox" className="w-6 h-6" checked={timer} onChange={(e) => setTimer(e.target.checked)} /> <span><span className="block font-bold">{t('mock.timer')}</span><span className="muted block text-[14px]">{t('mock.paused')}: {t('mock.saved')}</span></span></label>
      )}
      <button type="button" className="btn-primary" onClick={() => setRunning(true)} data-testid="mock-start">{t('action.start')} →</button>
    </div>
  );
}

export default function MockTestPage() {
  const { id } = useParams();
  const { t, lang } = useLang();
  if (!id || !/^[a-z0-9-]+$/.test(id)) return <NotFoundPage />;
  return (
    <>
      <Seo title={`${t('mock.title')} — ${id}`} description={t('mock.full')} path={`/mock-test/${id}`} lang={lang} />
      <nav className="py-3 text-[14px] muted"><Link className="link" to="/mock-test">{t('mock.title')}</Link></nav>
      <Suspense fallback={<Skeleton lines={6} />}>
        <MockLoader id={id} />
      </Suspense>
    </>
  );
}

function MockLoader({ id }: { id: string }) {
  const mock = use(loadMockTest(id));
  return (
    <>
      <h1 className="h1 mb-4">{mock.title}</h1>
      <Setup mock={mock} />
    </>
  );
}
