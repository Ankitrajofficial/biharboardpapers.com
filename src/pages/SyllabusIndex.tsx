import { Link } from 'react-router';
import { Seo } from '@/components/Seo';
import { StreamToggle } from '@/components/StreamToggle';
import { orderedSubjectsFor, subjectTone } from '@/data/subjects';
import { useLang } from '@/lib/hooks';
import { syllabusPath } from '@/lib/paths';
import { SubjectIcon } from '@/components/Icon';

export default function SyllabusIndexPage() {
  const { t, lang, p, prefs } = useLang();
  const classId = prefs.classId ?? 'class-12';
  const list = orderedSubjectsFor(classId, prefs.stream);
  return (
    <>
      <Seo title={`${t('syllabus.title')} — ${t(classId === 'class-10' ? 'class.10' : 'class.12')}`} description={t('syllabus.warning')} path="/syllabus" lang={lang} />
      <h1 className="h1 py-4">{t('syllabus.title')}</h1>
      <StreamToggle />
      <ul className="grid gap-2 sm:grid-cols-2">
        {list.map((s) => <li key={s.id} className={`tone-${subjectTone(s)}`}><Link to={syllabusPath(s)} className="card-tap"><span className="icon"><SubjectIcon name={s.icon} size={20} /></span><span className="flex-1 font-bold">{p(s.name)}</span><span className="meta">{s.codes[0]}</span></Link></li>)}
      </ul>
    </>
  );
}
