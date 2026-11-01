import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router';
import { BookOpen, CalendarDays, ClipboardList, CreditCard, FileText, HelpCircle, Home, IdCard, Info, Library, LogIn, LogOut, Newspaper, Shield, UserRound, X } from 'lucide-react';
import { useLang } from '@/lib/hooks';
import { logout, useAccount } from '@/lib/account';
import { siteConfig } from '@/config/site';

interface Item { to?: string; href?: string; label: string; Icon: typeof Home }

/** Exactly one item is active: the longest route that matches the current pathname. */
export function activeDrawerPath(pathname: string, paths: string[]): string | null {
  let best: string | null = null;
  for (const p of paths) {
    const hit = p === '/' ? pathname === '/' : pathname === p || pathname.startsWith(p + '/');
    if (hit && (best === null || p.length > best.length)) best = p;
  }
  return best;
}

/** Left slide-in drawer: fixed 56px header, separate scrolling list, dim overlay, Esc/overlay/X close, closes on route change, focus trapped. */
export function Drawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useLang();
  const { account } = useAccount();
  const loc = useLocation();
  const panel = useRef<HTMLDivElement>(null);
  const prevFocus = useRef<HTMLElement | null>(null);
  useEffect(() => { onClose(); }, [loc.pathname]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!open) return;
    prevFocus.current = document.activeElement as HTMLElement;
    const focusables = () => Array.from(panel.current?.querySelectorAll<HTMLElement>('a[href],button:not([disabled])') ?? []);
    focusables()[0]?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Tab') { const f = focusables(); if (!f.length) return; const first = f[0], last = f[f.length - 1]; if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); } }
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; prevFocus.current?.focus(); };
  }, [open, onClose]);

  const items: Item[] = [
    { to: '/', label: t('nav.home'), Icon: Home },
    { to: '/subjects', label: t('nav.subjects'), Icon: Library },
    { to: '/tests', label: t('nav.testsFull'), Icon: ClipboardList },
    { to: '/papers', label: t('nav.papersFull'), Icon: FileText },
    { to: '/syllabus', label: t('nav.syllabus'), Icon: BookOpen },
    { to: '/updates', label: t('nav.updates'), Icon: Newspaper },
    { to: '/my-study', label: t('nav.myStudy'), Icon: UserRound },
    { to: '/my-plan', label: t('nav.myPlan'), Icon: CreditCard },
    { to: '/admit-card', label: t('nav.admitCard'), Icon: IdCard },
    { to: '/plans', label: t('nav.plansPricing'), Icon: CalendarDays },
    ...(account ? [] : [{ to: '/login', label: t('action.login'), Icon: LogIn }]),
    { to: '/about', label: t('footer.about'), Icon: Info },
    { href: `https://wa.me/${siteConfig.contact.whatsappNumber}`, label: t('nav.help'), Icon: HelpCircle },
    { to: '/disclaimer', label: t('nav.legal'), Icon: Shield },
  ];
  const active = activeDrawerPath(loc.pathname, items.map((i) => i.to).filter((x): x is string => !!x));

  return (
    <div className={`fixed inset-0 z-[60] ${open ? 'visible' : 'invisible pointer-events-none'}`} style={{ transition: 'visibility 200ms' }} aria-hidden={!open}>
      <div className={`absolute inset-0 bg-[rgba(15,27,61,0.45)] transition-opacity duration-200 ${open ? 'opacity-100' : 'opacity-0'}`} onClick={onClose} data-testid="drawer-overlay" />
      <div ref={panel} role="dialog" aria-modal="true" aria-label={t('nav.menu')} data-testid="drawer" className={`absolute inset-y-0 left-0 z-[70] w-[80%] max-w-[320px] h-dvh bg-white rounded-r-2xl shadow-[0_8px_32px_rgba(15,27,61,0.25)] flex flex-col transition-transform duration-200 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="drawer-head">
          <span className="w-8 h-8 rounded-lg grid place-items-center text-white" style={{ background: 'linear-gradient(135deg,#3B82F6,#22D3EE)' }} aria-hidden="true"><BookOpen size={18} /></span>
          <span className="font-bold flex-1 truncate">{t('app.name')}</span>
          <button type="button" className="btn-ghost btn-icon" onClick={onClose} aria-label={t('nav.closeMenu')} data-testid="drawer-close"><X /></button>
        </div>
        <nav className="drawer-list" aria-label={t('nav.menu')} data-testid="drawer-list">
          {items.map((i) => i.href ? (
            <a key={i.label} href={i.href} target="_blank" rel="noopener noreferrer" className="drawer-item"><i.Icon size={22} aria-hidden="true" /> <span className="truncate">{i.label} ↗</span></a>
          ) : (
            <Link key={i.to} to={i.to!} className="drawer-item" aria-current={active === i.to ? 'page' : undefined} data-testid={`drawer-${i.to === '/' ? 'home' : i.to!.slice(1)}`}><i.Icon size={22} aria-hidden="true" /> <span className="truncate">{i.label}</span></Link>
          ))}
          {account && <LogoutRow key={loc.pathname + String(open)} masked={account.identityMasked} onDone={onClose} />}
        </nav>
      </div>
    </div>
  );
}

/** Logout is an action, not a link: deep-red row at the bottom with its own confirm. Remounted (reset) on route change or open/close. */
function LogoutRow({ masked, onDone }: { masked: string; onDone: () => void }) {
  const { t } = useLang();
  const [ask, setAsk] = useState(false);
  return (
    <div className="drawer-logout">
      {ask ? (
        <div className="px-4 py-2 space-y-2" role="alertdialog" aria-label={t('auth.logoutConfirm')}>
          <p className="font-semibold">{t('auth.logoutConfirm')}</p>
          <div className="flex gap-2">
            <button type="button" className="btn-secondary btn-sm" onClick={() => setAsk(false)}>{t('admin.cancel')}</button>
            <button type="button" className="btn-primary btn-sm" onClick={() => { logout(false); onDone(); }} data-testid="drawer-logout-confirm">{t('action.logout')}</button>
          </div>
        </div>
      ) : (
        <button type="button" className="drawer-item drawer-item-danger w-full" onClick={() => setAsk(true)} data-testid="drawer-logout"><LogOut size={22} aria-hidden="true" /> <span className="truncate">{t('action.logout')} · {masked}</span></button>
      )}
    </div>
  );
}
