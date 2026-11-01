import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { useLang, useHydrated } from '@/lib/hooks';
import { usePublic, type PublicPoster } from '@/lib/publicApi';

/** 19:6 poster carousel: auto-advances every 5 s (paused on touch / reduced motion), swipeable, dots below. Hidden when empty. */
export function PosterBanner() {
  const { t, p, prefs } = useLang();
  const hydrated = useHydrated();
  // One unfiltered request (preloaded from index.html); class filtering happens here.
  const { data, loading } = usePublic<{ posters: Array<PublicPoster & { class?: string }> }>(hydrated ? '/posters' : null);
  const posters = (data?.posters ?? []).filter((po) => !po.class || po.class === 'both' || !prefs.classId || po.class === prefs.classId);
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const touch = useRef<number | null>(null);
  const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  useEffect(() => {
    if (posters.length < 2 || paused || reduced) return;
    const id = setInterval(() => setI((x) => (x + 1) % posters.length), 5000);
    return () => clearInterval(id);
  }, [posters.length, paused, reduced]);
  // The 19:6 box is rendered from the first paint (no layout shift); it is removed only when the API confirms there are no posters.
  if (hydrated && !loading && posters.length === 0) return null;
  const cur = posters[i];
  const img = (po: PublicPoster, first: boolean) => (
    <img src={po.image} alt={p(po.title)} className="w-full h-full object-cover" loading={first ? 'eager' : 'lazy'} fetchPriority={first ? 'high' : 'low'} decoding="async" width={1900} height={600} />
  );
  return (
    <section className="mt-3" aria-roledescription="carousel" aria-label={t('student.updates')} data-testid="poster-banner">
      <div
        className="aspect-[19/6] rounded-2xl overflow-hidden bg-[#EEF2FB] shadow-[0_2px_10px_rgba(15,27,61,0.08)] relative"
        onTouchStart={(e) => { touch.current = e.touches[0].clientX; setPaused(true); }}
        onTouchEnd={(e) => { const dx = e.changedTouches[0].clientX - (touch.current ?? 0); if (Math.abs(dx) > 40 && posters.length > 1) setI((x) => (x + (dx < 0 ? 1 : posters.length - 1)) % posters.length); touch.current = null; setTimeout(() => setPaused(false), 8000); }}
      >
        {loading || !cur ? <div className="skeleton w-full h-full rounded-none bg-cover bg-center" data-poster-box /> : cur.link ? (
          /^https?:/.test(cur.link) ? <a href={cur.link} target="_blank" rel="noopener noreferrer" className="block w-full h-full">{img(cur, i === 0)}</a> : <Link to={cur.link} className="block w-full h-full" data-testid="poster-link">{img(cur, i === 0)}</Link>
        ) : img(cur, i === 0)}
        {posters.length > 1 && (
          <div className="hidden md:flex absolute inset-y-0 left-0 right-0 justify-between items-center px-2 pointer-events-none">
            <button type="button" className="btn-secondary btn-icon pointer-events-auto opacity-80" aria-label={t('poster.prev')} onClick={() => setI((x) => (x + posters.length - 1) % posters.length)}>‹</button>
            <button type="button" className="btn-secondary btn-icon pointer-events-auto opacity-80" aria-label={t('poster.next')} onClick={() => setI((x) => (x + 1) % posters.length)}>›</button>
          </div>
        )}
      </div>
      {posters.length > 1 && (
        <div className="flex justify-center gap-2 mt-2" role="tablist">
          {posters.map((po, n) => <button key={po.id} type="button" role="tab" aria-selected={n === i} aria-label={t('poster.goto', { n: n + 1 })} className="min-w-12 min-h-8 grid place-items-center" onClick={() => setI(n)}><span className={`block w-2 h-2 rounded-full ${n === i ? 'bg-deep-blue' : 'bg-line'}`} /></button>)}
        </div>
      )}
    </section>
  );
}
