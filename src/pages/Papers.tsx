import { Suspense, use, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router';
import { Download, ExternalLink, Eye } from 'lucide-react';
import { Seo } from '@/components/Seo';
import { Skeleton } from '@/components/Loading';
import { loadPapers } from '@/content/loader';
import { subjects, getSubject } from '@/data/subjects';
import { useLang } from '@/lib/hooks';
import { formatBytes } from '@/lib/share';
import type { ClassId, PaperEntry } from '@/content/types';

function List() {
  const papers = use(loadPapers());
  const { t, p, lang, prefs } = useLang();
  const [sp, setSp] = useSearchParams();
  const classId = (sp.get('class') ?? prefs.classId ?? '') as ClassId | '';
  const subjectId = sp.get('subject') ?? '';
  const year = sp.get('year') ?? '';
  const type = sp.get('type') ?? '';
  const years = useMemo(() => Array.from(new Set(papers.map((x) => x.year))).sort((a, b) => b - a), [papers]);
  const list = papers
    .filter((x) => (!classId || x.class === classId) && (!subjectId || x.subjectId === subjectId || x.subjectId === 'all') && (!year || String(x.year) === year) && (!type || x.sourceType === type))
    .sort((a, b) => b.year - a.year || a.subjectCode.localeCompare(b.subjectCode));
  const set = (k: string, v: string) => { const n = new URLSearchParams(sp); if (v) n.set(k, v); else n.delete(k); setSp(n, { replace: true }); };
  const subjOpts = subjects.filter((s) => !classId || s.class === classId);
  const label = (x: PaperEntry) => (x.sourceType === 'bseb_official_model_paper' ? t('papers.official') : x.sourceType === 'previous_year' ? `${t('papers.previous')} (${x.sourceLabel})` : t('papers.sample'));
  return (
    <>
      <div className="grid grid-cols-3 gap-2 mb-4">
        <label className="card px-3 min-h-12 flex items-center gap-1"><span className="sr-only">{t('papers.filter.class')}</span>
          <select className="w-full bg-transparent min-h-12" value={classId} onChange={(e) => set('class', e.target.value)}><option value="">{t('papers.filter.class')}: {t('papers.all')}</option><option value="class-10">{t('class.10')}</option><option value="class-12">{t('class.12')}</option></select></label>
        <label className="card px-3 min-h-12 flex items-center"><span className="sr-only">{t('papers.filter.subject')}</span>
          <select className="w-full bg-transparent min-h-12" value={subjectId} onChange={(e) => set('subject', e.target.value)}><option value="">{t('papers.filter.subject')}: {t('papers.all')}</option>{subjOpts.map((s) => <option key={s.class + s.id} value={s.id}>{p(s.name)}</option>)}</select></label>
        <label className="card px-3 min-h-12 flex items-center"><span className="sr-only">{t('papers.filter.year')}</span>
          <select className="w-full bg-transparent min-h-12" value={year} onChange={(e) => set('year', e.target.value)}><option value="">{t('papers.filter.year')}: {t('papers.all')}</option>{years.map((y) => <option key={y} value={y}>{y}</option>)}</select></label>
      </div>
      {list.length === 0 ? <p className="muted">{t('papers.none')}</p> : (
        <ul className="grid gap-3">
          {list.map((x) => {
            const s = x.subjectId !== 'all' ? getSubject(x.class, x.subjectId) : null;
            return (
              <li key={x.id} className="card p-4">
                <p className="font-bold text-[17px]">{lang === 'hi' ? x.title.hi : x.title.en}</p>
                <p className="muted">{t(x.class === 'class-10' ? 'class.10' : 'class.12')} · {s ? p(s.name) : t('papers.all')} · {x.subjectCode} · {x.year}</p>
                <p className="mt-1"><span className={x.sourceType === 'sample' ? 'badge-sample' : 'badge-free'}>{t('papers.source')}: {label(x)}</span></p>
                <div className="flex flex-wrap gap-2 mt-3">
                  {x.external ? (
                    <a className="btn-primary btn-sm" href={x.url} target="_blank" rel="noopener noreferrer"><ExternalLink size={18} aria-hidden="true" /> {t('action.view')} ↗</a>
                  ) : x.url.endsWith('.pdf') ? (
                    <>
                      <a className="btn-primary btn-sm" href={x.url} target="_blank" rel="noopener noreferrer"><Eye size={18} aria-hidden="true" /> {t('action.view')}</a>
                      <a className="btn-secondary btn-sm" href={x.url} download><Download size={18} aria-hidden="true" /> {t('action.download')} {x.sizeBytes ? `(${formatBytes(x.sizeBytes)})` : ''}</a>
                    </>
                  ) : (
                    <Link className="btn-primary btn-sm" to={x.url}>{t('action.view')}</Link>
                  )}
                  {x.sizeBytes > 0 && <span className="chip">{t('papers.size')}: {formatBytes(x.sizeBytes)}</span>}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

export default function PapersPage() {
  const { t, lang } = useLang();
  return (
    <>
      <Seo title={lang === 'hi' ? 'बिहार बोर्ड मॉडल पेपर 2027 व पिछले वर्ष के प्रश्न पत्र' : 'Bihar Board model paper 2027 & previous year papers'} description={t('papers.title')} path="/papers" lang={lang} />
      <h1 className="h1 py-4">{t('papers.title')}</h1>
      <Suspense fallback={<Skeleton lines={5} />}><List /></Suspense>
    </>
  );
}
