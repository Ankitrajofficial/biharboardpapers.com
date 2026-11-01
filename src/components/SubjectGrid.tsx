import { Link } from 'react-router';
import type { Medium } from '@/content/types';
import { subjectTone, type Subject } from '@/data/subjects';
import { SubjectIcon } from './Icon';
import { subjectPath } from '@/lib/paths';
import { useLang } from '@/lib/hooks';
import { useProgress } from '@/lib/progress';
import { chaptersFor } from '@/content/loader';

/** Subject card: icon circle, title, subtitle, "N chapters" and a labelled progress bar. One tap target ≥ 96px. */
export function SubjectGrid({ subjects, medium, compact }: { subjects: Subject[]; medium: Medium; compact?: boolean }) {
  const { t, p } = useLang();
  const progress = useProgress();
  return (
    <ul className={`grid gap-3 ${compact ? 'sm:grid-cols-2 lg:grid-cols-3' : 'sm:grid-cols-2'}`}>
      {subjects.map((s) => {
        const chapters = chaptersFor(s.class, medium, s.id);
        const done = chapters.filter((c) => progress.completed[c.id]).length;
        const pct = chapters.length ? Math.round((done / chapters.length) * 100) : 0;
        return (
          <li key={`${s.class}-${s.id}`} className={`tone-${subjectTone(s)}`}>
            <Link to={subjectPath(s, medium)} className="card-tap subject-card" data-testid={`subject-${s.id}`}>
              <span className="icon"><SubjectIcon name={s.icon} size={22} /></span>
              <span className="card-title">{p(s.name)}</span>
              <span className="meta">{t('subject.code')} {s.codes[0]} · {chapters.length ? t('subject.chaptersCount', { n: chapters.length }) : t('subject.noChapters')}</span>
              {chapters.length > 0 && (
                <span className="flex items-center gap-2 w-full">
                  <span className="progress-bar" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={t('subject.progress')}>
                    <span style={{ width: `${pct}%` }} />
                  </span>
                  <span className="meta tabular-nums shrink-0">{done}/{chapters.length}</span>
                </span>
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
