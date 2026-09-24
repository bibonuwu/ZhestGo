import { describe, expect, it } from 'vitest';
import { VOCABULARY } from '../data/vocabulary';
import { TEST_FACE, fakeHand } from './__fixtures__/synthHand';
import { Recognizer, type CommitEvent } from './recognizer';
import type { HandFeatures } from './types';

const HOLD = 500;
const STEP = 33;

function setup() {
  const rec = new Recognizer(VOCABULARY, { holdMs: HOLD, mode: 'templates', dominant: 'right' });
  const commits: Array<CommitEvent & { t: number }> = [];
  let now = 0;
  const run = (durationMs: number, hands: (t: number) => HandFeatures[]) => {
    const end = now + durationMs;
    for (; now < end; now += STEP) {
      const out = rec.process({ t: now, hands: hands(now), face: TEST_FACE });
      if (out.commit) commits.push({ ...out.commit, t: now });
    }
  };
  return { commits, run };
}

const five = () => [fakeHand({ shape: 'open', dir: 'up', location: 'chest' })];

describe('Recognizer', () => {
  it('commits a static sign once it has been held', () => {
    const { commits, run } = setup();
    run(1500, five);
    expect(commits.map((c) => c.wordId)).toEqual(['bes']);
    expect(commits[0].t).toBeGreaterThanOrEqual(HOLD);
  });

  it('does not commit a sign held for less than the hold time', () => {
    const { commits, run } = setup();
    run(300, five);
    run(600, () => []);
    expect(commits).toEqual([]);
  });

  it('commits the same sign again after the hands drop', () => {
    const { commits, run } = setup();
    run(1000, five);
    run(500, () => []);
    run(1000, five);
    expect(commits.map((c) => c.wordId)).toEqual(['bes', 'bes']);
  });

  it('recognises a wave at head height', () => {
    const { commits, run } = setup();
    run(1500, (t) => [fakeHand({ shape: 'open', location: 'head', x: 320 + 35 * Math.sin((2 * Math.PI * 2.5 * t) / 1000), y: 90 })]);
    expect(commits.map((c) => c.wordId)).toEqual(['salemetsiz']);
  });

  it('lets a moving sign replace the static sign it started from', () => {
    const { commits, run } = setup();
    run(900, () => [fakeHand({ shape: 'open', location: 'head', y: 90 })]);
    run(1500, (t) => [fakeHand({ shape: 'open', location: 'head', x: 320 + 35 * Math.sin((2 * Math.PI * 2.5 * t) / 1000), y: 90 })]);
    expect(commits.map((c) => c.wordId)).toEqual(['toktanyz', 'salemetsiz']);
    expect(commits[1].replaceLast).toBe(true);
  });

  it('recognises two-handed signs', () => {
    const { commits, run } = setup();
    run(1200, () => [
      fakeHand({ side: 'right', shape: 'point', location: 'chest', x: 300 }),
      fakeHand({ side: 'left', shape: 'point', location: 'chest', x: 330 }),
    ]);
    expect(commits.map((c) => c.wordId)).toEqual(['dos']);
  });

  it('reads a one-handed sign from the other hand when the dominant one rests', () => {
    const { commits, run } = setup();
    run(1200, () => [
      fakeHand({ side: 'right', shape: 'fist', location: 'low', x: 150, y: 460 }),
      fakeHand({ side: 'left', shape: 'thumb', dir: 'up', location: 'chest', x: 450 }),
    ]);
    expect(commits.map((c) => c.wordId)).toEqual(['zhaksy']);
  });

  it('moves on to the next sign without dropping the hands', () => {
    const { commits, run } = setup();
    run(1000, five);
    run(1000, () => [fakeHand({ shape: 'thumb', dir: 'up', location: 'chest' })]);
    expect(commits.map((c) => c.wordId)).toEqual(['bes', 'zhaksy']);
    expect(commits[1].replaceLast).toBe(false);
  });
});
