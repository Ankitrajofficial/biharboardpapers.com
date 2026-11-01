import { Link, useParams } from 'react-router';
import { Seo } from '@/components/Seo';
import { Skeleton } from '@/components/Loading';
import { ShareButton } from '@/components/ShareReport';
import { MathText } from '@/components/MathText';
import { useLang, useHydrated } from '@/lib/hooks';
import { useAccount } from '@/lib/account';
import { usePublic } from '@/lib/publicApi';

interface Result { attempt: { score: number; maxMarks: number; correct: number; wrong: number; skipped: number; overLimit: number; submittedAt: string }; resultsVisible: boolean; review: Array<{ id: string; chosen: number | null; correct: number; result: string; question: string; options: string[]; explanation: string }>; endAt: string | null }
const L = ['A', 'B', 'C', 'D'];

export default function TestResultPage() {
  const { id } = useParams();
  const { t, lang, prefs } = useLang();
  const hydrated = useHydrated();
  const { token } = useAccount();
  const { data, loading, error } = usePublic<Result>(hydrated && token ? `/tests/${id}/result?medium=${prefs.medium ?? 'hindi'}` : null, 0);
  const lb = usePublic<{ rows: Array<{ rank: number; firstName: string; district: string; score: number; maxMarks: number }> }>(hydrated ? `/tests/${id}/leaderboard` : null, 30);
  const path = `/tests/${id}/result`;
  return (
    <>
      <Seo title={t('mock.result')} description="" path={path} lang={lang} noindex />
      <h1 className="h1 py-4">{t('mock.result')}</h1>
      {!token ? <Link to={`/login?next=${encodeURIComponent(path)}`} className="btn-primary">{t('action.login')}</Link> : loading || !hydrated ? <Skeleton lines={4} /> : error || !data ? <p className="error-line">{t('error.title')}</p> : (
        <>
          <div className="card-static" data-testid="test-result">
            <p className="price tabular-nums">{data.attempt.score} / {data.attempt.maxMarks}</p>
            <ul className="flex flex-wrap gap-2 mt-2"><li className="badge-free">{t('mock.correct')}: {data.attempt.correct}</li><li className="badge-sample">{t('mock.wrong')}: {data.attempt.wrong}</li><li className="chip">{t('mock.skipped')}: {data.attempt.skipped}</li></ul>
            <div className="mt-4"><ShareButton text={t('share.result', { subject: t('student.tests'), score: data.attempt.score, total: data.attempt.maxMarks, url: '{url}' })} path="/tests" /></div>
          </div>
          {!data.resultsVisible && <p className="muted mt-3">{t('student.tests.resultLater')}</p>}
          {data.review.length > 0 && (
            <section className="mt-6" lang={lang}><h2 className="h2 mb-2">{t('mock.review')}</h2>
              <ol className="grid gap-3">{data.review.map((r, i) => (
                <li key={r.id} className="card-static">
                  <p className="font-bold">{i + 1}. <MathText text={r.question} /></p>
                  {r.chosen !== null && <p className={r.result === 'right' ? 'text-deep-mint' : 'text-deep-red'}>{t('mock.yourAnswer')}: {L[r.chosen]}. <MathText text={r.options[r.chosen]} /></p>}
                  <p className="text-deep-mint">{t('objective.correctIs')}: {L[r.correct]}. <MathText text={r.options[r.correct]} /></p>
                  {r.explanation && <p className="muted mt-1"><MathText text={r.explanation} /></p>}
                </li>
              ))}</ol>
            </section>
          )}
        </>
      )}
      {lb.data && lb.data.rows.length > 0 && (
        <section id="leaderboard" className="mt-6"><h2 className="h2 mb-2">{t('student.tests.leaderboard')}</h2>
          <ol className="card-static p-0 divide-y divide-line">{lb.data.rows.map((r) => <li key={r.rank} className="flex items-center gap-3 px-4 min-h-12"><span className="chip">{r.rank}</span><span className="flex-1">{r.firstName}{r.district ? ` · ${r.district}` : ''}</span><span className="font-bold tabular-nums">{r.score}/{r.maxMarks}</span></li>)}</ol>
        </section>
      )}
      <Link to="/tests" className="btn-secondary mt-6">{t('student.tests')}</Link>
    </>
  );
}
