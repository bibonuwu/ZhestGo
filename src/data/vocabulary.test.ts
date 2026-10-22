import { describe, expect, it } from 'vitest';
import { bestMatch, specsConflict } from '../gesture/matcher';
import { HAND_SHAPES, type Direction, type Observation, type Relation, type SpecLocation } from '../gesture/types';
import { LANGS } from './gestureText';
import { SIGNS } from './signs';
import { CATEGORIES, TEMPLATE_WORDS, VOCABULARY, WORDS_BY_ID } from './vocabulary';
import { LESSON_WORDS } from './words';

const DIRS: Direction[] = ['up', 'down', 'side', 'forward'];
const LOCS: SpecLocation[] = ['head', 'face', 'chest'];

describe('vocabulary', () => {
  it('has 120 words: 100 with Qoldau gestures, 20 only as video signs', () => {
    expect(VOCABULARY).toHaveLength(120);
    expect(TEMPLATE_WORDS).toHaveLength(100);
  });

  it('offers exactly the 50 words of the video lessons', () => {
    expect(LESSON_WORDS).toHaveLength(SIGNS.length);
    expect(LESSON_WORDS.map((w) => w.id).sort()).toEqual(SIGNS.map((s) => s.wordId).sort());
  });

  it('keeps money and books out of “needs”', () => {
    expect(WORDS_BY_ID.get('aksha')?.category).toBe('things');
    expect(WORDS_BY_ID.get('kitap')?.category).toBe('things');
  });

  it('has a word for every video sign', () => {
    const signWords = new Set(SIGNS.map((s) => s.wordId));
    expect(VOCABULARY.filter((w) => !w.gesture && !signWords.has(w.id)).map((w) => w.id)).toEqual([]);
  });

  it('has unique ids and unique Kazakh words', () => {
    expect(new Set(VOCABULARY.map((w) => w.id)).size).toBe(VOCABULARY.length);
    expect(new Set(VOCABULARY.map((w) => w.kk)).size).toBe(VOCABULARY.length);
  });

  it('is translated into every interface language', () => {
    for (const w of VOCABULARY) {
      expect([w.kk, w.ru, w.en].every((s) => s.trim())).toBe(true);
      if (w.hint) expect(LANGS.every((lang) => w.hint?.[lang].trim())).toBe(true);
    }
  });

  it('uses only known shapes and categories', () => {
    const categories = new Set(CATEGORIES.map((c) => c.id));
    for (const w of VOCABULARY) expect(categories.has(w.category), w.id).toBe(true);
    for (const w of TEMPLATE_WORDS) {
      expect(HAND_SHAPES).toContain(w.gesture.shape);
      if (w.gesture.second) expect(HAND_SHAPES).toContain(w.gesture.second.shape);
    }
  });

  it('has no two gestures that the matcher could confuse', () => {
    const conflicts: string[] = [];
    TEMPLATE_WORDS.forEach((a, i) => {
      TEMPLATE_WORDS.slice(i + 1).forEach((b) => {
        if (specsConflict(a.gesture, b.gesture)) conflicts.push(`${a.id} ↔ ${b.id}`);
      });
    });
    expect(conflicts).toEqual([]);
  });

  it('can recognise every word from an observation of its own gesture', () => {
    const unreachable: string[] = [];
    for (const word of TEMPLATE_WORDS) {
      const g = word.gesture;
      const relation: Relation | null = g.second ? (g.second.relation ?? 'apart') : null;
      const reachable = (g.dir ? [g.dir] : DIRS).some((dir) =>
        (g.location ? [g.location] : LOCS).some((location) => {
          const observation: Observation = {
            hands: g.second ? 2 : 1,
            motion: g.motion ?? 'still',
            dom: { shape: g.shape, dir, location },
            nonDom: g.second ? { shape: g.second.shape, dir: 'up', location } : null,
            relation,
          };
          return bestMatch(TEMPLATE_WORDS, observation)?.entry.id === word.id;
        }),
      );
      if (!reachable) unreachable.push(word.id);
    }
    expect(unreachable).toEqual([]);
  });
});
