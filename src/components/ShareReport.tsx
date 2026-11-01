import { useState } from 'react';
import { Flag, Share2 } from 'lucide-react';
import { accountStore } from '@/lib/account';
import { useLang } from '@/lib/hooks';
import { absoluteUrl, reportUrl, whatsappUrl } from '@/lib/share';
import { track } from '@/lib/analytics';

export function ShareButton({ text, path, className = 'btn-secondary btn-sm' }: { text: string; path: string; className?: string }) {
  const { t } = useLang();
  const msg = text.replace('{url}', absoluteUrl(path));
  return (
    <a
      className={className}
      href={whatsappUrl(msg)}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => track('share_clicked', { path })}
    >
      <Share2 size={18} aria-hidden="true" /> {t('action.share')}
    </a>
  );
}

export function ReportLink({ id, path }: { id: string; path: string }) {
  const { t } = useLang();
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState('');
  const [done, setDone] = useState(false);
  const wa = reportUrl(t('report.message', { url: absoluteUrl(path), id }));
  const send = async () => {
    try {
      const token = accountStore.get().token;
      const res = await fetch('/api/reports', { method: 'POST', headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ page: path, refId: id, message: msg }) });
      if (!res.ok) throw new Error();
      setDone(true);
    } catch { window.open(wa, '_blank', 'noopener'); }
  };
  if (done) return <p className="badge-free text-[14px]" role="status" data-testid="report-sent">{t('student.report.sent')}</p>;
  return (
    <div className="inline-block">
      <button type="button" className="inline-flex items-center gap-1 text-[14px] text-muted link min-h-12" aria-expanded={open} onClick={() => setOpen(!open)} data-testid="report-open">
        <Flag size={14} aria-hidden="true" /> {t('action.reportMistake')}
      </button>
      {open && (
        <form className="card-static mt-2 space-y-2 max-w-md" onSubmit={(e) => { e.preventDefault(); send(); }} data-testid="report-form">
          <textarea className="card w-full p-3 text-[15px]" rows={3} value={msg} onChange={(e) => setMsg(e.target.value)} placeholder={t('student.report.placeholder')} maxLength={1000} required />
          <div className="flex flex-wrap items-center gap-2">
            <button type="submit" className="btn-primary btn-sm" disabled={!msg.trim()} data-testid="report-send">{t('student.report.send')}</button>
            <a className="link text-[14px]" href={wa} target="_blank" rel="noopener noreferrer">{t('student.report.whatsapp')} ↗</a>
          </div>
        </form>
      )}
    </div>
  );
}
