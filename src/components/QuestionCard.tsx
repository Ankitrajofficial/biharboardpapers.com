import { Bookmark, BookmarkCheck } from 'lucide-react';
import type { ObjectiveQuestion } from '@/content/types';
import { useLang } from '@/lib/hooks';
import { StatusBadge } from './Badges';
import { ReportLink, ShareButton } from './ShareReport';

const LETTERS = ['A', 'B', 'C', 'D'] as const;

interface Props {
  q: ObjectiveQuestion;
  index: number;
  total: number;
  chosen: number | null;
  /** When true, show the answer and explanation immediately after a choice */
  reveal: boolean;
  onChoose: (i: number) => void;
  bookmarked?: boolean;
  onBookmark?: () => void;
  path: string;
  lang: 'hi' | 'en';
}

export function QuestionCard({ q, index, total, chosen, reveal, onChoose, bookmarked, onBookmark, path, lang }: Props) {
  const { t } = useLang();
  const answered = chosen !== null;
  return (
    <article className="card p-4" lang={lang} aria-labelledby={`q-${q.id}`}>
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="chip">{t('objective.question')} {index + 1} / {total}</span>
        <StatusBadge status={q.status} short />
      </div>
      <h2 id={`q-${q.id}`} className="text-[18px] font-bold leading-snug mb-3">{q.question}</h2>
      <div className="grid gap-2" role="group" aria-label={t('objective.question')}>
        {q.options.map((opt, i) => {
          let state: 'correct' | 'wrong' | undefined;
          if (reveal && answered) {
            if (i === q.answer) state = 'correct';
            else if (i === chosen) state = 'wrong';
          }
          return (
            <button
              key={i}
              type="button"
              className="option-btn"
              data-state={state}
              data-testid={`option-${LETTERS[i]}`}
              aria-pressed={chosen === i}
              disabled={reveal && answered}
              onClick={() => onChoose(i)}
            >
              <span className="option-letter">{LETTERS[i]}</span>
              <span className="flex-1">{opt}</span>
              {state === 'correct' && <span className="option-mark">✓ {t('objective.markRight')}</span>}
              {state === 'wrong' && <span className="option-mark">✗ {t('objective.markWrong')}</span>}
            </button>
          );
        })}
      </div>
      {reveal && answered && (
        <div className={`mt-3 ${chosen === q.answer ? 'feedback-correct' : 'feedback-wrong'}`} role="status" data-testid="answer-feedback">
          <p className="font-bold">
            {chosen === q.answer ? t('objective.correct') : `${t('objective.wrong')} · ${t('objective.correctIs')}: ${LETTERS[q.answer]}`}
          </p>
          <p className="text-ink mt-1"><span className="font-semibold">{t('objective.explanation')}:</span> {q.explanation}</p>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2 mt-3">
        {onBookmark && (
          <button type="button" className="btn-ghost btn-sm" aria-pressed={bookmarked} onClick={onBookmark}>
            {bookmarked ? <BookmarkCheck size={18} aria-hidden="true" /> : <Bookmark size={18} aria-hidden="true" />}
            {bookmarked ? t('action.bookmarked') : t('action.bookmark')}
          </button>
        )}
        <ShareButton className="btn-ghost btn-sm" text={t('share.question', { q: q.question, url: '{url}' })} path={path} />
        <ReportLink id={q.id} path={path} />
      </div>
    </article>
  );
}
