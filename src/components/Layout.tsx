import { useEffect } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import { useCallback, useState } from 'react';
import { BookOpen, ClipboardList, Home, Library, Menu, UserRound } from 'lucide-react';
import { Drawer } from './Drawer';
import { Segmented } from './Segmented';
import { getSubjectBySlug } from '@/data/subjects';
import { chaptersFor, index } from '@/content/loader';
import { isClassId, isMedium } from '@/lib/paths';
import type { Medium } from '@/content/types';
import { siteConfig } from '@/config/site';
import { useLang, useHydrated, useOnline } from '@/lib/hooks';
import { prefsStore, setUiLang, setPrefs, setMedium, setClass } from '@/lib/prefs';
import { progressStore } from '@/lib/progress';
import { accountStore, refreshAccount } from '@/lib/account';
import { initAnalytics } from '@/lib/analytics';
import { initPwa } from '@/lib/pwa';
import { ErrorBoundary } from './Loading';

/** If the current page is a subject/chapter page, return the same page in the other medium. */
function alternatePath(pathname: string, medium: Medium): string | null {
  const [, cls, med, subjectSlug, chapterSlug, rest] = pathname.split('/');
  if (!isClassId(cls) || !isMedium(med) || !subjectSlug || med === medium) return null;
  const s = getSubjectBySlug(cls, subjectSlug);
  if (!s) return null;
  const base = `/${cls}/${medium}/${medium === 'hindi' ? s.slug.hi : s.slug.en}`;
  if (!chapterSlug) return base;
  if (chapterSlug === 'objective' || chapterSlug === 'important-questions') return `${base}/${chapterSlug}`;
  const cur = index.find((c) => c.class === cls && c.medium === med && c.subjectId === s.id && c.slug === chapterSlug);
  const alt = cur && chaptersFor(cls, medium, s.id).find((c) => c.id === cur.id);
  return alt ? `${base}/${alt.slug}${rest ? `/${rest}` : ''}` : base;
}

/** Language toggle: sets the interface language and the study medium together. */
function LangToggle() {
  const { lang, t } = useLang();
  const nav = useNavigate();
  const loc = useLocation();
  const hydrated = useHydrated();
  return (
    <Segmented
      value={hydrated ? lang : null}
      label={t('lang.toggle')}
      testId="lang-toggle"
      className="w-full"
      options={[
        { value: 'hi', label: 'हिंदी', short: 'हिं', lang: 'hi', testId: 'lang-hi' },
        { value: 'en', label: 'English', short: 'EN', lang: 'en', testId: 'lang-en' },
      ]}
      onChange={(v) => {
        const medium: Medium = v === 'en' ? 'english' : 'hindi';
        setUiLang(v);
        setMedium(medium);
        const alt = alternatePath(loc.pathname, medium);
        if (alt) nav(alt, { replace: true });
      }}
    />
  );
}

/** Class toggle: switching updates the subjects immediately and is saved on the phone. */
function ClassToggle() {
  const { t, prefs } = useLang();
  const hydrated = useHydrated();
  return (
    <Segmented
      value={hydrated ? prefs.classId : null}
      label={t('choose.class.title')}
      testId="class-toggle"
      className="w-full"
      options={[
        { value: 'class-10', label: t('class.10'), short: '10', testId: 'class-10' },
        { value: 'class-12', label: t('class.12'), short: '12', testId: 'class-12' },
      ]}
      onChange={setClass}
    />
  );
}

export function Header() {
  const { t } = useLang();
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  return (
    <header className="site-header sticky top-0 z-50">
      <div className="mx-auto max-w-5xl px-2 h-14 flex items-center gap-1">
        <button type="button" className="btn-ghost btn-icon" aria-label={t('nav.openMenu')} aria-expanded={open} aria-controls="drawer" onClick={() => setOpen(true)} data-testid="menu-button"><Menu /></button>
        <Link to="/" className="flex items-center gap-2 font-bold text-[18px] min-h-12 px-1" aria-label={t('action.home')}>
          <span className="w-8 h-8 rounded-lg grid place-items-center text-white shrink-0" style={{ background: 'linear-gradient(135deg,#3B82F6,#22D3EE)' }} aria-hidden="true"><BookOpen size={18} /></span>
          <span className="truncate">{t('app.name')}</span>
        </Link>
        <nav className="hidden md:flex items-center gap-1 ml-auto" aria-label="Main">
          {[{ to: '/', l: t('nav.home') }, { to: '/subjects', l: t('nav.subjects') }, { to: '/tests', l: t('nav.tests') }, { to: '/papers', l: t('nav.papers') }, { to: '/updates', l: t('nav.updates') }, { to: '/my-study', l: t('nav.myStudy') }].map((i) => (
            <NavLink key={i.to} to={i.to} end={i.to === '/'} className="nav-item px-3 min-h-10 inline-flex items-center text-[15px]">{i.l}</NavLink>
          ))}
        </nav>
      </div>
      <div className="mx-auto max-w-5xl grid grid-cols-2 gap-2 px-4 pb-2" data-testid="toggle-row">
        <LangToggle />
        <ClassToggle />
      </div>
      <Drawer open={open} onClose={close} />
    </header>
  );
}

/** Bottom nav: exactly one item active, chosen by section. */
export function bottomNavActive(pathname: string): '/' | '/subjects' | '/mock-test' | '/my-study' | null {
  if (pathname === '/') return '/';
  if (['/my-study', '/my-plan', '/admit-card', '/login', '/plans'].some((p) => pathname === p || pathname.startsWith(p + '/'))) return '/my-study';
  if (['/mock-test', '/tests'].some((p) => pathname === p || pathname.startsWith(p + '/'))) return '/mock-test';
  if (['/subjects', '/class-10', '/class-12', '/syllabus', '/papers'].some((p) => pathname === p || pathname.startsWith(p + '/'))) return '/subjects';
  return null;
}

export function BottomNav() {
  const { t } = useLang();
  const loc = useLocation();
  const active = bottomNavActive(loc.pathname);
  const items = [
    { to: '/', label: t('nav.home'), Icon: Home },
    { to: '/subjects', label: t('nav.subjects'), Icon: Library },
    { to: '/mock-test', label: t('nav.tests'), Icon: ClipboardList },
    { to: '/my-study', label: t('nav.myStudy'), Icon: UserRound },
  ] as const;
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t border-line z-40" aria-label="Bottom" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <ul className="grid grid-cols-4 gap-1 p-1">
        {items.map(({ to, label, Icon }) => (
          <li key={to}>
            <Link to={to} aria-current={active === to ? 'page' : undefined} className="nav-item flex flex-col items-center justify-center min-h-14 text-[13px] px-1" data-testid={`bottom-${to === '/' ? 'home' : to.slice(1)}`}>
              <Icon size={22} aria-hidden="true" />
              <span>{label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function Footer() {
  const { t, prefs } = useLang();
  const doubt = `https://wa.me/${siteConfig.contact.whatsappNumber}?text=${encodeURIComponent(t('doubt.message', { class: prefs.classId ?? '-', subject: '-', chapter: '-', q: '' }))}`;
  const report = `https://wa.me/${siteConfig.contact.whatsappNumber}`;
  const groups: Array<{ title: string; items: Array<{ to?: string; href?: string; label: string }> }> = [
    { title: t('footer.study'), items: [
      { to: '/subjects', label: t('nav.subjects') },
      { to: '/mock-test', label: t('nav.mock') },
      { to: '/papers', label: t('nav.papers') },
      { to: '/exam-calendar', label: t('calendar.title') },
      { to: '/sent-up-practical', label: t('sentup.title') },
    ] },
    { title: t('footer.help'), items: [
      { href: doubt, label: t('action.askDoubt') },
      { href: report, label: t('footer.report') },
      { href: siteConfig.contact.whatsappChannel, label: t('footer.whatsapp') },
      { href: siteConfig.contact.telegramGroup, label: t('footer.telegram') },
    ] },
    { title: t('footer.info'), items: [
      { to: '/about', label: t('footer.about') },
      { to: '/plans', label: t('nav.plans') },
      { to: '/privacy', label: t('footer.privacy') },
      { to: '/disclaimer', label: t('footer.disclaimerLink') },
    ] },
  ];
  const item = 'inline-flex items-center min-h-12 text-[15px] font-semibold text-ink hover:text-deep-blue';
  return (
    <footer className="mt-12 border-t border-line bg-white">
      <div className="mx-auto max-w-5xl px-4 py-8 space-y-8">
        <div className="flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl grid place-items-center text-white shrink-0" style={{ background: 'linear-gradient(135deg,#3B82F6,#22D3EE)' }} aria-hidden="true"><BookOpen size={22} /></span>
          <div>
            <p className="font-bold text-[18px] leading-tight">{t('app.name')}</p>
            <p className="muted">{t('app.tagline')}</p>
          </div>
        </div>

        <nav className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-6" aria-label="Footer">
          {groups.map((g) => (
            <div key={g.title}>
              <h2 className="meta uppercase tracking-wide font-bold mb-1">{g.title}</h2>
              <ul>
                {g.items.map((i) => (
                  <li key={i.label}>
                    {i.to ? <Link className={item} to={i.to}>{i.label}</Link> : <a className={item} href={i.href} target="_blank" rel="noopener noreferrer">{i.label} ↗</a>}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className="notice-card space-y-3" lang="hi">
          <p className="font-bold">{t('footer.notOfficial')}</p>
          <p className="muted text-[14px]">{t('footer.disclaimer')}</p>
          <a className="btn-secondary btn-sm" href={siteConfig.official.home} target="_blank" rel="noopener noreferrer">{t('footer.official')} ↗</a>
        </div>

        <p className="muted">© {new Date().getFullYear()} {siteConfig.owner}</p>
      </div>
    </footer>
  );
}

function OfflineBanner() {
  const online = useOnline();
  const { t } = useLang();
  if (online) return null;
  return <div className="offline-banner mx-auto max-w-5xl mt-3 mx-4" role="status" data-testid="offline-banner">{t('offline.banner')}</div>;
}

export function Layout() {
  const { lang } = useLang();
  const loc = useLocation();

  useEffect(() => {
    prefsStore.hydrate();
    progressStore.hydrate();
    accountStore.hydrate();
    initAnalytics();
    initPwa();
    const ref = new URLSearchParams(window.location.search).get('ref');
    if (ref && /^[A-Za-z0-9_-]{2,32}$/.test(ref)) setPrefs({ ref });
    if (!prefsStore.get().firstVisitAt) setPrefs({ firstVisitAt: new Date().toISOString() });
    refreshAccount();
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dataset.accents = String(siteConfig.accents);
  }, [lang]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [loc.pathname]);

  return (
    <div className="min-h-dvh flex flex-col" data-lang={lang}>
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:bg-white focus:p-3 focus:z-50">Skip to content</a>
      <Header />
      <OfflineBanner />
      <main id="main" className="flex-1 mx-auto w-full max-w-5xl px-4 pb-24 md:pb-8" lang={lang}>
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </main>
      <Footer />
      <BottomNav />
    </div>
  );
}
