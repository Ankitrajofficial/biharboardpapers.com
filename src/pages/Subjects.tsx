import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Search } from 'lucide-react';
import { Seo } from '@/components/Seo';
import { SubjectGrid } from '@/components/SubjectGrid';
import { StreamToggle } from '@/components/StreamToggle';
import { ClassCards, MediumCards, StreamCards } from '@/components/ChooseCards';
import { subjectsFor, getSubject, type Subject, type SubjectGroup } from '@/data/subjects';
import { useLang, useHydrated } from '@/lib/hooks';
import { prefsComplete, setClass, setMedium, setStream } from '@/lib/prefs';
import { filterSearch } from '@/lib/search';
import { index } from '@/content/loader';
import { chapterPath } from '@/lib/paths';

export default function SubjectsPage() {
  const { t, lang, prefs, p } = useLang();
  const hydrated = useHydrated();
  const [q, setQ] = useState('');
  const complete = hydrated && prefsComplete(prefs);
  const classId = prefs.classId ?? 'class-12';
  const medium = prefs.medium ?? 'hindi';
  const all = useMemo(() => subjectsFor(classId, prefs.stream), [classId, prefs.stream]);

  const found = useMemo(() => {
    if (!q.trim()) return null;
    const subj = filterSearch(q, all.map((s) => ({ s, terms: [s.name.hi, s.name.en, s.slug.hi, s.slug.en, ...s.aliases] }))).map((x) => x.s);
    const chapters = filterSearch(
      q,
      index.filter((c) => c.class === classId && c.medium === medium).map((c) => ({ c, terms: [c.title, c.slug, ...c.aliases] })),
    ).map((x) => x.c);
    return { subj, chapters };
  }, [q, all, classId, medium]);

  const groups: Array<{ g: SubjectGroup; label: string }> = [
    { g: 'core', label: t('subjects.core') },
    { g: 'compulsory_language', label: t('subjects.languages') },
    { g: 'elective', label: t('subjects.elective') },
    { g: 'additional', label: t('subjects.additional') },
  ];

  return (
    <>
      <Seo title={t('subjects.all')} description={t('home.subjects.title')} path="/subjects" lang={lang} />
      <h1 className="h1 py-4">{t('subjects.all')}</h1>
      {!complete ? (
        <div className="max-w-md space-y-6">
          {!prefs.classId || !hydrated ? <ClassCards value={prefs.classId} onChange={setClass} /> : !prefs.medium ? <MediumCards value={prefs.medium} onChange={setMedium} /> : <StreamCards value={prefs.stream} onChange={setStream} />}
        </div>
      ) : (
        <>
          <StreamToggle />
          <label className="card flex items-center gap-2 px-3 min-h-14 mb-5">
            <Search aria-hidden="true" className="text-muted" />
            <span className="sr-only">{t('action.search')}</span>
            <input className="flex-1 min-w-0 bg-transparent outline-none text-[17px]" placeholder={t('subjects.search')} value={q} onChange={(e) => setQ(e.target.value)} type="search" data-testid="subject-search" />
          </label>
          {found ? (
            <section>
              {found.subj.length === 0 && found.chapters.length === 0 && <p className="muted">{t('subjects.noResult')}</p>}
              {found.subj.length > 0 && <SubjectGrid subjects={found.subj} medium={medium} />}
              {found.chapters.length > 0 && (
                <ul className="grid gap-2 mt-4">
                  {found.chapters.map((c) => {
                    const s = getSubject(c.class, c.subjectId)!;
                    return (
                      <li key={c.id + c.medium}>
                        <Link className="card-tap" to={chapterPath(s, medium, c)}>
                          <span className="chip">{p(s.name)}</span>
                          <span className="font-semibold">{c.chapterNumber}. {c.title}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          ) : (
            groups.map(({ g, label }) => {
              const list: Subject[] = all.filter((s) => s.group === g);
              if (!list.length) return null;
              return (
                <section key={g} className="mb-6" aria-labelledby={`g-${g}`}>
                  <h2 id={`g-${g}`} className="h2 mb-3">{label}</h2>
                  <SubjectGrid subjects={list} medium={medium} />
                </section>
              );
            })
          )}
        </>
      )}
    </>
  );
}
