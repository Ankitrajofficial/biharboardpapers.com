import { describe, expect, it } from 'vitest';
import { scoreMock, isOverLimit } from '@/lib/scoring';
import type { ObjectiveQuestion } from '@/content/types';

const q = (i: number, answer: 0 | 1 | 2 | 3 = 0): ObjectiveQuestion => ({
  id: `q${i}`, question: `Q${i}`, options: ['a', 'b', 'c', 'd'], answer, explanation: '', status: 'sample', source: 's', sourceUrl: '', lastReviewed: '2026-11-01', reviewer: 'r',
});

describe('mock test scoring (BSEB pattern)', () => {
  const qs = Array.from({ length: 10 }, (_, i) => q(i + 1, (i % 4) as 0 | 1 | 2 | 3));

  it('counts correct, wrong and skipped', () => {
    const r = scoreMock(qs, { q1: 0, q2: 1, q3: 0 }, 5);
    expect(r).toMatchObject({ correct: 2, wrong: 1, skipped: 2, total: 5, score: 2, overLimit: 0 });
  });

  it('counts only the first N attempted when the student goes over the limit', () => {
    const answers: Record<string, number> = {};
    qs.forEach((x) => (answers[x.id] = x.answer)); // all 10 correct
    const r = scoreMock(qs, answers, 5);
    expect(r.score).toBe(5);
    expect(r.overLimit).toBe(5);
    expect(r.outcomes.filter((o) => o.result === 'not_counted')).toHaveLength(5);
    expect(isOverLimit(answers, 5)).toBe(true);
  });

  it('a wrong answer inside the limit does not get replaced by a later correct one', () => {
    const r = scoreMock(qs, { q1: 3, q2: 1, q3: 2, q4: 3, q5: 0, q6: 1 }, 5);
    expect(r.outcomes[0].result).toBe('wrong');
    expect(r.outcomes[5].result).toBe('not_counted');
    expect(r.correct).toBe(4);
  });

  it('total never exceeds the number of questions', () => {
    expect(scoreMock(qs.slice(0, 3), {}, 50).total).toBe(3);
  });
});
