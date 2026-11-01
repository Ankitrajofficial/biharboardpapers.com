import { Suspense, use, useState } from 'react';
import { Link } from 'react-router';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Seo } from '@/components/Seo';
import { StatusBadge } from '@/components/Badges';
import { LockedCard } from '@/components/Locked';
import { Skeleton } from '@/components/Loading';
import { ReportLink } from '@/components/ShareReport';
import { useSubjectRoute } from '@/lib/routeParams';
import { useLang } from '@/lib/hooks';
import { chaptersFor, loadChapter } from '@/content/loader';
import { useAccount } from '@/lib/account';
import { featureUnlocked } from '@/lib/access';
import { subjectImportantPath, subjectPath } from '@/lib/paths';
import type { ChapterIndexEntry, SubjectiveQuestion } from '@/content/types';
import type { Subject } from '@/data/subjects';
import { NotFoundPage } from './Static';

/** Free preview: the first question of each chapter shows its outline; the rest need the plan. */
const FREE_PER_CHAPTER = 1;

function Item({ q, locked, path }: { q: SubjectiveQuestion; locked: boolean; path: string }) {
  const { t } = useLang();
  const [open, setOpen] = useState(false);
  return (
    <li className="card p-4">
      <div className="flex flex-wrap items-center gap-2 mb-1">
        <span className="chip">{q.type === 'short' ? t('important.short') : t('important.long')} · {q.marks} {t('important.marks')}</span>
        <StatusBadge status={q.status} short />
      </div>
      <p className="font-bold text-[17px]">{q.question}</p>
      {locked ? null : (
        <button type="button" className="btn-secondary btn-sm mt-2" aria-expanded={open} onClick={() => setOpen(!open)}>
          {open ? <ChevronUp aria-hidden="true" /> : <ChevronDown aria-hidden="true" />} {open ? t('action.hide') : t('action.reveal')}
        </button>
      )}
      {open && !locked && (
        <div className="mt-3 remember-box">
          <p className="label">{t('important.outline')}</p>
          <ul className="list-disc pl-5 space-y-1">{q.answerOutline.map((a, i) => <li key={i}>{a}</li>)}</ul>
        </div>
      )}
      <div className="mt-1"><ReportLink id={q.id} path={path} /></div>
    </li>
  );
}

function List({ entries, s, path }: { entries: ChapterIndexEntry[]; s: Subject; path: string }) {
  const chapters = entries.map((e) => use(loadChapter(e)));
  const { account } = useAccount();
  const { t } = useLang();
  const unlocked = featureUnlocked('important', account, s.class);
  return (
    <div className="space-y-6">
      {chapters.map((c) => (
        <section key={c.id} aria-labelledby={`imp-${c.id}`}>
          <h2 id={`imp-${c.id}`} className="h2 mb-2">{c.chapterNumber}. {c.title}</h2>
          <ul className="grid gap-2">
            {c.important.map((q, i) => <Item key={q.id} q={q} locked={!unlocked && i >= FREE_PER_CHAPTER} path={path} />)}
          </ul>
          {!unlocked && c.important.length > FREE_PER_CHAPTER && <div className="mt-2"><LockedCard classId={s.class} /></div>}
        </section>
      ))}
      {chapters.length === 0 && <p className="muted">{t('objective.empty')}</p>}
    </div>
  );
}

export default function ImportantPage() {
  const r = useSubjectRoute();
  const { t, lang, p } = useLang();
  if (!r) return <NotFoundPage />;
  const { classId, medium, subject: s } = r;
  const entries = chaptersFor(classId, medium, s.id);
  const path = subjectImportantPath(s, medium);
  const cls = classId === 'class-10' ? (lang === 'hi' ? '10वीं' : '10th') : lang === 'hi' ? '12वीं' : '12th';
  const title = lang === 'hi' ? `बिहार बोर्ड ${cls} ${s.name.hi} महत्वपूर्ण प्रश्न 2027` : `Bihar Board ${cls} ${s.name.en} important questions 2027`;
  return (
    <>
      <Seo title={title} description={`${t('important.title')} · ${p(s.name)}`} path={path} lang={lang} alternates={{ hi: subjectImportantPath(s, 'hindi'), en: subjectImportantPath(s, 'english') }} />
      <nav className="py-3 text-[14px] muted" aria-label="Breadcrumb"><Link className="link" to={subjectPath(s, medium)}>{p(s.name)}</Link></nav>
      <h1 className="h1 mb-4">{t('important.title')}</h1>
      <Suspense fallback={<Skeleton lines={8} />}><List entries={entries} s={s} path={path} /></Suspense>
    </>
  );
}
