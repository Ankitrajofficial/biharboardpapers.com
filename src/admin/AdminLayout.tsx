import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router';
import { BarChart3, ClipboardList, FileText, Image, LogOut, Menu, Newspaper, ScrollText, Users, Wallet, X, Shield } from 'lucide-react';
import { Seo } from '@/components/Seo';
import { useLang, useHydrated } from '@/lib/hooks';
import { adminApi, adminStore, useAdmin } from './api';
import { Segmented } from '@/components/Segmented';
import { setUiLang } from '@/lib/prefs';
import type { TranslationKey } from '@/i18n';

const items = (owner: boolean) => [
  { to: '/admin', end: true, key: 'admin.dashboard', Icon: BarChart3 },
  { to: '/admin/tests', key: 'admin.tests', Icon: ClipboardList },
  { to: '/admin/updates', key: 'admin.updates', Icon: Newspaper },
  { to: '/admin/posters', key: 'admin.posters', Icon: Image },
  { to: '/admin/users', key: 'admin.users', Icon: Users },
  ...(owner ? [{ to: '/admin/payments', key: 'admin.payments', Icon: Wallet }] : []),
  { to: '/admin/content', key: 'admin.content', Icon: FileText },
  ...(owner ? [{ to: '/admin/team', key: 'admin.team', Icon: Shield }] : []),
  { to: '/admin/audit', key: 'admin.audit', Icon: ScrollText },
] as const;

export default function AdminLayout() {
  const { t, lang } = useLang();
  const { token, admin } = useAdmin();
  const hydrated = useHydrated();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  useEffect(() => { adminStore.hydrate(); }, []);
  useEffect(() => {
    if (!hydrated) return;
    if (!token) { nav('/admin/login', { replace: true }); return; }
    adminApi<{ admin: typeof admin }>('/me').then((r) => adminStore.set((s) => ({ ...s, admin: r.admin }))).catch(() => nav('/admin/login', { replace: true }));
  }, [hydrated, token, nav]);
  if (!hydrated || !admin) return <Seo title={t('admin.title')} description="" path="/admin" lang={lang} noindex />;
  const owner = admin.role === 'owner';
  const links = items(owner).map((i) => (
    <NavLink key={i.to} to={i.to} end={'end' in i && i.end} className="nav-item flex items-center gap-3 px-4 min-h-12" onClick={() => setOpen(false)}>
      <i.Icon size={20} aria-hidden="true" /> {t(i.key as TranslationKey)}
    </NavLink>
  ));
  const logout = () => { adminApi('/auth/logout', {}).catch(() => {}); adminStore.set({ token: null, admin: null }); nav('/admin/login'); };
  return (
    <div className="min-h-dvh md:grid md:grid-cols-[240px_1fr]">
      <Seo title={t('admin.title')} description="" path="/admin" lang={lang} noindex />
      <aside className="hidden md:flex flex-col gap-1 p-3 bg-white border-r border-line sticky top-0 h-dvh">
        <p className="font-bold text-[18px] px-4 py-3">{t('admin.title')}</p>
        {links}
        <div className="mt-auto px-4 py-3 space-y-2">
          <p className="meta">{admin.name ?? admin.phoneMasked} · {t(`admin.role.${admin.role}`)}</p>
          <Segmented value={lang} label={t('lang.toggle')} options={[{ value: 'hi', label: 'हिंदी' }, { value: 'en', label: 'EN' }]} onChange={setUiLang} />
          <button type="button" className="btn-secondary btn-sm" onClick={logout}><LogOut size={16} aria-hidden="true" /> {t('admin.logout')}</button>
        </div>
      </aside>
      <div className="min-w-0">
        <header className="site-header sticky top-0 z-20 flex items-center gap-2 px-4 min-h-14 md:hidden">
          <button type="button" className="btn-ghost btn-icon" aria-label={t('nav.menu')} aria-expanded={open} onClick={() => setOpen(!open)} data-testid="admin-menu">{open ? <X /> : <Menu />}</button>
          <span className="font-bold">{t('admin.title')}</span>
          <span className="meta ml-auto">{t(`admin.role.${admin.role}`)}</span>
        </header>
        {open && (
          <nav className="md:hidden bg-white border-b border-line p-2 grid gap-1" aria-label="Admin">
            {links}
            <div className="flex items-center gap-2 px-4 py-2">
              <Segmented value={lang} label={t('lang.toggle')} options={[{ value: 'hi', label: 'हिंदी' }, { value: 'en', label: 'EN' }]} onChange={setUiLang} />
              <button type="button" className="btn-secondary btn-sm" onClick={logout}><LogOut size={16} aria-hidden="true" /> {t('admin.logout')}</button>
            </div>
          </nav>
        )}
        <main className="p-4 max-w-6xl" lang={lang}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
