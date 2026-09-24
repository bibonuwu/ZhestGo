import { describe, expect, it } from 'vitest';
import { WORDS_BY_ID } from '../data/vocabulary';
import { composeKazakh } from './kk/sentence';
import { QUICK_PHRASES, WordPredictor, buildPredictor, frequentPhrases } from './predict';

describe('WordPredictor', () => {
  it('suggests what usually follows the last word', () => {
    const p = new WordPredictor([
      { ids: ['men', 'su', 'kerek'], weight: 1 },
      { ids: ['men', 'su', 'kerek'], weight: 1 },
      { ids: ['men', 'baru'], weight: 1 },
    ]);
    expect(p.suggest(['men'])[0]).toBe('su');
    expect(p.suggest(['men', 'su'])[0]).toBe('kerek');
    expect(p.suggest([])[0]).toBe('men');
  });

  it('does not suggest the word just signed or words already used', () => {
    const p = buildPredictor([]);
    const s = p.suggest(['men', 'su']);
    expect(s).not.toContain('su');
    expect(s).not.toContain('men');
  });

  it('learns from the user history', () => {
    const before = buildPredictor([]).suggest(['men'], 3);
    expect(before).not.toContain('oinau');
    const after = buildPredictor(Array.from({ length: 5 }, () => ({ words: ['men', 'oinau'] }))).suggest(['men'], 3);
    expect(after[0]).toBe('oinau');
  });

  it('only suggests known words when asked', () => {
    const p = buildPredictor([]);
    expect(p.suggest(['men'], 10, (id) => id === 'su')).toEqual(['su']);
  });
});

describe('frequentPhrases', () => {
  it('returns phrases said at least twice, most frequent first', () => {
    const h = [
      { text: 'A', at: 1 },
      { text: 'B', at: 2 },
      { text: 'A', at: 3 },
      { text: 'B', at: 4 },
      { text: 'B', at: 5 },
      { text: 'C', at: 6 },
    ];
    expect(frequentPhrases(h).map((p) => p.text)).toEqual(['B', 'A']);
  });
});

describe('QUICK_PHRASES', () => {
  it('uses only known words and composes each into a sentence', () => {
    for (const ids of QUICK_PHRASES) {
      const words = ids.map((id) => WORDS_BY_ID.get(id));
      expect(words.every(Boolean)).toBe(true);
      expect(composeKazakh(words.map((w) => w!))).toMatch(/^[А-ЯӘҒҚҢӨҰҮҺІ].*[.!?]$/u);
    }
  });
});
