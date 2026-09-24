import { describe, expect, it } from 'vitest';
import { MotionTracker, countSwings, totalTurn } from './motion';
import type { HandShape } from './types';

const HOLD = 500;

function track(path: (t: number) => { x: number; y: number }, durationMs = 1200, shape: (t: number) => HandShape = () => 'open') {
  const tracker = new MotionTracker();
  for (let t = 0; t <= durationMs; t += 33) {
    const { x, y } = path(t / 1000);
    tracker.push({ t, x, y, shape: shape(t), dir: 'up', location: 'chest' });
  }
  return tracker.summarize(HOLD);
}

describe('countSwings', () => {
  it('counts reversals above the amplitude threshold', () => {
    expect(countSwings([0, 1, 0, 1, 0], 0.5)).toBe(3);
    expect(countSwings([0, 0.1, 0, 0.1, 0], 0.5)).toBe(0);
    expect(countSwings([0, 1, 2, 3], 0.5)).toBe(0);
  });
});

describe('totalTurn', () => {
  it('accumulates about 2π for one full circle and ~0 for back-and-forth', () => {
    const circle = Array.from({ length: 40 }, (_, i) => ({ x: Math.cos((i / 40) * 2 * Math.PI), y: Math.sin((i / 40) * 2 * Math.PI) }));
    expect(Math.abs(totalTurn(circle, 0.01))).toBeGreaterThan(1.8 * Math.PI);
    const zigzag = [0, 1, 0, 1, 0, 1].map((x) => ({ x, y: 0 }));
    expect(Math.abs(totalTurn(zigzag, 0.01))).toBeLessThan(0.1);
  });
});

describe('MotionTracker', () => {
  it('detects holding still (small tremor allowed)', () => {
    const s = track((t) => ({ x: 2 + 0.02 * Math.sin(t * 40), y: 3 + 0.02 * Math.cos(t * 33) }));
    expect(s.motion).toBe('still');
    expect(s.stillFor).toBeGreaterThanOrEqual(HOLD);
    expect(s.shape).toBe('open');
  });

  it('is not still before the hold time has passed', () => {
    const s = track(() => ({ x: 2, y: 3 }), 300);
    expect(s.motion).toBe('moving');
  });

  it('detects a side-to-side wave', () => {
    expect(track((t) => ({ x: 2 + 0.25 * Math.sin(2 * Math.PI * 2.5 * t), y: 3 })).motion).toBe('wave');
  });

  it('detects an up-and-down nod', () => {
    expect(track((t) => ({ x: 2, y: 3 + 0.15 * Math.sin(2 * Math.PI * 2.5 * t) })).motion).toBe('nod');
  });

  it('detects a circle', () => {
    const w = 2 * Math.PI * 1.1;
    expect(track((t) => ({ x: 2 + 0.2 * Math.cos(w * t), y: 3 + 0.2 * Math.sin(w * t) })).motion).toBe('circle');
  });

  it('reports plain travel as moving', () => {
    expect(track((t) => ({ x: 2 + t * 0.9, y: 3 })).motion).toBe('moving');
  });

  it('refuses a shape when the hand keeps changing form', () => {
    const s = track(() => ({ x: 2, y: 3 }), 1200, (t) => (Math.floor(t / 66) % 2 ? 'open' : 'fist'));
    expect(s.motion).toBe('still');
    expect(s.shape).toBeNull();
  });
});
