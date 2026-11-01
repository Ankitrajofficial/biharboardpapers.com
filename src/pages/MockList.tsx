import { Suspense, use } from 'react';
import { Link, useSearchParams } from 'react-router';
import { ClipboardList, Play } from 'lucide-react';
import { Seo } from '@/components/Seo';
import { Skeleton } from '@/components/Loading';
import { StatusBadge } from '@/components/Badges';
import { ClassCards, MediumCards } from '@/components/ChooseCards';
import { loadMockIndex } from '@/content/loader';
import { getSubject } from '@/data/subjects';
import { useLang, useHydrated } from '@/lib/hooks';
import { setClass, setMedium } from '@/lib/prefs';
import { useProgress } from '@/lib/progress';

function List({ subjectId, quick }: { subjectId: string | null; quick: string | null }) {
  const all = use(loadMockIndex());
  const { t, prefs, p } = useLang();
  const progress = useProgress();
  const classId = prefs.classId ?? 'class-12';
  const medium = prefs.medium ?? 'hindi';
  const list = all.filter((m) => m.class === classId && m.medium === medium && (!subjectId || m.subjectId === subjectId));
  if (!list.length) return <p className="muted">{t('mock.none')}</p>;
  return (
    <ul className="grid gap-3">
      {progress.activeMock && list.some((m) => m.id === progress.activeMock?.mockId) && (
        <li><Link to={`/mock-test/${progress.activeMock.mockId}`} className="card-tap selected font-bold"><Play aria-hidden="true" /> {t('mock.resume')}</Link></li>
      )}
      {list.map((m) => {
        const s = getSubject(m.class, m.subjectId);
        return (
          <li key={m.id}>
            <Link to={`/mock-test/${m.id}${quick ? `?quick=${quick}` : ''}`} className="card-tap" data-testid={`mock-${m.id}`}>
              <ClipboardList aria-hidden="true" className="shrink-0" />
              <span className="flex-1 min-w-0">
                <span className="block font-bold">{m.title}</span>
                <span className="muted block text-[14px]">{s ? p(s.name) : m.subjectId} · {t('mock.pattern', { given: m.given, attempt: m.attempt })}</span>
              </span>
              <StatusBadge status={m.status} short />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export default function MockListPage() {
  const { t, lang, prefs } = useLang();
  const hydrated = useHydrated();
  const [sp] = useSearchParams();
  return (
    <>
      <Seo title={t('mock.title')} description={t('mock.full')} path="/mock-test" lang={lang} />
      <h1 className="h1 py-4">{t('mock.title')}</h1>
      {hydrated && (!prefs.classId || !prefs.medium) ? (
        <div className="max-w-md space-y-6">
          {!prefs.classId ? <ClassCards value={prefs.classId} onChange={setClass} /> : <MediumCards value={prefs.medium} onChange={setMedium} />}
        </div>
      ) : (
        <Suspense fallback={<Skeleton lines={4} />}><List subjectId={sp.get('subject')} quick={sp.get('quick')} /></Suspense>
      )}
      <p className="muted mt-4">{t('mock.saved')}</p>
    </>
  );
}
