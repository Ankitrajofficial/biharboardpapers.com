import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { Mail, MessageCircle } from 'lucide-react';
import { Seo } from '@/components/Seo';
import { useLang, useOnline } from '@/lib/hooks';
import { ApiError, localProgressOwnerMismatch, maskIdentity, requestOtp, syncProgress, updateProfile, useAccount, verifyOtp, type Channel } from '@/lib/account';
import { siteConfig } from '@/config/site';
import { setPrefs } from '@/lib/prefs';

type Screen = 'why' | 'dest' | 'otp' | 'name' | 'merge' | 'saved';

/** Six large boxes; auto-advance, backspace, paste and WebOTP autofill. */
function OtpBoxes({ value, onChange, disabled }: { value: string; onChange: (v: string) => void; disabled?: boolean }) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const digits = value.padEnd(6, ' ').slice(0, 6).split('');
  const set = (i: number, ch: string) => {
    const next = (value.slice(0, i) + ch + value.slice(i + 1)).replace(/\s/g, '').slice(0, 6);
    onChange(next);
    if (ch && i < 5) refs.current[i + 1]?.focus();
  };
  return (
    <div className="flex gap-2 justify-between" data-testid="otp-boxes">
      {digits.map((d, i) => (
        <input key={i} ref={(el) => { refs.current[i] = el; }} className="card w-full min-h-16 text-[28px] font-bold text-center" inputMode="numeric" autoComplete={i === 0 ? 'one-time-code' : 'off'} maxLength={6} aria-label={`OTP ${i + 1}`} value={d.trim()} disabled={disabled} data-testid={`otp-${i}`}
          onChange={(e) => { const v = e.target.value.replace(/\D/g, ''); if (v.length > 1) { onChange(v.slice(0, 6)); refs.current[Math.min(5, v.length - 1)]?.focus(); return; } set(i, v); }}
          onKeyDown={(e) => { if (e.key === 'Backspace' && !d.trim() && i > 0) refs.current[i - 1]?.focus(); }}
          onFocus={(e) => e.target.select()} />
      ))}
    </div>
  );
}

export default function LoginPage() {
  const { t, lang } = useLang();
  const nav = useNavigate();
  const [sp] = useSearchParams();
  const online = useOnline();
  const next = sp.get('next') && sp.get('next')!.startsWith('/') ? sp.get('next')! : '/my-study';
  const { account, lastIdentity, expired } = useAccount();
  const returning = !!lastIdentity;
  const [channel, setChannel] = useState<Channel>(lastIdentity?.channel ?? 'whatsapp');
  const [screen, setScreen] = useState<Screen>(returning ? 'dest' : 'why');
  const [dest, setDest] = useState(lastIdentity?.value ?? '');
  const [useSaved, setUseSaved] = useState(returning);
  const [consent, setConsent] = useState(false);
  const [code, setCode] = useState('');
  const [devCode, setDevCode] = useState<string | undefined>();
  const [err, setErr] = useState<{ kind: 'text' | 'notDelivered'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const [name, setName] = useState('');
  const [extra, setExtra] = useState('');
  const [isNew, setIsNew] = useState(false);

  useEffect(() => { if (account && screen === 'why') nav(next, { replace: true }); }, [account, nav, next, screen]);
  useEffect(() => { if (resendIn <= 0) return; const id = setTimeout(() => setResendIn(resendIn - 1), 1000); return () => clearTimeout(id); }, [resendIn]);

  const ten = dest.replace(/\D/g, '').slice(-10);
  const email = dest.trim().toLowerCase();
  const valid = channel === 'whatsapp' ? /^[6-9]\d{9}$/.test(ten) : /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(email);
  const value = channel === 'whatsapp' ? ten : email;
  const fail = (e: unknown) => {
    const a = e as ApiError;
    if (a.code === 'network') return setErr({ kind: 'text', text: online ? t('auth.networkError') : t('auth.offline') });
    if (a.code === 'rate_limited') return setErr({ kind: 'text', text: t('auth.rateLimited') });
    if (a.code === 'send_failed') return setErr({ kind: 'notDelivered', text: channel === 'email' ? t('auth.notDeliveredEmail') : t('auth.notDelivered') });
    if (a.code === 'wrong_otp') { setCode(''); return setErr({ kind: 'text', text: t('auth.wrongCode', { n: Number(a.extra.attemptsLeft ?? 0) }) }); }
    if (a.code === 'expired') { setScreen('dest'); return setErr({ kind: 'text', text: t('auth.expired') }); }
    if (a.code === 'invalid') return setErr({ kind: 'text', text: channel === 'email' ? t('auth.invalidEmail') : t('auth.invalidNumber') });
    if (a.code === 'blocked') return setErr({ kind: 'text', text: t('error.title') });
    setErr({ kind: 'text', text: a.message });
  };
  const send = async () => {
    if (!valid) { setErr({ kind: 'text', text: channel === 'email' ? t('auth.invalidEmail') : t('auth.invalidNumber') }); return; }
    setBusy(true); setErr(null);
    try { const r = await requestOtp(channel, value, consent); setDevCode(r.devCode); setResendIn(r.resendAfterSec); setCode(''); setScreen('otp'); } catch (e) { fail(e); } finally { setBusy(false); }
  };
  const verify = async (c = code) => {
    if (c.length !== 6) return;
    setBusy(true); setErr(null);
    try {
      const r = await verifyOtp(channel, value, c);
      setIsNew(r.isNew);
      if (r.isNew) { setScreen('name'); return; }
      if (localProgressOwnerMismatch(r.account.id)) { setScreen('merge'); return; }
      await syncProgress('merge');
      setScreen('saved');
    } catch (e) { fail(e); } finally { setBusy(false); }
  };
  const finishName = async () => {
    setBusy(true);
    try { await updateProfile({ name: name.trim() || undefined, ...(channel === 'whatsapp' ? { email: extra.trim() || undefined } : { contactPhone: extra.replace(/\D/g, '').slice(-10) || undefined }) }); await syncProgress('merge'); setScreen('saved'); } catch (e) { fail(e); } finally { setBusy(false); }
  };
  const mergeDecision = async (yes: boolean) => { setBusy(true); try { await syncProgress(yes ? 'merge' : 'replace'); setScreen('saved'); } finally { setBusy(false); } };
  useEffect(() => { if (screen === 'saved') { const id = setTimeout(() => nav(next, { replace: true }), 1200); return () => clearTimeout(id); } }, [screen, nav, next]);

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  const helpUrl = `https://wa.me/${siteConfig.contact.whatsappNumber}`;
  const pick = (c: Channel) => { setChannel(c); setDest(''); setUseSaved(false); setErr(null); setScreen('dest'); };

  return (
    <>
      <Seo title={t('login.title')} description={t('auth.whyLine')} path="/login" lang={lang} noindex />
      <div className="max-w-md mx-auto py-4 space-y-5">
        {expired && <p className="badge-sample text-[15px]">{t('auth.sessionExpired')}</p>}
        {!online && <p className="badge-sample text-[15px]" role="status">{t('auth.offline')}</p>}

        {screen === 'why' && (
          <section className="space-y-3" data-testid="screen-why">
            <h1 className="h1">{t('auth.whyTitle')}</h1>
            <p>{t('auth.whyLine')}</p>
            <button type="button" className="btn-primary" onClick={() => pick('whatsapp')} data-testid="continue-whatsapp"><MessageCircle aria-hidden="true" /> {t('auth.continueWhatsapp')}</button>
            <button type="button" className="btn-secondary" onClick={() => pick('email')} data-testid="continue-email"><Mail aria-hidden="true" /> {t('auth.continueEmail')}</button>
            <Link to={next === '/my-study' ? '/' : next} className="btn-ghost" data-testid="not-now">{t('auth.notNow')}</Link>
          </section>
        )}

        {screen === 'dest' && (
          <form className="space-y-4" data-testid="screen-number" onSubmit={(e) => { e.preventDefault(); send(); }}>
            <h1 className="h1">{returning && useSaved ? t('login.title') : channel === 'email' ? t('auth.enterEmail') : t('auth.enterNumber')}</h1>
            {returning && useSaved && lastIdentity ? (
              <>
                <p className="card p-4 font-bold text-[18px]">{t('auth.continueAsIdentity', { id: maskIdentity(lastIdentity.channel, lastIdentity.value) })}</p>
                <button type="button" className="btn-ghost btn-sm" onClick={() => { setUseSaved(false); setDest(''); }}>{t('auth.useAnother')}</button>
              </>
            ) : channel === 'whatsapp' ? (
              <label className="block"><span className="sr-only">{t('auth.enterNumber')}</span>
                <span className="card flex items-center mt-1 overflow-hidden">
                  <span className="px-3 font-bold text-muted border-r border-line min-h-14 inline-flex items-center">+91</span>
                  <input className="flex-1 min-w-0 px-3 min-h-14 text-[22px] tracking-wider bg-transparent outline-none" type="tel" inputMode="numeric" autoComplete="tel-national" maxLength={10} value={ten} onChange={(e) => setDest(e.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="98765 43210" data-testid="login-phone" required />
                </span>
              </label>
            ) : (
              <label className="block"><span className="sr-only">{t('auth.enterEmail')}</span>
                <input className="card w-full px-4 min-h-14 text-[18px]" type="email" inputMode="email" autoComplete="email" value={dest} onChange={(e) => setDest(e.target.value)} placeholder="name@example.com" data-testid="login-email-input" required />
              </label>
            )}
            {channel === 'whatsapp' && <label className="flex items-start gap-3 min-h-12"><input type="checkbox" className="w-6 h-6 mt-1 shrink-0" checked={consent} onChange={(e) => setConsent(e.target.checked)} data-testid="consent" /><span>{t('auth.consent')}</span></label>}
            {err && <p className="text-deep-red font-semibold" role="alert" data-testid="auth-error">{err.text}</p>}
            <button type="submit" className="btn-primary" disabled={busy || !valid} data-testid="send-otp">{t('auth.sendOtp')}</button>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn-ghost btn-sm" onClick={() => pick(channel === 'whatsapp' ? 'email' : 'whatsapp')} data-testid="switch-channel">{channel === 'whatsapp' ? <><Mail size={18} aria-hidden="true" /> {t('auth.continueEmail')}</> : <><MessageCircle size={18} aria-hidden="true" /> {t('auth.continueWhatsapp')}</>}</button>
              {!returning && <button type="button" className="btn-ghost btn-sm" onClick={() => setScreen('why')}>{t('action.back')}</button>}
            </div>
          </form>
        )}

        {screen === 'otp' && (
          <form className="space-y-4" data-testid="screen-otp" onSubmit={(e) => { e.preventDefault(); verify(); }}>
            <h1 className="h1">{channel === 'email' ? t('auth.enterCodeEmail') : t('auth.enterCode')}</h1>
            <p className="muted">{channel === 'email' ? email : `+91 ${ten.slice(0, 5)} ${ten.slice(5)}`}</p>
            {devCode && <p className="card p-3 font-mono text-[18px]" data-testid="dev-otp">{t('auth.devCode')} <strong>{devCode}</strong></p>}
            <OtpBoxes value={code} onChange={(v) => { setCode(v); if (v.length === 6) verify(v); }} disabled={busy} />
            {err && (
              <div role="alert" data-testid="auth-error" className="space-y-2">
                <p className="text-deep-red font-semibold">{err.text}</p>
                {err.kind === 'notDelivered' && <a className="btn-secondary btn-sm" href={helpUrl} target="_blank" rel="noopener noreferrer">{t('auth.help')} ↗</a>}
              </div>
            )}
            <button type="submit" className="btn-primary" disabled={busy || code.length !== 6} data-testid="verify-otp">{t('auth.verify')}</button>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn-secondary btn-sm" disabled={resendIn > 0 || busy} onClick={send} data-testid="resend-otp">{resendIn > 0 ? t('auth.resendIn', { t: fmt(resendIn) }) : t('auth.resend')}</button>
              <button type="button" className="btn-ghost btn-sm" onClick={() => { setScreen('dest'); setUseSaved(false); setErr(null); }}>{channel === 'email' ? t('auth.changeEmail') : t('auth.changeNumber')}</button>
            </div>
          </form>
        )}

        {screen === 'name' && (
          <form className="space-y-4" data-testid="screen-name" onSubmit={(e) => { e.preventDefault(); finishName(); }}>
            <h1 className="h1">{t('auth.nameTitle')}</h1>
            <input className="card w-full px-4 min-h-14 text-[17px]" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" aria-label={t('auth.nameTitle')} data-testid="login-name" />
            <PrefChips />
            <label className="block"><span className="font-semibold">{channel === 'whatsapp' ? t('auth.emailForReceipt') : t('auth.phoneForReceipt')}</span>
              {channel === 'whatsapp'
                ? <input className="card w-full mt-1 px-4 min-h-14 text-[17px]" type="email" inputMode="email" value={extra} onChange={(e) => setExtra(e.target.value)} autoComplete="email" data-testid="login-email" />
                : <input className="card w-full mt-1 px-4 min-h-14 text-[17px]" type="tel" inputMode="numeric" maxLength={10} value={extra} onChange={(e) => setExtra(e.target.value.replace(/\D/g, '').slice(0, 10))} autoComplete="tel-national" data-testid="login-contact-phone" />}
            </label>
            {err && <p className="text-deep-red font-semibold" role="alert">{err.text}</p>}
            <button type="submit" className="btn-primary" disabled={busy} data-testid="login-done">{t('auth.done')}</button>
          </form>
        )}

        {screen === 'merge' && (
          <section className="space-y-4" data-testid="screen-merge">
            <h1 className="h1">{t('auth.welcomeBack')}</h1>
            <p>{t('auth.mergeAsk')}</p>
            <button type="button" className="btn-primary" disabled={busy} onClick={() => mergeDecision(false)} data-testid="merge-no">{t('auth.no')}</button>
            <button type="button" className="btn-secondary" disabled={busy} onClick={() => mergeDecision(true)} data-testid="merge-yes">{t('auth.yes')}</button>
          </section>
        )}

        {screen === 'saved' && (
          <section className="space-y-3" data-testid="screen-saved">
            <h1 className="h1">{isNew ? t('auth.saved') : t('auth.welcomeBack')}</h1>
            <p className="badge-free text-[16px]">{t('auth.saved')}</p>
          </section>
        )}
        <p className="muted">{t('login.privacy')}</p>
      </div>
    </>
  );
}

function PrefChips() {
  const { t, prefs } = useLang();
  const parts = [prefs.classId && t(prefs.classId === 'class-10' ? 'class.10' : 'class.12'), prefs.medium && t(prefs.medium === 'hindi' ? 'medium.hindi' : 'medium.english'), prefs.stream && t(`stream.${prefs.stream}`)].filter(Boolean);
  return (
    <p className="flex flex-wrap items-center gap-2">
      {parts.map((x) => <span key={String(x)} className="chip">{x}</span>)}
      <Link to="/choose" className="link text-[14px] min-h-12 inline-flex items-center" onClick={() => setPrefs({})}>{t('action.change')}</Link>
    </p>
  );
}
