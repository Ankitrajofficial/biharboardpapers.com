import type { ObjectiveQuestion } from '@/content/types';

export interface MockScore {
  score: number;
  total: number;
  correct: number;
  wrong: number;
  skipped: number;
  /** Number of answered questions beyond the attempt limit (not counted) */
  overLimit: number;
  /** Per-question outcome in paper order */
  outcomes: Array<{ id: string; chosen: number | null; correct: number; result: 'right' | 'wrong' | 'skipped' | 'not_counted' }>;
}

/**
 * BSEB pattern: `given` questions are printed, the student must attempt `attempt` of them.
 * If more than `attempt` are answered, only the first `attempt` answered questions (in paper order)
 * are evaluated — the rest are not counted. Each counted question carries 1 mark, no negative marking.
 */
export function scoreMock(questions: ObjectiveQuestion[], answers: Record<string, number>, attempt: number): MockScore {
  let counted = 0;
  let correct = 0;
  let wrong = 0;
  let overLimit = 0;
  const outcomes: MockScore['outcomes'] = [];
  for (const q of questions) {
    const chosen = answers[q.id];
    if (chosen === undefined || chosen === null) {
      outcomes.push({ id: q.id, chosen: null, correct: q.answer, result: 'skipped' });
      continue;
    }
    if (counted >= attempt) {
      overLimit++;
      outcomes.push({ id: q.id, chosen, correct: q.answer, result: 'not_counted' });
      continue;
    }
    counted++;
    if (chosen === q.answer) {
      correct++;
      outcomes.push({ id: q.id, chosen, correct: q.answer, result: 'right' });
    } else {
      wrong++;
      outcomes.push({ id: q.id, chosen, correct: q.answer, result: 'wrong' });
    }
  }
  const total = Math.min(attempt, questions.length);
  const skipped = total - counted;
  return { score: correct, total, correct, wrong, skipped: Math.max(0, skipped), overLimit, outcomes };
}

export const attemptedCount = (answers: Record<string, number>) => Object.keys(answers).length;
export const isOverLimit = (answers: Record<string, number>, attempt: number) => attemptedCount(answers) > attempt;
