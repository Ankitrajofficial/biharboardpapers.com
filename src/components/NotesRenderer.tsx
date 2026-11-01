import { useState } from 'react';
import { Play } from 'lucide-react';
import type { NoteBlock } from '@/content/types';
import { useLang } from '@/lib/hooks';

export function NotesRenderer({ blocks }: { blocks: NoteBlock[] }) {
  const { t, prefs } = useLang();
  return (
    <div className="prose-notes space-y-3">
      {blocks.map((b, i) => {
        switch (b.type) {
          case 'heading':
            return <h2 key={i} className="h2">{b.text}</h2>;
          case 'paragraph':
            return <p key={i}>{b.text}</p>;
          case 'list':
            return (
              <ul key={i} className="list-disc pl-6 space-y-1">
                {b.items.map((it, j) => <li key={j}>{it}</li>)}
              </ul>
            );
          case 'formula':
            return (
              <div key={i} className="formula-box" role="math">
                {b.label && <span className="muted block text-[14px]">{b.label}</span>}
                <code className="font-[inherit]">{b.text}</code>
              </div>
            );
          case 'remember':
            return (
              <aside key={i} className="remember-box" aria-label={t('chapter.remember')}>
                <p className="label">📌 {t('chapter.remember')}</p>
                <p>{b.text}</p>
              </aside>
            );
          case 'image':
            if (prefs.lowData) return <p key={i} className="muted italic">[{b.alt}]</p>;
            return (
              <figure key={i} className="my-4">
                <img src={b.src} alt={b.alt} loading="lazy" decoding="async" className="max-w-full h-auto rounded-lg border border-line" />
                {b.caption && <figcaption className="muted mt-1">{b.caption}</figcaption>}
              </figure>
            );
        }
      })}
    </div>
  );
}

/** Thumbnail first; the iframe loads only on tap, with a data warning. Never cached. */
export function YouTubeLazy({ id, title }: { id: string; title: string }) {
  const { t, prefs } = useLang();
  const [play, setPlay] = useState(false);
  if (play)
    return (
      <div className="aspect-video w-full rounded-lg overflow-hidden border border-line">
        <iframe
          className="w-full h-full"
          src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1`}
          title={title}
          allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  return (
    <button type="button" className="card w-full text-left overflow-hidden" onClick={() => setPlay(true)}>
      {!prefs.lowData && (
        <img src={`https://i.ytimg.com/vi/${id}/mqdefault.jpg`} alt="" loading="lazy" className="w-full aspect-video object-cover" />
      )}
      <span className="flex items-center gap-3 p-4 min-h-14">
        <Play aria-hidden="true" />
        <span>
          <span className="block font-bold">{t('chapter.videoTap')}</span>
          <span className="muted block">{t('chapter.videoData')}</span>
        </span>
      </span>
    </button>
  );
}
