import { Suspense, use } from 'react';
import { Link, useParams } from 'react-router';
import { ExternalLink } from 'lucide-react';
import { Seo } from '@/components/Seo';
import { Skeleton } from '@/components/Loading';
import { getSubjectBySlug, type Subject } from '@/data/subjects';
import { useLang } from '@/lib/hooks';
import { chaptersFor, loadSyllabus } from '@/content/loader';
import { chapterPath, isClassId, subjectPath, syllabusPath } from '@/lib/paths';
import type { Medium } from '@/content/types';
import { NotFoundPage } from './Static';

function Body({ s, medium }: { s: Subject; medium: Medium }) {
  const syl = use(loadSyllabus());
  const { t, lang, p } = useLang();
  const entry = syl.subjects.find((x) => x.class === s.class && x.id === s.id);
  const content = chaptersFor(s.class, medium, s.id);
  const textbook = lang === 'hi' ? s.textbookUrl.hi || s.textbookUrl.en : s.textbookUrl.en || s.textbookUrl.hi;
  const statusKey = entry?.status === 'verified_official' ? 'syllabus.status.official' : entry?.status === 'verified_textbook' ? 'syllabus.status.textbook' : 'syllabus.status.gap';
  return (
    <div className="space-y-5">
      <dl className="card p-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
        <dt className="muted">{t('subject.code')}</dt><dd className="font-bold">{(entry?.codes ?? s.codes).join(' / ')}</dd>
        <dt className="muted">{t('syllabus.total')}</dt><dd className="font-bold">{entry?.marks.total ?? s.marks.theory + s.marks.practical}{entry?.marks.theory ? ` (${t('subject.theory')} ${entry.marks.theory}${entry.marks.practical ? ` + ${t('subject.practical')} ${entry.marks.practical}` : ''})` : ''}</dd>
        {entry?.marks.split && <><dt className="muted">{t('syllabus.marksSplit')}</dt><dd>{entry.marks.split}</dd></>}
        <dt className="muted">{t('subject.objectivePattern')}</dt><dd className="font-bold">{s.objective.given} {t('subject.given')}, {s.objective.attempt} {t('subject.attempt')}</dd>
        {entry?.textbooks.length ? <><dt className="muted">{t('syllabus.textbooks')}</dt><dd>{entry.textbooks.join('; ')}</dd></> : null}
        <dt className="muted">{t('syllabus.session')}</dt><dd>{syl.meta.session}</dd>
      </dl>
      <p className="flex flex-wrap items-center gap-2"><span className={entry?.status === 'gap' ? 'badge-sample' : 'badge-free'}>{t(statusKey)}</span> <span className="muted">{t('syllabus.warning')}</span></p>
      {entry?.note && <p className="muted">{entry.note}</p>}
      {textbook && <a className="card-tap font-semibold" href={textbook} target="_blank" rel="noopener noreferrer"><ExternalLink aria-hidden="true" /> {t('syllabus.textbookLink')} ↗</a>}

      <section><h2 className="h2 mb-2">{t('subject.chapters')}</h2>
        {!entry || entry.chapterCount === 0 ? <p className="muted">{t('syllabus.status.gap')}</p> : (
          <div className="space-y-4">
            {entry.sections.filter((sec) => sec.chapters.length).map((sec) => (
              <div key={sec.title}>
                {entry.sections.length > 1 && <h3 className="font-bold text-[17px] mb-1">{sec.title}</h3>}
                <ol className="grid gap-2">
                  {sec.chapters.map((ch) => {
                    const c = content.find((x) => x.syllabus?.section === sec.title && x.syllabus.no === ch.no);
                    const title = c?.title ?? p(ch.title);
                    return c ? (
                      <li key={ch.no}><Link className="card-tap font-semibold" to={chapterPath(s, medium, c)}>{ch.no}. {title}</Link></li>
                    ) : (
                      <li key={ch.no} className="card-tap text-muted"><span>{ch.no}. {title}</span><span className="chip ml-auto">{t('syllabus.comingSoon')}</span></li>
                    );
                  })}
                </ol>
              </div>
            ))}
          </div>
        )}
      </section>
      {entry?.sources.length ? (
        <p className="muted text-[14px]">{t('syllabus.source')}: {entry.sources.map((u, i) => <a key={u} className="link mr-2" href={u} target="_blank" rel="noopener noreferrer">[{i + 1}] ↗</a>)}</p>
      ) : null}
    </div>
  );
}

export default function SyllabusPage() {
  const { classId: cp, subject: slug } = useParams();
  const { t, lang, p, prefs } = useLang();
  const classId = isClassId(cp) ? cp : prefs.classId ?? 'class-12';
  const s = slug ? getSubjectBySlug(classId, slug) : undefined;
  if (!s) return <NotFoundPage />;
  const medium = prefs.medium ?? 'hindi';
  return (
    <>
      <Seo title={`${t('syllabus.title')}: ${p(s.name)} — ${t(classId === 'class-10' ? 'class.10' : 'class.12')} (BSEB ${s.codes[0]})`} description={`${t('syllabus.marksSplit')} · ${t('subject.objectivePattern')} · ${t('subject.chapters')}`} path={syllabusPath(s)} lang={lang} />
      <nav className="py-3 text-[14px] muted"><Link className="link" to={subjectPath(s, medium)}>{p(s.name)}</Link></nav>
      <h1 className="h1 mb-4">{t('syllabus.title')}: {p(s.name)}</h1>
      <Suspense fallback={<Skeleton lines={8} />}><Body s={s} medium={medium} /></Suspense>
    </>
  );
}
