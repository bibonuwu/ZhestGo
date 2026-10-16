import { describe, expect, it } from 'vitest';
import rules from '../../firestore.rules?raw';
import { SIGN_BY_WORD, SIGN_TOPICS, SIGNS } from './signs';
import { WORDS_BY_ID } from './vocabulary';

describe('video lessons', () => {
  it('has 50 signs with unique ids and source files', () => {
    expect(SIGNS).toHaveLength(50);
    expect(new Set(SIGNS.map((s) => s.id)).size).toBe(SIGNS.length);
    expect(new Set(SIGNS.map((s) => s.source)).size).toBe(SIGNS.length);
  });

  it('uses known topics and has every translation', () => {
    const topics = new Set(SIGN_TOPICS.map((t) => t.id));
    for (const s of SIGNS) {
      expect(topics.has(s.topic), s.id).toBe(true);
      expect(s.kk && s.ru && s.en, s.id).toBeTruthy();
    }
  });

  it('links only to dictionary words with the same Kazakh word', () => {
    for (const s of SIGNS.filter((x) => x.wordId)) {
      expect(WORDS_BY_ID.get(s.wordId!)?.kk, s.id).toBe(s.kk);
    }
    expect(SIGN_BY_WORD.size).toBe(SIGNS.filter((s) => s.wordId).length);
  });

  it('has a compressed video and poster for every sign (npm run videos)', () => {
    // Only the file names are listed; nothing is loaded.
    const files = new Set(Object.keys(import.meta.glob('../../public/signs/*.{mp4,webp}')).map((f) => f.split('/').pop()));
    for (const s of SIGNS) {
      expect(files.has(`${s.id}.mp4`), `${s.id}.mp4`).toBe(true);
      expect(files.has(`${s.id}.webp`), `${s.id}.webp`).toBe(true);
    }
  });

  it('firestore.rules accepts exactly these signs', () => {
    const list = rules.slice(rules.indexOf('function signIds()'), rules.indexOf('function validProfile'));
    expect([...list.matchAll(/'([\w-]+)'/g)].map((m) => m[1])).toEqual(SIGNS.map((s) => s.id));
  });
});
