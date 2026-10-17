/**
 * Anatomically plausible synthetic hands for tests. Coordinates are metres in
 * the hand's own frame: fingers point to -y (up in the image), the palm faces -z.
 */
import type { FaceBox, HandFeatures, HandShape, HandSide, Location, Direction, Point3, RawHand } from '../types';

export type FingerPose = 'ext' | 'curl' | 'half' | 'hook';
export type ThumbPose = 'out' | 'along' | 'wrapped' | 'touchIndex' | 'pinch';

export interface HandPose {
  thumb: ThumbPose;
  index: FingerPose;
  middle: FingerPose;
  ring: FingerPose;
  pinky: FingerPose;
}

const FLEX: Record<FingerPose, [number, number, number]> = {
  ext: [4, 4, 2],
  curl: [80, 100, 60],
  half: [50, 70, 30],
  hook: [45, 60, 30],
};

const FINGERS = {
  index: { mcp: { x: -0.022, y: -0.085, z: 0 }, seg: [0.04, 0.025, 0.02], spread: -8 },
  middle: { mcp: { x: 0, y: -0.09, z: 0 }, seg: [0.045, 0.028, 0.022], spread: 0 },
  ring: { mcp: { x: 0.02, y: -0.085, z: 0 }, seg: [0.042, 0.026, 0.021], spread: 6 },
  pinky: { mcp: { x: 0.038, y: -0.075, z: 0 }, seg: [0.033, 0.02, 0.018], spread: 14 },
} as const;

const rad = (deg: number) => (deg * Math.PI) / 180;

function fingerChain(name: keyof typeof FINGERS, pose: FingerPose): Point3[] {
  const f = FINGERS[name];
  const s = rad(f.spread);
  const pts: Point3[] = [{ ...f.mcp }];
  let theta = 0;
  let p = f.mcp as Point3;
  FLEX[pose].forEach((flex, i) => {
    theta += rad(flex);
    const d = { x: Math.sin(s) * Math.cos(theta), y: -Math.cos(s) * Math.cos(theta), z: -Math.sin(theta) };
    p = { x: p.x + d.x * f.seg[i], y: p.y + d.y * f.seg[i], z: p.z + d.z * f.seg[i] };
    pts.push(p);
  });
  return pts;
}

const lerp = (a: Point3, b: Point3, t: number): Point3 => ({
  x: a.x + (b.x - a.x) * t,
  y: a.y + (b.y - a.y) * t,
  z: a.z + (b.z - a.z) * t,
});

function thumbChain(pose: ThumbPose, indexTip: Point3, middleTip: Point3): Point3[] {
  const cmc = { x: -0.025, y: -0.025, z: -0.005 };
  switch (pose) {
    case 'out':
      return [cmc, { x: -0.045, y: -0.04, z: -0.01 }, { x: -0.068, y: -0.06, z: -0.015 }, { x: -0.085, y: -0.078, z: -0.018 }];
    case 'along':
      return [cmc, { x: -0.035, y: -0.04, z: -0.008 }, { x: -0.034, y: -0.065, z: -0.01 }, { x: -0.03, y: -0.085, z: -0.012 }];
    case 'wrapped':
      return [cmc, { x: -0.035, y: -0.04, z: -0.015 }, { x: -0.022, y: -0.06, z: -0.035 }, { x: 0, y: -0.065, z: -0.04 }];
    case 'touchIndex':
    case 'pinch': {
      const target = pose === 'pinch' ? lerp(indexTip, middleTip, 0.5) : { x: indexTip.x - 0.005, y: indexTip.y + 0.005, z: indexTip.z + 0.005 };
      const mcp = { x: -0.04, y: -0.04, z: -0.015 };
      return [cmc, mcp, lerp(mcp, target, 0.55), target];
    }
  }
}

export function synthWorld(pose: HandPose): Point3[] {
  const index = fingerChain('index', pose.index);
  const middle = fingerChain('middle', pose.middle);
  const ring = fingerChain('ring', pose.ring);
  const pinky = fingerChain('pinky', pose.pinky);
  const thumb = thumbChain(pose.thumb, index[3], middle[3]);
  return [{ x: 0, y: 0, z: 0 }, ...thumb, ...index, ...middle, ...ring, ...pinky];
}

/** Finger poses that produce each shape. */
export const POSES: Record<HandShape, HandPose> = {
  fist: { thumb: 'wrapped', index: 'curl', middle: 'curl', ring: 'curl', pinky: 'curl' },
  open: { thumb: 'out', index: 'ext', middle: 'ext', ring: 'ext', pinky: 'ext' },
  four: { thumb: 'along', index: 'ext', middle: 'ext', ring: 'ext', pinky: 'ext' },
  point: { thumb: 'wrapped', index: 'ext', middle: 'curl', ring: 'curl', pinky: 'curl' },
  v: { thumb: 'wrapped', index: 'ext', middle: 'ext', ring: 'curl', pinky: 'curl' },
  three: { thumb: 'wrapped', index: 'ext', middle: 'ext', ring: 'ext', pinky: 'curl' },
  k: { thumb: 'out', index: 'ext', middle: 'ext', ring: 'curl', pinky: 'curl' },
  thumb: { thumb: 'out', index: 'curl', middle: 'curl', ring: 'curl', pinky: 'curl' },
  ok: { thumb: 'touchIndex', index: 'hook', middle: 'ext', ring: 'ext', pinky: 'ext' },
  pinky: { thumb: 'wrapped', index: 'curl', middle: 'curl', ring: 'curl', pinky: 'ext' },
  call: { thumb: 'out', index: 'curl', middle: 'curl', ring: 'curl', pinky: 'ext' },
  l: { thumb: 'out', index: 'ext', middle: 'curl', ring: 'curl', pinky: 'curl' },
  ily: { thumb: 'out', index: 'ext', middle: 'curl', ring: 'curl', pinky: 'ext' },
  horns: { thumb: 'wrapped', index: 'ext', middle: 'curl', ring: 'curl', pinky: 'ext' },
  pinch: { thumb: 'pinch', index: 'half', middle: 'half', ring: 'half', pinky: 'half' },
};

/** Rotates points by Euler angles (degrees) around x, then y, then z. */
export function rotate(points: readonly Point3[], ax: number, ay: number, az: number): Point3[] {
  const [sx, cx, sy, cy, sz, cz] = [ax, ay, az].flatMap((a) => [Math.sin(rad(a)), Math.cos(rad(a))]);
  return points.map(({ x, y, z }) => {
    const y1 = y * cx - z * sx;
    const z1 = y * sx + z * cx;
    const x2 = x * cy + z1 * sy;
    const z2 = -x * sy + z1 * cy;
    return { x: x2 * cz - y1 * sz, y: x2 * sz + y1 * cz, z: z2 };
  });
}

/**
 * Places a world-space hand into a 640×480 frame as a RawHand: `at` is the
 * wrist position in pixels, `pxPerMetre` the apparent size.
 */
export function toRawHand(
  world: readonly Point3[],
  at: { x: number; y: number },
  label: RawHand['label'] = 'Right',
  pxPerMetre = 1400,
  frame = { width: 640, height: 480 },
): RawHand {
  const landmarks = world.map((p) => ({
    x: (at.x + p.x * pxPerMetre) / frame.width,
    y: (at.y + p.y * pxPerMetre) / frame.height,
    z: (p.z * pxPerMetre) / frame.width,
  }));
  return { landmarks, world: [...world], label, score: 1 };
}

export const TEST_FRAME = { width: 640, height: 480 };
export const TEST_FACE: FaceBox = { cx: 320, cy: 140, w: 110, h: 130 };

/** Lightweight HandFeatures for recognizer tests: a blob of landmarks around (x, y). */
export function fakeHand(opts: {
  side?: HandSide;
  shape: HandShape | null;
  dir?: Direction;
  location: Location;
  x?: number;
  y?: number;
  scale?: number;
}): HandFeatures {
  const { side = 'right', shape, dir = 'up', location, x = 320, y = 300, scale = 60 } = opts;
  const px = Array.from({ length: 21 }, (_, i) => ({
    x: x + Math.cos(i) * scale * 0.4,
    y: y + Math.sin(i) * scale * 0.4,
    z: 0,
  }));
  return {
    side,
    shape,
    fingers: { thumb: false, index: false, middle: false, ring: false, pinky: false },
    dir,
    location,
    anchor: { x, y },
    tip: { x, y: y - scale * 0.6 },
    palmCenter: { x, y },
    scale,
    px,
    world: synthWorld(POSES[shape ?? 'fist']),
  };
}
