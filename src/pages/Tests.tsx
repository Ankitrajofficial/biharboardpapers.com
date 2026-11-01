import { Link } from 'react-router';
import { ClipboardList, Lock } from 'lucide-react';
import { Seo } from '@/components/Seo';
import { EmptyState, Skeleton } from '@/components/Loading';
import { useLang, useHydrated } from '@/lib/hooks';
import { usePublic } from '@/lib/publicApi';
import { useAccount } from '@/lib/account';

type Bi = { hi: string; en: string };
interface TestItem { id: string; title: Bi; type: string; durationMin: number; totalQuestions: number; attemptLimit: number; startAt: string | null; endAt: string | null; liveStatus: 'scheduled' | 'live' | 'closed'; attempted: boolean }
interface SeriesItem { id: string; title: Bi; description: Bi; class: string; access: 'free' | 'plan'; plans: string[]; color: string; accessible: boolean; tests: TestItem[] }

export default function TestsPage() {
  const { t, lang, p, prefs } = useLang();
  const hydrated = useHydrated();
  const { token } = useAccount();
  const { data, loading } = usePublic<{ series: SeriesItem[] }>(hydrated ? `/tests?class=${prefs.classId ?? ''}&t=${token ? 1 : 0}` : null, 30);
  const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleString(lang === 'hi' ? 'hi-IN' : 'en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '');
  return (
    <>
      <Seo title={t('student.tests')} description={t('mock.full')} path="/tests" lang={lang} />
      <h1 className="h1 py-4">{t('student.tests')}</h1>
      <p className="muted mb-4"><Link className="link" to="/mock-test">{t('mock.title')} →</Link></p>
      {!hydrated || loading ? <Skeleton lines={4} /> : !data?.series.length ? <EmptyState text={t('student.tests.none')} /> : (
        <div className="space-y-5">
          {data.series.map((s) => (
            <section key={s.id} className={`tone-${s.color}`} aria-labelledby={`s-${s.id}`}>
              <div className="flex items-center gap-2 mb-2"><h2 id={`s-${s.id}`} className="h2 flex-1">{p(s.title)}</h2>{s.access === 'plan' && !s.accessible && <span className="badge-lock"><Lock size={13} aria-hidden="true" /> {t('student.tests.planRequired')}</span>}</div>
              {p(s.description) && <p className="muted mb-2">{p(s.description)}</p>}
              <ul className="grid gap-2">
                {s.tests.map((x) => (
                  <li key={x.id}>
                    <Link to={`/tests/${x.id}`} className="card-tap" data-testid={`test-${x.id}`}>
                      <span className="icon"><ClipboardList size={20} /></span>
                      <span className="flex-1 min-w-0"><span className="block font-bold">{p(x.title)}</span><span className="meta block">{x.durationMin} min · {x.attemptLimit}/{x.totalQuestions} · {x.startAt ? fmt(x.startAt) : ''}{x.endAt ? ` → ${fmt(x.endAt)}` : ''}</span></span>
                      <span className={x.liveStatus === 'live' ? 'badge-free' : 'badge-lock'}>{x.attempted ? t('student.tests.attempted') : t(`student.tests.${x.liveStatus === 'scheduled' ? 'upcoming' : x.liveStatus}`)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
