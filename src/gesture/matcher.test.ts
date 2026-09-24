import { describe, expect, it } from 'vitest';
import { bestMatch, matchSpec, specsConflict } from './matcher';
import type { Observation } from './types';

const obs = (o: Partial<Observation>): Observation => ({
  hands: 1,
  dom: { shape: 'point', dir: 'up', location: 'chest' },
  nonDom: null,
  relation: null,
  motion: 'still',
  ...o,
});

describe('matchSpec', () => {
  it('requires the same motion', () => {
    expect(matchSpec({ shape: 'point', motion: 'wave' }, obs({}))).toBe(-1);
    expect(matchSpec({ shape: 'point' }, obs({}))).toBeGreaterThan(0);
  });

  it('prefers the more specific spec', () => {
    const entries = [
      { id: 'loose', gesture: { shape: 'point' as const, location: 'chest' as const } },
      { id: 'tight', gesture: { shape: 'point' as const, location: 'chest' as const, dir: 'up' as const } },
    ];
    expect(bestMatch(entries, obs({}))?.entry.id).toBe('tight');
    expect(bestMatch(entries, obs({ dom: { shape: 'point', dir: 'side', location: 'chest' } }))?.entry.id).toBe('loose');
  });

  it('keeps one-handed signs out of two-handed contact', () => {
    const twoTogether = obs({
      hands: 2,
      nonDom: { shape: 'open', dir: 'up', location: 'chest' },
      relation: 'together',
    });
    expect(matchSpec({ shape: 'point', location: 'chest' }, twoTogether)).toBe(-1);
    expect(matchSpec({ shape: 'point', location: 'chest' }, { ...twoTogether, relation: 'apart' })).toBeGreaterThan(0);
  });

  it('matches two-handed signs with the roles swapped', () => {
    const spec = { shape: 'thumb' as const, second: { shape: 'open' as const, relation: 'together' as const } };
    const swapped = obs({
      hands: 2,
      dom: { shape: 'open', dir: 'up', location: 'chest' },
      nonDom: { shape: 'thumb', dir: 'up', location: 'chest' },
      relation: 'together',
    });
    expect(matchSpec(spec, swapped)).toBeGreaterThan(0);
  });
});

describe('specsConflict', () => {
  it('flags specs that tie on some observation', () => {
    expect(specsConflict({ shape: 'point', location: 'chest' }, { shape: 'point', dir: 'up' })).toBe(true);
    expect(specsConflict({ shape: 'point', location: 'chest' }, { shape: 'point', location: 'chest' })).toBe(true);
  });

  it('accepts refinements and disjoint specs', () => {
    expect(specsConflict({ shape: 'point', location: 'chest' }, { shape: 'point', location: 'chest', dir: 'up' })).toBe(false);
    expect(specsConflict({ shape: 'point', location: 'chest' }, { shape: 'point', location: 'face' })).toBe(false);
    expect(specsConflict({ shape: 'point' }, { shape: 'point', motion: 'wave' })).toBe(false);
  });
});
