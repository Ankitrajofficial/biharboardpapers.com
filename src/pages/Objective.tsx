import { Suspense, use, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { ArrowRight, RotateCcw, SkipForward } from 'lucide-react';
import { Seo } from '@/components/Seo';
import { QuestionCard } from '@/components/QuestionCard';
import { LockedCard } from '@/components/Locked';
import { Skeleton } from '@/components/Loading';
import { ShareButton } from '@/components/ShareReport';
import { useSubjectRoute } from '@/lib/routeParams';
import { useLang } from '@/lib/hooks';
import { chapterEntryBySlug, chaptersFor, loadChapter } from '@/content/loader';
import { recordAnswer, toggleBookmark, touchStreak, useProgress } from '@/lib/progress';
import { useAccount } from '@/lib/account';
import { objectiveUnlocked } from '@/lib/access';
import { chapterObjectivePath, chapterPath, subjectObjectivePath, subjectPath } from '@/lib/paths';
import { siteConfig } from '@/config/site';
import { track } from '@/lib/analytics';
import type { ChapterIndexEntry, ObjectiveQuestion } from '@/content/types';
import type { Subject } from '@/data/subjects';
import { NotFoundPage } from './Static';

interface Item { q: ObjectiveQuestion; chapterId: string; chapterTitle: string; indexInChapter: number }

function Practice({ entries, s, path }: { entries: ChapterIndexEntry[]; s: Subject; path: string }) {
  const chapters = entries.map((e) => use(loadChapter(e)));
  const { t, lang } = useLang();
  const progress = useProgress();
  const { account } = useAccount();
  const items = useMemo<Item[]>(() => chapters.flatMap((c) => c.objective.map((q, i) => ({ q, chapterId: c.id, chapterTitle: c.title, indexInChapter: i }))), [chapters]);
  const [queue, setQueue] = useState<number[]>(() => items.map((_, i) => i));
  const [pos, setPos] = useState(0);
  const [chosen, setChosen] = useState<number | null>(null);
  const [wrong, setWrong] = useState<number[]>([]);
  const [right, setRight] = useState(0);
  const [finished, setFinished] = useState(false);

  if (!items.length) return <p className="muted">{t('objective.empty')}</p>;
  const cur = items[queue[pos]];
  const unlocked = objectiveUnlocked(cur.indexInChapter, account, s.class);

  const choose = (c: number) => {
    setChosen(c);
    const ok = c === cur.q.answer;
    recordAnswer(cur.q.id, ok);
    touchStreak();
    if (ok) setRight((r) => r + 1);
    else setWrong((w) => [...w, queue[pos]]);
  };
  const advance = () => {
    if (pos + 1 >= queue.length) {
      setFinished(true);
      track('quiz_completed', { subject: s.id, count: queue.length });
      return;
    }
    setPos(pos + 1);
    setChosen(null);
  };
  const restart = (ids: number[]) => {
    setQueue(ids);
    setPos(0);
    setChosen(null);
    setWrong([]);
    setRight(0);
    setFinished(false);
  };

  if (finished)
    return (
      <div className="card p-5 space-y-3" data-testid="practice-result">
        <h2 className="h2">{t('objective.finished')}</h2>
        <p className="text-[22px] font-bold">{t('objective.score')}: {right} / {queue.length}</p>
        <div className="flex flex-wrap gap-2">
          {wrong.length > 0 && <button type="button" className="btn-primary btn-sm" onClick={() => restart(wrong)}><RotateCcw aria-hidden="true" /> {t('objective.retryWrong')} ({wrong.length})</button>}
          <button type="button" className="btn-secondary btn-sm" onClick={() => restart(items.map((_, i) => i))}>{t('action.retry')}</button>
          <ShareButton text={t('share.result', { subject: lang === 'hi' ? s.name.hi : s.name.en, score: right, total: queue.length, url: '{url}' })} path={path} />
        </div>
      </div>
    );

  return (
    <div className="space-y-3">
      {entries.length > 1 && <p className="chip">{cur.chapterTitle}</p>}
      {unlocked ? (
        <>
          <QuestionCard q={cur.q} index={pos} total={queue.length} chosen={chosen} reveal onChoose={choose}
            bookmarked={!!progress.bookmarks[cur.q.id]} onBookmark={() => toggleBookmark(cur.q.id, cur.chapterId)} path={path} lang={lang} />
          <div className="flex gap-2">
            {chosen === null ? (
              <button type="button" className="btn-secondary" onClick={advance}><SkipForward aria-hidden="true" /> {t('action.skip')}</button>
            ) : (
              <button type="button" className="btn-primary" onClick={advance} data-testid="practice-next">{pos + 1 >= queue.length ? t('mock.result') : t('action.next')} <ArrowRight aria-hidden="true" /></button>
            )}
          </div>
        </>
      ) : (
        <div className="space-y-3">
          <LockedCard classId={s.class} note={t('objective.freeNote', { n: siteConfig.freeObjectivePerChapter })} />
          <button type="button" className="btn-secondary" onClick={advance}>{t('action.skip')}</button>
        </div>
      )}
    </div>
  );
}

export default function ObjectivePage() {
  const r = useSubjectRoute();
  const { t, lang, p } = useLang();
  if (!r) return <NotFoundPage />;
  const { classId, medium, subject: s, chapterSlug } = r;
  const all = chaptersFor(classId, medium, s.id);
  const entry = chapterSlug ? chapterEntryBySlug(classId, medium, s.id, chapterSlug) : undefined;
  if (chapterSlug && !entry) return <NotFoundPage />;
  const entries = entry ? [entry] : all;
  const path = entry ? chapterObjectivePath(s, medium, entry) : subjectObjectivePath(s, medium);
  const cls = classId === 'class-10' ? (lang === 'hi' ? '10वीं' : '10th') : lang === 'hi' ? '12वीं' : '12th';
  const title = lang === 'hi' ? `बिहार बोर्ड ${cls} ${s.name.hi} ऑब्जेक्टिव प्रश्न ${siteConfig.targetExamYear}${entry ? ` — ${entry.title}` : ''}` : `Bihar Board ${cls} ${s.name.en} objective questions ${siteConfig.targetExamYear}${entry ? ` — ${entry.title}` : ''}`;
  return (
    <>
      <Seo title={title} description={`${t('objective.title')} · ${p(s.name)}`} path={path} lang={lang}
        alternates={{ hi: entry ? undefined : subjectObjectivePath(s, 'hindi'), en: entry ? undefined : subjectObjectivePath(s, 'english') }} />
      <nav className="py-3 text-[14px] muted" aria-label="Breadcrumb">
        <Link className="link" to={subjectPath(s, medium)}>{p(s.name)}</Link>{entry && <> › <Link className="link" to={chapterPath(s, medium, entry)}>{entry.title}</Link></>}
      </nav>
      <h1 className="h1 mb-4">{t('objective.title')}{entry ? `: ${entry.title}` : ''}</h1>
      {entries.length === 0 ? <p className="muted">{t('objective.empty')}</p> : (
        <Suspense fallback={<Skeleton lines={8} />}>
          <Practice key={path} entries={entries} s={s} path={path} />
        </Suspense>
      )}
    </>
  );
}
