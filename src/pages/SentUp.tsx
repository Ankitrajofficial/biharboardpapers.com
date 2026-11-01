import { Suspense, use } from 'react';
import { Link } from 'react-router';
import { Seo } from '@/components/Seo';
import { Skeleton } from '@/components/Loading';
import { LockedCard } from '@/components/Locked';
import { StatusBadge } from '@/components/Badges';
import { resource } from '@/content/loader';
import { getSubject } from '@/data/subjects';
import { useLang } from '@/lib/hooks';
import { useAccount } from '@/lib/account';
import { featureUnlocked } from '@/lib/access';
import { subjectImportantPath } from '@/lib/paths';
import type { ContentMeta } from '@/content/types';

interface SentUp extends ContentMeta {
  checklist: { hi: string[]; en: string[] };
  practical: Array<{ subjectId: string; class: 'class-10' | 'class-12'; questions: { hi: string[]; en: string[] } }>;
}

function Body() {
  const d = use(resource<SentUp>('/content/sent-up.json'));
  const { t, lang, p, prefs } = useLang();
  const { account } = useAccount();
  const classId = prefs.classId ?? 'class-12';
  const unlocked = featureUnlocked('sentup', account, classId);
  const medium = prefs.medium ?? 'hindi';
  return (
    <div className="space-y-6" lang={lang}>
      <StatusBadge status={d.status} />
      <section><h2 className="h2 mb-2">{t('sentup.checklist')}</h2>
        <ul className="grid gap-2">{p(d.checklist).map((x, i) => <li key={i} className="card-tap"><input type="checkbox" className="w-6 h-6 shrink-0" aria-label={x} /> <span>{x}</span></li>)}</ul>
      </section>
      <section><h2 className="h2 mb-2">{t('sentup.important')}</h2>
        {prefs.classId && prefs.medium ? (
          <p className="muted">{t('subject.important')} → <Link className="link" to="/subjects">{t('nav.subjects')}</Link></p>
        ) : <p className="muted"><Link className="link" to="/choose">{t('action.changeClass')}</Link></p>}
      </section>
      <section><h2 className="h2 mb-2">{t('sentup.practical')}</h2>
        <div className="space-y-4">
          {d.practical.map((pr) => {
            const s = getSubject(pr.class, pr.subjectId);
            const qs = p(pr.questions);
            const show = unlocked ? qs : qs.slice(0, 2);
            return (
              <div key={pr.subjectId} className="card p-4">
                <h3 className="font-bold text-[18px] mb-2">{s ? p(s.name) : pr.subjectId}</h3>
                <ol className="list-decimal pl-5 space-y-1">{show.map((q, i) => <li key={i}>{q}</li>)}</ol>
                {!unlocked && qs.length > 2 && <div className="mt-3"><LockedCard classId={pr.class} note={t('sentup.locked')} /></div>}
                {s && <Link className="link text-[14px] inline-flex min-h-12 items-center" to={subjectImportantPath(s, medium)}>{t('subject.important')} →</Link>}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

export default function SentUpPage() {
  const { t, lang } = useLang();
  return (
    <>
      <Seo title={t('sentup.title')} description={t('sentup.intro')} path="/sent-up-practical" lang={lang} />
      <h1 className="h1 py-4">{t('sentup.title')}</h1>
      <p className="muted mb-4">{t('sentup.intro')}</p>
      <Suspense fallback={<Skeleton lines={6} />}><Body /></Suspense>
    </>
  );
}
