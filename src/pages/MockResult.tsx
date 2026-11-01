import { useMemo } from 'react';
import { Link, useParams } from 'react-router';
import { Seo } from '@/components/Seo';
import { ShareButton } from '@/components/ShareReport';
import { useLang } from '@/lib/hooks';
import { getSubject } from '@/data/subjects';
import { chapterEntryById } from '@/content/loader';
import { chapterObjectivePath } from '@/lib/paths';
import type { MockScore } from '@/lib/scoring';
import type { MockHistoryEntry } from '@/lib/progress';
import type { ObjectiveQuestion } from '@/content/types';
import { LAST_RESULT_KEY } from './MockTest';

const LETTERS = ['A', 'B', 'C', 'D'];
interface Stored { entry: MockHistoryEntry; score: MockScore; questions: ObjectiveQuestion[]; subjectName?: { hi: string; en: string } }

export default function MockResultPage() {
  const { id } = useParams();
  const { t, lang, p, prefs } = useLang();
  const data = useMemo<Stored | null | undefined>(() => {
    if (typeof window === 'undefined') return undefined;
    try {
      const raw = sessionStorage.getItem(LAST_RESULT_KEY);
      const d = raw ? (JSON.parse(raw) as Stored) : null;
      return d && d.entry.mockId === id ? d : null;
    } catch { return null; }
  }, [id]);

  const path = `/mock-test/${id}/result`;
  if (data === undefined) return <Seo title={t('mock.result')} description={t('mock.result')} path={path} lang={lang} noindex />;
  if (!data)
    return (
      <>
        <Seo title={t('mock.result')} description={t('mock.result')} path={path} lang={lang} noindex />
        <p className="muted py-6">{t('my.empty')}</p>
        <Link to="/mock-test" className="btn-primary">{t('mock.title')}</Link>
      </>
    );
  const { entry, score, questions } = data;
  const wrongQs = questions.filter((q) => score.outcomes.find((o) => o.id === q.id)?.result === 'wrong');
  const subject = getSubject(entry.classId as 'class-10' | 'class-12', entry.subjectId);
  const medium = prefs.medium ?? 'hindi';
  // Chapters to practise again: those with any wrong answer.
  const chapterIds = Array.from(new Set(wrongQs.map((q) => q.id.replace(/-q\d+$/, ''))));
  return (
    <>
      <Seo title={t('mock.result')} description={t('mock.result')} path={path} lang={lang} noindex />
      <h1 className="h1 py-4">{t('mock.result')}: {entry.title}</h1>
      <div className="card p-5" data-testid="mock-result">
        <p className="text-[32px] font-bold tabular-nums">{score.score} / {score.total}</p>
        <ul className="flex flex-wrap gap-2 mt-2">
          <li className="badge-free">{t('mock.correct')}: {score.correct}</li>
          <li className="badge-sample">{t('mock.wrong')}: {score.wrong}</li>
          <li className="chip">{t('mock.skipped')}: {score.skipped}</li>
          {score.overLimit > 0 && <li className="badge-lock">{t('mock.overLimit', { attempt: score.total })}</li>}
        </ul>
        <div className="mt-4"><ShareButton text={t('share.result', { subject: subject ? p(subject.name) : entry.subjectId, score: score.score, total: score.total, url: '{url}' })} path="/mock-test" /></div>
      </div>
      {chapterIds.length > 0 && subject && (
        <section className="mt-6">
          <h2 className="h2 mb-2">{t('mock.practiceAgain')}</h2>
          <ul className="grid gap-2">
            {chapterIds.map((cid) => {
              const e = chapterEntryById(cid, medium);
              return e ? <li key={cid}><Link className="card-tap font-semibold" to={chapterObjectivePath(subject, medium, e)}>{e.chapterNumber}. {e.title}</Link></li> : null;
            })}
          </ul>
        </section>
      )}
      {wrongQs.length > 0 && (
        <section className="mt-6" lang={lang}>
          <h2 className="h2 mb-2">{t('mock.review')}</h2>
          <ol className="grid gap-3">
            {wrongQs.map((q) => {
              const o = score.outcomes.find((x) => x.id === q.id)!;
              return (
                <li key={q.id} className="card p-4">
                  <p className="font-bold">{q.question}</p>
                  <p className="text-deep-red mt-1">{t('mock.yourAnswer')}: {LETTERS[o.chosen!]}. {q.options[o.chosen!]}</p>
                  <p className="text-deep-mint">{t('objective.correctIs')}: {LETTERS[q.answer]}. {q.options[q.answer]}</p>
                  <p className="muted mt-1">{q.explanation}</p>
                </li>
              );
            })}
          </ol>
        </section>
      )}
      <Link to="/mock-test" className="btn-secondary mt-6">{t('mock.title')}</Link>
    </>
  );
}
