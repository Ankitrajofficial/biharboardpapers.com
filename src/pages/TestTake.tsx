import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { Seo } from '@/components/Seo';
import { Skeleton } from '@/components/Loading';
import { TestRunner, type RunnerQuestion } from '@/components/TestRunner';
import { LockedCard } from '@/components/Locked';
import { useLang, useHydrated } from '@/lib/hooks';
import { useAccount, accountStore } from '@/lib/account';
import { publicGet } from '@/lib/publicApi';
import { touchStreak } from '@/lib/progress';

type Bi = { hi: string; en: string };
interface TestInfo { id: string; title: Bi; durationMin: number; totalQuestions: number; attemptLimit: number; instructions: Bi; resultsVisible: string; leaderboard: boolean; startAt: string | null; endAt: string | null; liveStatus: 'scheduled' | 'live' | 'closed'; series: { id: string; title: Bi; class: 'class-10' | 'class-12' } }

export default function TestTakePage() {
  const { id } = useParams();
  const { t, lang, p, prefs } = useLang();
  const hydrated = useHydrated();
  const { token } = useAccount();
  const nav = useNavigate();
  const [data, setData] = useState<{ test: TestInfo; questions: RunnerQuestion[]; attempted: boolean } | null>(null);
  const [err, setErr] = useState<'plan' | 'other' | null>(null);
  const [running, setRunning] = useState(false);
  const [busy, setBusy] = useState(false);
  const startedAt = useRef(new Date().toISOString());
  useEffect(() => {
    if (!hydrated || !id) return;
    publicGet<{ test: TestInfo; questions: RunnerQuestion[]; attempted: boolean }>(`/tests/${id}?medium=${prefs.medium ?? 'hindi'}&t=${token ? 1 : 0}`, 0).then(setData).catch((e) => setErr(String((e as Error).message) === '403' ? 'plan' : 'other'));
  }, [hydrated, id, prefs.medium, token]);
  const submit = async (answers: Record<string, number>) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/tests/${id}/submit`, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${accountStore.get().token}` }, body: JSON.stringify({ answers, startedAt: startedAt.current }) });
      if (!res.ok) throw new Error(String(res.status));
      touchStreak();
      nav(`/tests/${id}/result`);
    } catch { setErr('other'); setBusy(false); }
  };
  const path = `/tests/${id}`;
  if (err === 'plan') return <><Seo title={t('student.tests')} description="" path={path} lang={lang} noindex /><h1 className="h1 py-4">{t('student.tests.planRequired')}</h1><LockedCard classId={prefs.classId ?? 'class-12'} /></>;
  if (err) return <><Seo title={t('student.tests')} description="" path={path} lang={lang} noindex /><p className="error-line py-6">{t('error.title')}</p><Link to="/tests" className="btn-secondary">{t('student.tests')}</Link></>;
  if (!data) return <><Seo title={t('student.tests')} description="" path={path} lang={lang} noindex /><Skeleton lines={6} /></>;
  const { test, questions, attempted } = data;
  if (running) return <><Seo title={p(test.title)} description="" path={path} lang={lang} noindex /><h1 className="h1 py-3">{p(test.title)}</h1>{busy ? <Skeleton lines={3} /> : <TestRunner questions={questions} attempt={test.attemptLimit} durationMin={test.durationMin} timer onSubmit={submit} />}</>;
  return (
    <>
      <Seo title={p(test.title)} description={p(test.instructions)} path={path} lang={lang} noindex />
      <nav className="py-3 text-[14px] muted"><Link className="link" to="/tests">{t('student.tests')}</Link> › {p(test.series.title)}</nav>
      <h1 className="h1 mb-3">{p(test.title)}</h1>
      <div className="card-static space-y-2 max-w-md">
        <p className="chip">{test.durationMin} min · {t('mock.pattern', { given: test.totalQuestions, attempt: test.attemptLimit })}</p>
        {p(test.instructions) && <><h2 className="font-bold">{t('student.tests.instructions')}</h2><p className="whitespace-pre-wrap">{p(test.instructions)}</p></>}
        {test.resultsVisible === 'after_end' && <p className="muted">{t('student.tests.resultLater')}</p>}
        {attempted ? <Link to={`/tests/${id}/result`} className="btn-primary" data-testid="see-result">{t('mock.result')}</Link>
          : test.liveStatus !== 'live' ? <p className="badge-lock">{t(`student.tests.${test.liveStatus === 'scheduled' ? 'upcoming' : 'closed'}`)}</p>
          : !token ? <Link to={`/login?next=${encodeURIComponent(path)}`} className="btn-primary" data-testid="login-to-attempt">{t('student.tests.loginToAttempt')}</Link>
          : <button type="button" className="btn-primary" onClick={() => { startedAt.current = new Date().toISOString(); setRunning(true); }} data-testid="start-test">{t('student.tests.start')} →</button>}
        {test.leaderboard && <Link to={`/tests/${id}/result#leaderboard`} className="link text-[14px]">{t('student.tests.leaderboard')} →</Link>}
      </div>
    </>
  );
}
