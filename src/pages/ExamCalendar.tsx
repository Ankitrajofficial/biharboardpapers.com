import { Suspense, use } from 'react';
import { Seo } from '@/components/Seo';
import { Skeleton } from '@/components/Loading';
import { loadExamCalendar } from '@/content/loader';
import { formatDate } from '@/lib/dates';
import { useLang } from '@/lib/hooks';
import { siteConfig } from '@/config/site';

function Body() {
  const cal = use(loadExamCalendar());
  const { t, lang } = useLang();
  return (
    <ul className="grid gap-3">
      {cal.exams.map((e) => (
        <li key={e.class + e.year} className="card p-4">
          <p className="font-bold text-[18px]">{t(e.class === 'class-10' ? 'class.10' : 'class.12')} · {e.year}</p>
          <p>{formatDate(e.start, lang)} {t('calendar.from')} {formatDate(e.end, lang)} {t('calendar.to')}</p>
          <p className="mt-1"><span className={e.status === 'official' ? 'badge-free' : 'badge-sample'}>{e.status === 'official' ? t('home.countdown.official') : t('home.countdown.expected')}</span></p>
          {e.note && <p className="muted mt-1">{e.note}</p>}
        </li>
      ))}
    </ul>
  );
}

export default function ExamCalendarPage() {
  const { t, lang } = useLang();
  return (
    <>
      <Seo title={t('calendar.title')} description={t('calendar.officialNote')} path="/exam-calendar" lang={lang} />
      <h1 className="h1 py-4">{t('calendar.title')}</h1>
      <Suspense fallback={<Skeleton lines={4} />}><Body /></Suspense>
      <p className="muted mt-4">{t('home.countdown.update')} <a className="link" href={siteConfig.official.home} target="_blank" rel="noopener noreferrer">{t('calendar.officialNote')} ↗</a></p>
    </>
  );
}
