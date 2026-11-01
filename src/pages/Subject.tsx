import { Suspense, use } from 'react';
import { Link } from 'react-router';
import { BookOpen, CheckCircle2, Circle, ClipboardList, FileText, ListChecks, MessageSquareText, NotebookText } from 'lucide-react';
import { Seo } from '@/components/Seo';
import { SubjectIcon } from '@/components/Icon';
import { StatusBadge } from '@/components/Badges';
import { useSubjectRoute } from '@/lib/routeParams';
import { useLang } from '@/lib/hooks';
import { useProgress } from '@/lib/progress';
import { chaptersFor, loadSyllabus } from '@/content/loader';
import { Skeleton } from '@/components/Loading';
import type { ChapterIndexEntry, Medium } from '@/content/types';
import { subjectTone, type Subject } from '@/data/subjects';
import { chapterPath, mockListPath, papersPath, subjectImportantPath, subjectObjectivePath, subjectPath, syllabusPath } from '@/lib/paths';
import { NotFoundPage } from './Static';

export default function SubjectPage() {
  const r = useSubjectRoute();
  const { t, lang, p } = useLang();
  if (!r) return <NotFoundPage />;
  const { classId, medium, subject: s } = r;
  const chapters = chaptersFor(classId, medium, s.id);
  const cls = t(classId === 'class-10' ? 'class.10' : 'class.12');
  const title = lang === 'hi' ? `बिहार बोर्ड ${classId === 'class-10' ? '10वीं' : '12वीं'} ${s.name.hi} — नोट्स, ऑब्जेक्टिव प्रश्न, मॉडल पेपर 2027` : `Bihar Board ${classId === 'class-10' ? '10th' : '12th'} ${s.name.en} — notes, objective questions, model paper 2027`;
  const cards = [
    { to: chapters[0] ? chapterPath(s, medium, chapters[0]) : subjectPath(s, medium), Icon: NotebookText, label: t('subject.notes') },
    { to: subjectObjectivePath(s, medium), Icon: ListChecks, label: t('subject.objective'), flagship: true },
    { to: subjectImportantPath(s, medium), Icon: MessageSquareText, label: t('subject.important') },
    { to: papersPath(classId, s.id), Icon: FileText, label: t('subject.papers') },
    { to: mockListPath(s), Icon: ClipboardList, label: t('subject.mock') },
    { to: syllabusPath(s), Icon: BookOpen, label: t('subject.syllabus') },
  ];
  return (
    <>
      <Seo title={title} description={`${cls} ${p(s.name)} · ${t('subject.code')} ${s.codes.join(', ')}`} path={subjectPath(s, medium)} lang={lang}
        alternates={{ hi: subjectPath(s, 'hindi'), en: subjectPath(s, 'english') }} />
      <div className={`flex items-center gap-3 py-4 tone-${subjectTone(s)}`}>
        <span className="icon"><SubjectIcon name={s.icon} size={24} /></span>
        <div>
          <h1 className="h1">{p(s.name)}</h1>
          <p className="muted">{cls} · {t('subject.code')} {s.codes.join(', ')}</p>
        </div>
      </div>
      <ul className={`grid gap-3 sm:grid-cols-2 tone-${subjectTone(s)}`}>
        {cards.map(({ to, Icon, label, flagship }) => (
          <li key={label}>
            <Link to={to} className={`card-tap font-bold ${flagship ? 'selected' : ''}`} data-testid={`card-${label}`}>
              <Icon aria-hidden="true" className="shrink-0" /> <span>{label}</span>
            </Link>
          </li>
        ))}
      </ul>
      <section className="mt-6" aria-labelledby="ch-h">
        <h2 id="ch-h" className="h2 mb-3">{t('subject.chapters')}</h2>
        <Suspense fallback={<Skeleton lines={6} />}>
          <div className={`tone-${subjectTone(s)}`}><ChapterList s={s} medium={medium} content={chapters} /></div>
        </Suspense>
      </section>
      <p className="muted mt-4">{t('subject.verify')}</p>
    </>
  );
}

/** Official chapter list from content/syllabus.json; chapters with content are links, the rest are "coming soon". */
function ChapterList({ s, medium, content }: { s: Subject; medium: Medium; content: ChapterIndexEntry[] }) {
  const syl = use(loadSyllabus());
  const { t, p } = useLang();
  const progress = useProgress();
  const entry = syl.subjects.find((x) => x.class === s.class && x.id === s.id);
  const row = (c: ChapterIndexEntry) => {
    const done = !!progress.completed[c.id];
    return (
      <li key={c.id}>
        <Link to={chapterPath(s, medium, c)} className="card-tap" data-testid={`chapter-${c.chapterNumber}`}>
          {done ? <CheckCircle2 className="text-deep-mint shrink-0" aria-label={t('action.markedDone')} /> : <Circle className="text-line shrink-0" aria-hidden="true" />}
          <span className="flex-1 min-w-0">
            <span className="block font-semibold">{c.chapterNumber}. {c.title}</span>
            <span className="muted block text-[14px]">{c.objectiveCount} {t('subject.objective')} · {c.importantCount} {t('subject.important')}</span>
          </span>
          <StatusBadge status={c.status} short />
        </Link>
      </li>
    );
  };
  if (!entry || entry.chapterCount === 0) {
    return content.length ? <ol className="grid gap-2">{content.map(row)}</ol> : <p className="muted">{t('subject.noChapters')}</p>;
  }
  const linked = new Set<string>();
  return (
    <div className="space-y-4">
      {entry.sections.filter((sec) => sec.chapters.length).map((sec) => (
        <div key={sec.title}>
          {entry.sections.length > 1 && <h3 className="font-bold text-[17px] mb-1">{sec.title}</h3>}
          <ol className="grid gap-2">
            {sec.chapters.map((ch) => {
              const c = content.find((x) => x.syllabus?.section === sec.title && x.syllabus.no === ch.no);
              if (c) { linked.add(c.id); return row(c); }
              return (
                <li key={ch.no} className="card-tap text-muted" data-testid="chapter-soon">
                  <Circle className="text-line shrink-0" aria-hidden="true" />
                  <span className="flex-1">{ch.no}. {p(ch.title)}</span>
                  <span className="chip">{t('syllabus.comingSoon')}</span>
                </li>
              );
            })}
          </ol>
        </div>
      ))}
      {content.filter((c) => !linked.has(c.id)).length > 0 && <ol className="grid gap-2">{content.filter((c) => !linked.has(c.id)).map(row)}</ol>}
    </div>
  );
}
