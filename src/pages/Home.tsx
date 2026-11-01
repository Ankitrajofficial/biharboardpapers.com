import { Suspense } from 'react';
import { Link, useNavigate } from 'react-router';
import { ExternalLink, FileText, History, ListChecks } from 'lucide-react';
import { Seo } from '@/components/Seo';
import { ClassCards, MediumCards, StreamCards } from '@/components/ChooseCards';
import { Countdown } from '@/components/Countdown';
import { SubjectGrid } from '@/components/SubjectGrid';
import { StreamToggle } from '@/components/StreamToggle';
import { PosterBanner } from '@/components/PosterBanner';
import { LatestUpdates } from '@/components/LatestUpdates';
import { Skeleton } from '@/components/Loading';
import { siteConfig } from '@/config/site';
import { orderedSubjectsFor } from '@/data/subjects';
import { useLang, useHydrated } from '@/lib/hooks';
import { prefsComplete, setClass, setMedium, setStream } from '@/lib/prefs';
import { track } from '@/lib/analytics';
import { mockListPath, papersPath } from '@/lib/paths';

function Hero() {
  const { t } = useLang();
  return (
    <section className="flex items-center gap-4 py-4">
      <svg width="72" height="72" viewBox="0 0 64 64" aria-hidden="true" className="shrink-0">
        <defs><linearGradient id="hero-g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#3B82F6" /><stop offset="1" stopColor="#22D3EE" /></linearGradient></defs>
        <path d="M12 18c6-3 12-3 18 0v30c-6-3-12-3-18 0z" fill="#fff" stroke="url(#hero-g)" strokeWidth="3.5" strokeLinejoin="round" />
        <path d="M52 18c-6-3-12-3-18 0v30c6-3 12-3 18 0z" fill="#fff" stroke="url(#hero-g)" strokeWidth="3.5" strokeLinejoin="round" />
        <path d="M18 26h8M18 32h8M38 26h8M38 32h8" stroke="#0F1B3D" strokeWidth="2.5" strokeLinecap="round" opacity=".5" />
      </svg>
      <div>
        <h1 className="h1">{t('home.hero.title')}</h1>
        <p className="muted text-[16px]">{t('home.hero.sub')}</p>
      </div>
    </section>
  );
}

function OfficialLinks() {
  const { t } = useLang();
  const links = [
    { href: siteConfig.official.results, label: t('home.official.results') },
    { href: siteConfig.official.admitCard, label: t('home.official.admit') },
    { href: siteConfig.official.registration, label: t('home.official.registration') },
    { href: siteConfig.official.notices, label: t('home.official.notices') },
  ];
  return (
    <section className="card-static mt-6" aria-labelledby="official-h">
      <h2 id="official-h" className="h2 mb-1">{t('home.official.title')}</h2>
      <p className="muted mb-3">{t('home.official.note')}</p>
      <ul className="grid grid-cols-2 gap-2">
        {links.map((l) => (
          <li key={l.label}>
            <a className="card-tap min-h-12 font-semibold justify-between" href={l.href} target="_blank" rel="noopener noreferrer">
              {l.label} <ExternalLink size={16} aria-hidden="true" />
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function HomePage() {
  const { t, lang, prefs } = useLang();
  const hydrated = useHydrated();
  const nav = useNavigate();
  const complete = hydrated && prefsComplete(prefs);
  const title = lang === 'hi' ? 'बिहार बोर्ड पढ़ाई — कक्षा 10 और 12 की तैयारी 2027' : 'Bihar Board Padhai — Class 10 & 12 preparation 2027';
  const desc = lang === 'hi'
    ? 'बिहार बोर्ड (BSEB) कक्षा 10 और 12 के लिए पाठ के नोट्स, ऑब्जेक्टिव प्रश्न, मॉडल पेपर और मॉक टेस्ट — हिंदी और अंग्रेज़ी माध्यम में, मुफ़्त।'
    : 'Chapter notes, objective questions, model papers and mock tests for Bihar Board (BSEB) Class 10 and 12 — in Hindi and English medium, free.';

  return (
    <>
      <Seo title={title} description={desc} path="/" lang={lang} alternates={{ hi: '/', en: '/' }}
        jsonLd={{ '@context': 'https://schema.org', '@type': 'WebSite', name: siteConfig.name.en, url: siteConfig.origin, inLanguage: ['hi', 'en'] }} />
      <PosterBanner />
      <Hero />

      <Suspense fallback={<Skeleton lines={2} />}>
        {prefs.classId ? <Countdown classId={prefs.classId} /> : (
          <div className="grid gap-3 sm:grid-cols-2">
            <Countdown classId="class-10" />
            <Countdown classId="class-12" />
          </div>
        )}
      </Suspense>

      {!complete && (
        <section className="mt-6 space-y-6" data-testid="home-choose">
          {!prefs.classId || !hydrated ? (
            <div>
              <h2 className="h2 mb-3">{t('choose.class.title')}</h2>
              <ClassCards value={prefs.classId} onChange={(c) => { setClass(c); track('class_selected', { value: c }); }} />
            </div>
          ) : !prefs.medium ? (
            <div>
              <h2 className="h2 mb-3">{t('choose.medium.title')}</h2>
              <MediumCards value={prefs.medium} onChange={(m) => { setMedium(m); track('medium_selected', { value: m }); }} />
            </div>
          ) : (
            <div>
              <h2 className="h2 mb-3">{t('choose.stream.title')}</h2>
              <StreamCards value={prefs.stream} onChange={(s) => { setStream(s); track('stream_selected', { value: s }); }} />
            </div>
          )}
          <p className="muted">{t('choose.saved')}</p>
        </section>
      )}

      {complete && prefs.classId && prefs.medium && (
        <>
          <section className="mt-6" aria-labelledby="subjects-h">
            <h2 id="subjects-h" className="h2 mb-3">{t('home.subjects.title')}</h2>
            <StreamToggle />
            <SubjectGrid subjects={orderedSubjectsFor(prefs.classId, prefs.stream).slice(0, 6)} medium={prefs.medium} compact />
            <Link to="/subjects" className="btn-secondary mt-3">{t('subjects.all')}</Link>
          </section>
          <section className="mt-6" aria-labelledby="quick-h">
            <h2 id="quick-h" className="h2 mb-3">{t('home.quick.title')}</h2>
            <ul className="grid gap-2 sm:grid-cols-3">
              <li><button type="button" className="card-tap font-semibold" onClick={() => nav(mockListPath() + '?quick=10')}><ListChecks aria-hidden="true" /> {t('home.quick.today')}</button></li>
              <li><Link className="card-tap font-semibold" to={papersPath(prefs.classId)}><FileText aria-hidden="true" /> {t('home.quick.model')}</Link></li>
              <li><Link className="card-tap font-semibold" to={papersPath(prefs.classId) + '&type=previous_year'}><History aria-hidden="true" /> {t('home.quick.pyq')}</Link></li>
            </ul>
          </section>
        </>
      )}

      <LatestUpdates />
      <OfficialLinks />
    </>
  );
}

export default HomePage;
