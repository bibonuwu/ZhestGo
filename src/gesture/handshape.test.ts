import { describe, expect, it } from 'vitest';
import { POSES, rotate, synthWorld } from './__fixtures__/synthHand';
import { classifyHandShape } from './handshape';
import { HAND_SHAPES } from './types';

const ROTATIONS: Array<[number, number, number]> = [
  [0, 0, 90],
  [0, 0, 180],
  [40, -30, 160],
  [-60, 45, -90],
  [75, 10, 0],
];

describe('classifyHandShape', () => {
  it.each(HAND_SHAPES)('recognises %s', (shape) => {
    expect(classifyHandShape(synthWorld(POSES[shape])).shape).toBe(shape);
  });

  it.each(HAND_SHAPES)('recognises %s regardless of hand rotation', (shape) => {
    for (const [ax, ay, az] of ROTATIONS) {
      expect(classifyHandShape(rotate(synthWorld(POSES[shape]), ax, ay, az)).shape).toBe(shape);
    }
  });

  it('does not depend on hand size', () => {
    for (const shape of HAND_SHAPES) {
      const big = synthWorld(POSES[shape]).map((p) => ({ x: p.x * 1.4, y: p.y * 1.4, z: p.z * 1.4 }));
      expect(classifyHandShape(big).shape).toBe(shape);
    }
  });

  it('tells a flat hand (thumb along the palm) from an open hand', () => {
    expect(classifyHandShape(synthWorld({ ...POSES.open, thumb: 'along' })).shape).toBe('four');
    expect(classifyHandShape(synthWorld(POSES.open)).fingers.thumb).toBe(true);
  });

  it('returns null for finger combinations that are not in the alphabet', () => {
    const middleOnly = synthWorld({ thumb: 'wrapped', index: 'curl', middle: 'ext', ring: 'curl', pinky: 'curl' });
    expect(classifyHandShape(middleOnly).shape).toBeNull();
  });
});
