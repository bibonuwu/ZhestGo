import { angleBetween, centroid3, dist, sub } from './geometry';
import { FINGER_CHAINS, LM, PALM_POINTS } from './landmarks';
import type { FingerStates, HandShape, Point3 } from './types';

/**
 * Tunable thresholds. Distances are relative to the palm length
 * (wrist → middle-finger knuckle), so they do not depend on hand size.
 */
export const SHAPE_THRESHOLDS = {
  /** Finger counts as extended when chord/path from knuckle to tip ≥ this. */
  fingerStraightness: 0.8,
  /** Minimum angle between the thumb and the palm axis for an extended thumb. */
  thumbAbductionDeg: 30,
  /** Thumb tip distance from the palm centre for an extended thumb. */
  thumbPalmReach: 0.62,
  /** Thumb tip distance from the index knuckle for an extended thumb. */
  thumbIndexReach: 0.42,
  /** Two fingertips "touch" when closer than this. */
  touch: 0.3,
  /** In a pinch the index tip stays away from the wrist (unlike in a fist). */
  pinchReach: 0.85,
};

const T = SHAPE_THRESHOLDS;

/** Finger-state bit pattern (thumb, index, middle, ring, pinky) → shape. */
const SHAPE_BY_BITS: Readonly<Record<string, HandShape>> = {
  '00000': 'fist',
  '11111': 'open',
  '01111': 'four',
  '01000': 'point',
  '01100': 'v',
  '01110': 'three',
  '11100': 'k',
  '10000': 'thumb',
  '00001': 'pinky',
  '10001': 'call',
  '11000': 'l',
  '11001': 'ily',
  '01001': 'horns',
};

function palmLength(w: readonly Point3[]): number {
  return dist(w[LM.WRIST], w[LM.MIDDLE_MCP]) || 1e-6;
}

function fingerExtended(w: readonly Point3[], chain: readonly number[]): boolean {
  const [mcp, pip, dip, tip] = chain.map((i) => w[i]);
  const path = dist(mcp, pip) + dist(pip, dip) + dist(dip, tip);
  if (path === 0) return false;
  return dist(mcp, tip) / path >= T.fingerStraightness;
}

function thumbExtended(w: readonly Point3[], palm: number): boolean {
  const palmCenter = centroid3(PALM_POINTS.map((i) => w[i]));
  const abduction = angleBetween(sub(w[LM.THUMB_TIP], w[LM.THUMB_MCP]), sub(w[LM.MIDDLE_MCP], w[LM.WRIST]));
  const palmReach = dist(w[LM.THUMB_TIP], palmCenter) / palm;
  const indexReach = dist(w[LM.THUMB_TIP], w[LM.INDEX_MCP]) / palm;
  return abduction >= T.thumbAbductionDeg && palmReach >= T.thumbPalmReach && indexReach >= T.thumbIndexReach;
}

export function fingerStates(w: readonly Point3[]): FingerStates {
  const palm = palmLength(w);
  return {
    thumb: thumbExtended(w, palm),
    index: fingerExtended(w, FINGER_CHAINS.index),
    middle: fingerExtended(w, FINGER_CHAINS.middle),
    ring: fingerExtended(w, FINGER_CHAINS.ring),
    pinky: fingerExtended(w, FINGER_CHAINS.pinky),
  };
}

export function fingerBits(f: FingerStates): string {
  return [f.thumb, f.index, f.middle, f.ring, f.pinky].map((b) => (b ? '1' : '0')).join('');
}

/**
 * Classifies a hand from its 3D world landmarks. Uses only distances and
 * angles, so the result does not depend on hand rotation or camera distance.
 */
export function classifyHandShape(w: readonly Point3[]): { shape: HandShape | null; fingers: FingerStates } {
  const palm = palmLength(w);
  const fingers = fingerStates(w);

  const thumbToIndex = dist(w[LM.THUMB_TIP], w[LM.INDEX_TIP]) / palm;
  if (thumbToIndex < T.touch && fingers.middle && fingers.ring && fingers.pinky) {
    return { shape: 'ok', fingers };
  }

  const thumbToMiddle = dist(w[LM.THUMB_TIP], w[LM.MIDDLE_TIP]) / palm;
  const indexReach = dist(w[LM.INDEX_TIP], w[LM.WRIST]) / palm;
  if (
    thumbToIndex < T.touch &&
    thumbToMiddle < T.touch * 1.5 &&
    !fingers.index &&
    !fingers.middle &&
    indexReach > T.pinchReach
  ) {
    return { shape: 'pinch', fingers };
  }

  return { shape: SHAPE_BY_BITS[fingerBits(fingers)] ?? null, fingers };
}
