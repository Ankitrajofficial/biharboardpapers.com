import { Link } from 'react-router';
import { ExternalLink } from 'lucide-react';
import { useLang, useHydrated } from '@/lib/hooks';
import { usePublic, type PublicUpdate } from '@/lib/publicApi';

export function UpdateCard({ u, level = 3 }: { u: PublicUpdate; level?: 2 | 3 }) {
  const { t, p, lang } = useLang();
  const H = level === 2 ? 'h2' : 'h3';
  return (
    <article className="card-static space-y-1" data-testid="update-card">
      <p className="flex flex-wrap items-center gap-2 meta">
        <span className="chip min-h-7 text-[12px]">{t(`admin.upd.${u.category}` as 'admin.upd.notice')}</span>
        {u.important && <span className="badge-sample">{t('admin.upd.important')}</span>}
        {u.official ? <span className="badge-free">{t('student.updates.official')} ↗</span> : <span className="badge-lock">{t('student.updates.unofficial')}</span>}
        <span>{new Date(u.publishedAt).toLocaleDateString(lang === 'hi' ? 'hi-IN' : 'en-IN', { day: 'numeric', month: 'short' })}</span>
      </p>
      <H className="card-title">{p(u.title)}</H>
      {p(u.text) && <p className="text-[15px]">{p(u.text)}</p>}
      <p className="flex flex-wrap gap-3 text-[14px]">
        {u.link && <a className="link inline-flex items-center gap-1 min-h-12" href={u.link} target="_blank" rel="noopener noreferrer"><ExternalLink size={14} aria-hidden="true" /> {u.official ? t('admin.upd.official') : t('admin.upd.link')} ↗</a>}
        {u.attachment && <a className="link inline-flex items-center min-h-12" href={u.attachment.url} target="_blank" rel="noopener noreferrer">{u.attachment.kind === 'pdf' ? 'PDF' : 'Image'} ↗</a>}
        <span className="meta self-center">{t('syllabus.source')}: {u.source}</span>
      </p>
    </article>
  );
}

/** Homepage strip: the latest 3 pinned/important updates. Fetched from the API, no redeploy needed. */
export function LatestUpdates() {
  const { t, prefs } = useLang();
  const hydrated = useHydrated();
  const { data } = usePublic<{ updates: PublicUpdate[] }>(hydrated ? `/updates?class=${prefs.classId ?? ''}&limit=10` : null);
  const top = (data?.updates ?? []).filter((u) => u.pinned || u.important).slice(0, 3);
  const list = top.length ? top : (data?.updates ?? []).slice(0, 3);
  if (!list.length) return null;
  return (
    <section className="mt-6" aria-labelledby="updates-h" data-testid="latest-updates">
      <div className="flex items-center gap-2 mb-3"><h2 id="updates-h" className="h2 flex-1">{t('student.updates')}</h2><Link to="/updates" className="link text-[14px]">{t('student.updates.all')} →</Link></div>
      <div className="grid gap-3 md:grid-cols-3">{list.map((u) => <UpdateCard key={u.id} u={u} />)}</div>
    </section>
  );
}
