import { centroid, dist2 } from './geometry';
import { classifyHandShape } from './handshape';
import { PALM_POINTS } from './landmarks';
import type {
  Direction,
  FaceBox,
  HandFeatures,
  HandShape,
  HandSide,
  Location,
  Point2,
  Point3,
  RawHand,
  Relation,
} from './types';

export interface FrameSize {
  width: number;
  height: number;
}

/**
 * Location zones relative to the face box (BlazeFace box ≈ forehead…chin,
 * centre ≈ nose). Vertical values are in face heights, horizontal in widths.
 */
export const LOCATION_ZONES = {
  headAbove: -0.2,
  faceAbove: 0.6,
  chestAbove: 3.2,
  maxSide: 2.6,
};

/** A finger is "pointing at the camera" when its 2D length shrinks below this share. */
const FORESHORTENED = 0.42;
/** Two hands are "together" when their closest landmarks are nearer than this × hand size. */
const TOGETHER_RATIO = 0.55;

interface DirectionVector {
  from: readonly number[];
  to: readonly number[];
  /** Typical 2D length of the vector relative to hand scale when seen side-on. */
  length: number;
}

const INDEX_VECTOR: DirectionVector = { from: [5], to: [8], length: 0.9 };
const HAND_AXIS: DirectionVector = { from: [0], to: [9], length: 1 };

const DIRECTION_VECTORS: Partial<Record<HandShape, DirectionVector>> = {
  thumb: { from: [2], to: [4], length: 0.6 },
  point: INDEX_VECTOR,
  l: INDEX_VECTOR,
  k: INDEX_VECTOR,
  pinky: { from: [17], to: [20], length: 0.65 },
  v: { from: [5, 9], to: [8, 12], length: 0.9 },
  three: { from: [5, 9, 13], to: [8, 12, 16], length: 0.9 },
};

/** Shapes whose location is judged by the fingertip rather than the palm. */
const TIP_ANCHORS: Partial<Record<HandShape, readonly number[]>> = {
  point: [8],
  l: [8],
  k: [8, 12],
  v: [8, 12],
  three: [8, 12],
  thumb: [4],
  pinch: [4, 8, 12],
};

export function toPixels(landmarks: readonly Point3[], frame: FrameSize): Point3[] {
  return landmarks.map((p) => ({ x: p.x * frame.width, y: p.y * frame.height, z: p.z * frame.width }));
}

/** Hand size in pixels that survives foreshortening of either palm axis. */
export function handScale(px: readonly Point3[]): number {
  return Math.max(dist2(px[0], px[9]), dist2(px[5], px[17]) / 0.75, 1e-6);
}

export function handDirection(px: readonly Point3[], shape: HandShape | null, scale: number): Direction {
  const vector = (shape && DIRECTION_VECTORS[shape]) ?? HAND_AXIS;
  const a = centroid(vector.from.map((i) => px[i]));
  const b = centroid(vector.to.map((i) => px[i]));
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  if (Math.hypot(dx, dy) / scale < vector.length * FORESHORTENED) return 'forward';
  const deg = Math.abs((Math.atan2(dx, -dy) * 180) / Math.PI);
  if (deg <= 45) return 'up';
  if (deg >= 135) return 'down';
  return 'side';
}

export function anchorPoint(px: readonly Point3[], shape: HandShape | null): Point2 {
  const indices = (shape && TIP_ANCHORS[shape]) ?? PALM_POINTS;
  return centroid(indices.map((i) => px[i]));
}

export function locate(p: Point2, face: FaceBox | null, frame: FrameSize): Location {
  const z = LOCATION_ZONES;
  if (face) {
    const v = (p.y - face.cy) / face.h;
    const side = Math.abs(p.x - face.cx) / face.w;
    if (side > z.maxSide) return 'low';
    if (v < z.headAbove) return 'head';
    if (v < z.faceAbove) return 'face';
    if (v < z.chestAbove) return 'chest';
    return 'low';
  }
  // No face seen yet: assume a typical webcam framing.
  const y = p.y / frame.height;
  if (y < 0.22) return 'head';
  if (y < 0.42) return 'face';
  if (y < 0.92) return 'chest';
  return 'low';
}

/** MediaPipe labels handedness as if the frame were mirrored; we feed raw frames. */
export function actualSide(label: RawHand['label']): HandSide {
  return label === 'Left' ? 'right' : 'left';
}

export function analyzeHand(raw: RawHand, frame: FrameSize, face: FaceBox | null): HandFeatures {
  const px = toPixels(raw.landmarks, frame);
  const world = raw.world.length === 21 ? raw.world : px;
  const { shape, fingers } = classifyHandShape(world);
  const scale = handScale(px);
  const anchor = anchorPoint(px, shape);
  return {
    side: actualSide(raw.label),
    shape,
    fingers,
    dir: handDirection(px, shape, scale),
    location: locate(anchor, face, frame),
    anchor,
    tip: { x: px[8].x, y: px[8].y },
    palmCenter: centroid(PALM_POINTS.map((i) => px[i])),
    scale,
    px,
    world,
  };
}

/**
 * Picks the dominant hand. A single visible hand is always treated as
 * dominant, so one-handed signs work with either hand.
 */
export function assignHands(
  hands: readonly HandFeatures[],
  dominant: HandSide,
): { dom: HandFeatures | null; nonDom: HandFeatures | null } {
  if (hands.length === 0) return { dom: null, nonDom: null };
  if (hands.length === 1) return { dom: hands[0], nonDom: null };

  let [a, b] = hands;
  if (a.side === b.side) {
    // Both got the same label: fall back to position. In a raw (un-mirrored)
    // frame the signer's right hand is the one with the smaller x.
    const rightHand = a.palmCenter.x <= b.palmCenter.x ? a : b;
    const leftHand = rightHand === a ? b : a;
    a = { ...rightHand, side: 'right' };
    b = { ...leftHand, side: 'left' };
  }
  return a.side === dominant ? { dom: a, nonDom: b } : { dom: b, nonDom: a };
}

const CONTACT_POINTS = [0, 4, 5, 8, 9, 12, 13, 16, 17, 20] as const;

export function handRelation(a: HandFeatures, b: HandFeatures): Relation {
  let min = Infinity;
  for (const i of CONTACT_POINTS) {
    for (const j of CONTACT_POINTS) {
      min = Math.min(min, dist2(a.px[i], b.px[j]));
    }
  }
  return min < TOGETHER_RATIO * ((a.scale + b.scale) / 2) ? 'together' : 'apart';
}
