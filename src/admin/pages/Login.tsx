import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Seo } from '@/components/Seo';
import { useLang } from '@/lib/hooks';
import { adminApi, AdminApiError, adminStore, useAdmin, type AdminMe } from '../api';

export default function AdminLogin() {
  const { t, lang } = useLang();
  const nav = useNavigate();
  const { token } = useAdmin();
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState<{ devCode?: string } | null>(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { adminStore.hydrate(); }, []);
  useEffect(() => { if (token) nav('/admin', { replace: true }); }, [token, nav]);
  const fail = (e: unknown) => { const a = e as AdminApiError; setErr(a.code === 'forbidden' ? t('admin.notAdmin') : a.code === 'rate_limited' ? t('auth.rateLimited') : a.code === 'wrong_otp' ? t('auth.wrongCode', { n: 0 }) : a.code === 'expired' ? t('auth.expired') : a.message); };
  const send = async () => { setBusy(true); setErr(''); try { setSent(await adminApi('/auth/otp/request', { phone })); } catch (e) { fail(e); } finally { setBusy(false); } };
  const verify = async () => { setBusy(true); setErr(''); try { const r = await adminApi<{ token: string; admin: AdminMe }>('/auth/otp/verify', { phone, code }); adminStore.set({ token: r.token, admin: r.admin }); nav('/admin', { replace: true }); } catch (e) { fail(e); } finally { setBusy(false); } };
  return (
    <div className="min-h-dvh grid place-items-center p-4">
      <Seo title={t('admin.login')} description="" path="/admin/login" lang={lang} noindex />
      <form className="card-static w-full max-w-sm space-y-4" onSubmit={(e) => { e.preventDefault(); if (sent) verify(); else send(); }}>
        <h1 className="h1">{t('admin.login')}</h1>
        {!sent ? (
          <label className="block"><span className="meta font-bold">{t('auth.enterNumber')}</span>
            <span className="card flex items-center mt-1 overflow-hidden"><span className="px-3 font-bold text-muted border-r border-line min-h-14 inline-flex items-center">+91</span><input className="flex-1 min-w-0 px-3 min-h-14 text-[20px] bg-transparent outline-none" inputMode="numeric" maxLength={10} value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} data-testid="admin-phone" /></span>
          </label>
        ) : (
          <>
            {sent.devCode && <p className="card p-3 font-mono" data-testid="admin-dev-otp">{t('auth.devCode')} <strong>{sent.devCode}</strong></p>}
            <label className="block"><span className="meta font-bold">{t('auth.enterCode')}</span><input className="card w-full mt-1 px-4 min-h-14 text-[24px] tracking-[0.4em] text-center font-bold" inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} data-testid="admin-otp" /></label>
          </>
        )}
        {err && <p className="error-line" role="alert" data-testid="admin-error">{err}</p>}
        <button type="submit" className="btn-primary" disabled={busy || (sent ? code.length !== 6 : phone.length !== 10)} data-testid="admin-submit">{sent ? t('auth.verify') : t('auth.sendOtp')}</button>
      </form>
    </div>
  );
}
