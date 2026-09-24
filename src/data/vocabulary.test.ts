import { describe, expect, it } from 'vitest';
import { bestMatch, specsConflict } from '../gesture/matcher';
import { HAND_SHAPES, type Direction, type Observation, type Relation, type SpecLocation } from '../gesture/types';
import { LANGS } from './gestureText';
import { CATEGORIES, VOCABULARY } from './vocabulary';

const DIRS: Direction[] = ['up', 'down', 'side', 'forward'];
const LOCS: SpecLocation[] = ['head', 'face', 'chest'];

describe('vocabulary', () => {
  it('has exactly 100 words', () => {
    expect(VOCABULARY).toHaveLength(100);
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
    for (const w of VOCABULARY) {
      expect(HAND_SHAPES).toContain(w.gesture.shape);
      if (w.gesture.second) expect(HAND_SHAPES).toContain(w.gesture.second.shape);
      expect(categories.has(w.category)).toBe(true);
    }
  });

  it('has no two gestures that the matcher could confuse', () => {
    const conflicts: string[] = [];
    VOCABULARY.forEach((a, i) => {
      VOCABULARY.slice(i + 1).forEach((b) => {
        if (specsConflict(a.gesture, b.gesture)) conflicts.push(`${a.id} ↔ ${b.id}`);
      });
    });
    expect(conflicts).toEqual([]);
  });

  it('can recognise every word from an observation of its own gesture', () => {
    const unreachable: string[] = [];
    for (const word of VOCABULARY) {
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
          return bestMatch(VOCABULARY, observation)?.entry.id === word.id;
        }),
      );
      if (!reachable) unreachable.push(word.id);
    }
    expect(unreachable).toEqual([]);
  });
});
