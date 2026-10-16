import { describe, expect, it } from 'vitest';
import { SIGNS, SIGNS_BY_ID } from '../data/signs';
import { makeRound, quizOptions } from './quiz';

describe('quizOptions', () => {
  it('gives four different signs including the answer', () => {
    for (const sign of SIGNS) {
      const options = quizOptions(sign);
      expect(options).toHaveLength(4);
      expect(new Set(options.map((o) => o.id)).size).toBe(4);
      expect(options).toContain(sign);
    }
  });

  it('prefers signs of the same topic', () => {
    const red = SIGNS_BY_ID.get('kyzyl')!;
    expect(quizOptions(red).every((o) => o.topic === 'colors')).toBe(true);
  });
});

describe('makeRound', () => {
  const ids = SIGNS.map((s) => s.id);

  it('asks new signs while nothing is learned', () => {
    const round = makeRound([], undefined, () => 0);
    expect(round.review).toBe(false);
  });

  it('reviews learned signs once everything is learned', () => {
    const round = makeRound(ids);
    expect(round.review).toBe(true);
    expect(ids).toContain(round.answer.id);
  });

  it('mixes in learned signs', () => {
    const round = makeRound(['salem', 'ia'], undefined, () => 0);
    expect(round.review).toBe(true);
    expect(['salem', 'ia']).toContain(round.answer.id);
  });

  it('does not repeat the previous question', () => {
    const round = makeRound(['salem', 'ia'], 'salem', () => 0);
    expect(round.answer.id).toBe('ia');
  });
});
