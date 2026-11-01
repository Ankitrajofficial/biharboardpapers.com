import { Suspense, use, useEffect, useState } from 'react';
import { Link } from 'react-router';
import { ArrowLeft, ArrowRight, CheckCircle2, Download, ExternalLink, ListChecks } from 'lucide-react';
import { subjectTone } from '@/data/subjects';
import { Seo } from '@/components/Seo';
import { StatusBadge } from '@/components/Badges';
import { NotesRenderer, YouTubeLazy } from '@/components/NotesRenderer';
import { QuestionCard } from '@/components/QuestionCard';
import { ReportLink, ShareButton } from '@/components/ShareReport';
import { Skeleton } from '@/components/Loading';
import { useSubjectRoute } from '@/lib/routeParams';
import { useLang } from '@/lib/hooks';
import { chapterEntryBySlug, chaptersFor, loadChapter, removeChapterOffline, saveChapterOffline } from '@/content/loader';
import { markCompleted, recordAnswer, setOffline, toggleBookmark, touchStreak, useProgress } from '@/lib/progress';
import { chapterObjectivePath, chapterPath, subjectImportantPath, subjectPath } from '@/lib/paths';
import { track } from '@/lib/analytics';
import type { ChapterIndexEntry } from '@/content/types';
import type { Subject } from '@/data/subjects';
import type { Medium } from '@/content/types';
import { NotFoundPage } from './Static';

function EndQuiz({ entry, s, medium }: { entry: ChapterIndexEntry; s: Subject; medium: Medium }) {
  const chapter = use(loadChapter(entry));
  const { t, lang } = useLang();
  const progress = useProgress();
  const qs = chapter.objective.slice(0, 5);
  const [i, setI] = useState(0);
  const [chosen, setChosen] = useState<number | null>(null);
  const [right, setRight] = useState(0);
  const [done, setDone] = useState(false);
  const path = chapterPath(s, medium, entry);
  if (!qs.length) return null;
  if (done)
    return (
      <div className="card p-4" data-testid="quiz-result">
        <p className="font-bold text-[18px]">{t('objective.finished')} · {t('objective.score')}: {right}/{qs.length}</p>
        <div className="flex flex-wrap gap-2 mt-3">
          <Link to={chapterObjectivePath(s, medium, entry)} className="btn-primary btn-sm"><ListChecks aria-hidden="true" /> {t('chapter.allObjective')}</Link>
          <button type="button" className="btn-secondary btn-sm" onClick={() => { setI(0); setChosen(null); setRight(0); setDone(false); }}>{t('action.retry')}</button>
        </div>
      </div>
    );
  const q = qs[i];
  return (
    <div className="space-y-3">
      <QuestionCard q={q} index={i} total={qs.length} chosen={chosen} reveal onChoose={(c) => { setChosen(c); recordAnswer(q.id, c === q.answer); if (c === q.answer) setRight((r) => r + 1); touchStreak(); }}
        bookmarked={!!progress.bookmarks[q.id]} onBookmark={() => toggleBookmark(q.id, chapter.id)} path={path} lang={lang} />
      {chosen !== null && (
        <button type="button" className="btn-primary" data-testid="quiz-next" onClick={() => { if (i + 1 >= qs.length) { setDone(true); track('quiz_completed', { chapter: chapter.id }); } else { setI(i + 1); setChosen(null); } }}>
          {i + 1 >= qs.length ? t('mock.result') : t('action.next')} <ArrowRight aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

function ChapterBody({ entry, s, medium }: { entry: ChapterIndexEntry; s: Subject; medium: Medium }) {
  const chapter = use(loadChapter(entry));
  const { t, lang, p } = useLang();
  const progress = useProgress();
  const path = chapterPath(s, medium, entry);
  const all = chaptersFor(s.class, medium, s.id);
  const idx = all.findIndex((c) => c.id === entry.id);
  const prev = all[idx - 1];
  const next = all[idx + 1];
  const done = !!progress.completed[chapter.id];
  const offline = !!progress.offline[chapter.id];
  const [saving, setSaving] = useState(false);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    track('chapter_opened', { chapter: chapter.id });
    touchStreak();
  }, [chapter.id]);

  const toggleOffline = async () => {
    setSaving(true);
    if (offline) {
      await removeChapterOffline(entry);
      setOffline(chapter.id, null);
    } else if (await saveChapterOffline(entry)) setOffline(chapter.id, `/content/${entry.file}`);
    setSaving(false);
  };

  const cls = s.class === 'class-10' ? (lang === 'hi' ? '10वीं' : '10th') : lang === 'hi' ? '12वीं' : '12th';
  const title = lang === 'hi' ? `${chapter.title} — बिहार बोर्ड ${cls} ${s.name.hi} नोट्स व ऑब्जेक्टिव प्रश्न` : `${chapter.title} — Bihar Board ${cls} ${s.name.en} notes & objective questions`;
  const altEntry = (m: Medium) => all.length && chaptersFor(s.class, m, s.id).find((c) => c.id === chapter.id);
  const hiAlt = altEntry('hindi');
  const enAlt = altEntry('english');

  return (
    <article lang={lang} className={`reading mx-auto tone-${subjectTone(s)}`} style={{ '--reading-scale': scale } as React.CSSProperties}>
      <Seo title={title} description={chapter.summary} path={path} lang={lang}
        alternates={{ hi: hiAlt ? chapterPath(s, 'hindi', hiAlt) : undefined, en: enAlt ? chapterPath(s, 'english', enAlt) : undefined }}
        jsonLd={[
          { '@context': 'https://schema.org', '@type': 'LearningResource', name: chapter.title, description: chapter.summary, inLanguage: lang, educationalLevel: s.class === 'class-10' ? 'Class 10' : 'Class 12', about: p(s.name) },
          { '@context': 'https://schema.org', '@type': 'Quiz', name: `${chapter.title} — ${t('chapter.quiz')}`, hasPart: chapter.objective.slice(0, 5).map((q) => ({ '@type': 'Question', name: q.question, acceptedAnswer: { '@type': 'Answer', text: q.options[q.answer] } })) },
        ]} />
      <nav className="py-3 text-[14px] muted" aria-label="Breadcrumb">
        <Link className="link" to={subjectPath(s, medium)}>{p(s.name)}</Link> › {t('subject.chapter')} {chapter.chapterNumber}
      </nav>
      <h1 className="h1">{chapter.title}</h1>
      <div className="flex flex-wrap items-center gap-2 mt-2">
        <StatusBadge status={chapter.status} />
        <span className="muted text-[13px]">{t('chapter.lastReviewed')}: {chapter.lastReviewed}</span>
      </div>

      <NotesRenderer blocks={chapter.notes} />

      {chapter.textbook.url && (
        <a className="card-tap mt-5 font-semibold" href={chapter.textbook.url} target="_blank" rel="noopener noreferrer">
          <ExternalLink aria-hidden="true" /> {t('chapter.textbook')}: {chapter.textbook.name}
        </a>
      )}
      {chapter.youtube && (
        <section className="mt-5"><h2 className="h2 mb-2">{t('chapter.video')}</h2><YouTubeLazy id={chapter.youtube.id} title={chapter.youtube.title} /></section>
      )}

      <div className="grid gap-2 sm:grid-cols-3 mt-6">
        <button type="button" className="btn-secondary" aria-pressed={done} onClick={() => markCompleted(chapter.id, !done)} data-testid="mark-done">
          <CheckCircle2 aria-hidden="true" /> {done ? t('action.markedDone') : t('action.markDone')}
        </button>
        <button type="button" className="btn-secondary" aria-pressed={offline} disabled={saving} onClick={toggleOffline}>
          <Download aria-hidden="true" /> {offline ? t('action.savedOffline') : t('action.saveOffline')}
        </button>
        <ShareButton className="btn-secondary" text={t('share.chapter', { title: chapter.title, url: '{url}' })} path={path} />
      </div>
      {offline && <p className="muted mt-2">{t('chapter.offlineSaved')}</p>}

      <section className="mt-8" aria-labelledby="quiz-h">
        <h2 id="quiz-h" className="h2">{t('chapter.quiz')}</h2>
        <p className="muted mb-3">{t('chapter.quizIntro')}</p>
        <EndQuiz entry={entry} s={s} medium={medium} />
      </section>

      <div className="grid gap-2 sm:grid-cols-2 mt-6">
        <Link to={chapterObjectivePath(s, medium, entry)} className="btn-secondary" data-testid="chapter-objective"><ListChecks aria-hidden="true" /> {t('chapter.allObjective')}</Link>
        <Link to={subjectImportantPath(s, medium)} className="btn-secondary">{t('chapter.important')}</Link>
      </div>
      <nav className="flex justify-between gap-2 mt-6" aria-label="Chapters">
        {prev ? <Link to={chapterPath(s, medium, prev)} className="btn-secondary btn-sm"><ArrowLeft aria-hidden="true" /> {t('action.previous')}</Link> : <span />}
        {next ? <Link to={chapterPath(s, medium, next)} className="btn-secondary btn-sm">{t('action.next')} <ArrowRight aria-hidden="true" /></Link> : <span />}
      </nav>
      <div className="sticky-bar mt-4" data-testid="reading-bar">
        {prev ? <Link to={chapterPath(s, medium, prev)} className="btn-ghost btn-icon" aria-label={t('action.previous')}><ArrowLeft aria-hidden="true" /></Link> : <span className="w-12 shrink-0" />}
        <button type="button" className="btn-ghost btn-icon" aria-pressed={offline} disabled={saving} onClick={toggleOffline} aria-label={t('action.saveOffline')}><Download aria-hidden="true" /></button>
        <Link to={chapterObjectivePath(s, medium, entry)} className="btn-primary btn-sm flex-1 nowrap min-w-0">{t('action.practice')} <ArrowRight aria-hidden="true" /></Link>
        <button type="button" className="btn-ghost btn-icon font-bold" onClick={() => setScale((x) => Math.max(0.9, +(x - 0.1).toFixed(1)))} aria-label={t('chapter.textSmaller')}>A−</button>
        <button type="button" className="btn-ghost btn-icon font-bold" onClick={() => setScale((x) => Math.min(1.4, +(x + 0.1).toFixed(1)))} aria-label={t('chapter.textLarger')}>A+</button>
      </div>
      <div className="mt-4"><ReportLink id={chapter.id} path={path} /></div>
    </article>
  );
}

export default function ChapterPage() {
  const r = useSubjectRoute();
  if (!r || !r.chapterSlug) return <NotFoundPage />;
  const entry = chapterEntryBySlug(r.classId, r.medium, r.subject.id, r.chapterSlug);
  if (!entry) return <NotFoundPage />;
  return (
    <Suspense fallback={<Skeleton lines={10} />}>
      <ChapterBody key={entry.id + entry.medium} entry={entry} s={r.subject} medium={r.medium} />
    </Suspense>
  );
}
