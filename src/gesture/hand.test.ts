import { describe, expect, it } from 'vitest';
import { POSES, TEST_FACE, TEST_FRAME, rotate, synthWorld, toRawHand } from './__fixtures__/synthHand';
import { analyzeHand, assignHands, handRelation, locate } from './hand';

const pointHand = (ax: number, ay: number, az: number) =>
  analyzeHand(toRawHand(rotate(synthWorld(POSES.point), ax, ay, az), { x: 320, y: 380 }), TEST_FRAME, TEST_FACE);

describe('handDirection', () => {
  it('reads the pointing direction of the index finger', () => {
    expect(pointHand(0, 0, 0).dir).toBe('up');
    expect(pointHand(0, 0, 90).dir).toBe('side');
    expect(pointHand(0, 0, -90).dir).toBe('side');
    expect(pointHand(0, 0, 180).dir).toBe('down');
  });

  it('detects a finger pointing at the camera from foreshortening', () => {
    expect(pointHand(80, 0, 0).dir).toBe('forward');
  });
});

describe('locate', () => {
  it('places points relative to the face', () => {
    expect(locate({ x: 320, y: 100 }, TEST_FACE, TEST_FRAME)).toBe('head');
    expect(locate({ x: 320, y: 180 }, TEST_FACE, TEST_FRAME)).toBe('face');
    expect(locate({ x: 330, y: 300 }, TEST_FACE, TEST_FRAME)).toBe('chest');
    expect(locate({ x: 320, y: 600 }, TEST_FACE, TEST_FRAME)).toBe('low');
    expect(locate({ x: 640, y: 150 }, TEST_FACE, TEST_FRAME)).toBe('low');
  });

  it('falls back to frame height when no face is known', () => {
    expect(locate({ x: 320, y: 60 }, null, TEST_FRAME)).toBe('head');
    expect(locate({ x: 320, y: 150 }, null, TEST_FRAME)).toBe('face');
    expect(locate({ x: 320, y: 300 }, null, TEST_FRAME)).toBe('chest');
  });

  it('uses the fingertip for pointing shapes', () => {
    // Wrist at chin level, fingertip well above it → the sign is at the head.
    const hand = analyzeHand(toRawHand(synthWorld(POSES.point), { x: 320, y: 200 }), TEST_FRAME, TEST_FACE);
    expect(hand.location).toBe('head');
  });
});

describe('assignHands', () => {
  const right = analyzeHand(toRawHand(synthWorld(POSES.open), { x: 200, y: 380 }, 'Left'), TEST_FRAME, TEST_FACE);
  const left = analyzeHand(toRawHand(synthWorld(POSES.fist), { x: 440, y: 380 }, 'Right'), TEST_FRAME, TEST_FACE);

  it('maps mirrored MediaPipe labels to the real hands', () => {
    expect(right.side).toBe('right');
    expect(left.side).toBe('left');
  });

  it('picks the dominant hand from the setting', () => {
    expect(assignHands([left, right], 'right').dom?.shape).toBe('open');
    expect(assignHands([left, right], 'left').dom?.shape).toBe('fist');
  });

  it('treats a single hand as dominant', () => {
    expect(assignHands([left], 'right').dom?.shape).toBe('fist');
  });

  it('falls back to image position when both hands get the same label', () => {
    const confusedLeft = { ...left, side: 'right' as const };
    const { dom, nonDom } = assignHands([confusedLeft, right], 'right');
    expect(dom?.shape).toBe('open');
    expect(nonDom?.side).toBe('left');
  });
});

describe('handRelation', () => {
  it('distinguishes touching hands from hands held apart', () => {
    const a = analyzeHand(toRawHand(synthWorld(POSES.point), { x: 300, y: 380 }, 'Left'), TEST_FRAME, TEST_FACE);
    const near = analyzeHand(toRawHand(synthWorld(POSES.point), { x: 330, y: 380 }, 'Right'), TEST_FRAME, TEST_FACE);
    const far = analyzeHand(toRawHand(synthWorld(POSES.point), { x: 560, y: 380 }, 'Right'), TEST_FRAME, TEST_FACE);
    expect(handRelation(a, near)).toBe('together');
    expect(handRelation(a, far)).toBe('apart');
  });
});
