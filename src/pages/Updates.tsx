import { useState } from 'react';
import { Seo } from '@/components/Seo';
import { UpdateCard } from '@/components/LatestUpdates';
import { EmptyState, Skeleton } from '@/components/Loading';
import { useLang, useHydrated } from '@/lib/hooks';
import { usePublic, type PublicUpdate } from '@/lib/publicApi';

const CATS = ['', 'exam_date', 'admit_card', 'result', 'model_paper', 'notice', 'site_update'] as const;
export default function UpdatesPage() {
  const { t, lang, prefs } = useLang();
  const hydrated = useHydrated();
  const [cat, setCat] = useState('');
  const { data, loading } = usePublic<{ updates: PublicUpdate[] }>(hydrated ? `/updates?class=${prefs.classId ?? ''}&category=${cat}` : null);
  return (
    <>
      <Seo title={t('student.updates')} description={t('student.updates.all')} path="/updates" lang={lang} />
      <h1 className="h1 py-4">{t('student.updates')}</h1>
      <div className="flex gap-2 overflow-x-auto pb-2 mb-3">{CATS.map((c) => <button key={c} type="button" className={`chip shrink-0 ${cat === c ? 'selected' : ''}`} aria-pressed={cat === c} onClick={() => setCat(c)}>{c ? t(`admin.upd.${c}` as 'admin.upd.notice') : t('admin.all')}</button>)}</div>
      {loading || !hydrated ? <Skeleton lines={4} /> : !data?.updates.length ? <EmptyState text={t('student.updates.none')} /> : <div className="grid gap-3 md:grid-cols-2">{data.updates.map((u) => <UpdateCard key={u.id} u={u} level={2} />)}</div>}
    </>
  );
}
