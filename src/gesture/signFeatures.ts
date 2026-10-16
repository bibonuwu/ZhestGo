import { centroid } from './geometry';
import type { FaceBox, HandFeatures, Point3 } from './types';

/**
 * Features of the recorded signs (see signSpotter.ts). They describe a hand
 * the same way for any signer: finger bends do not depend on hand size or
 * rotation, positions are measured from the face in face widths.
 */
export interface SignHand {
  /** Finger and thumb bends, thumb reach and finger spread (16 numbers). */
  shape: number[];
  /** Palm normal and the wrist → middle-knuckle direction, camera axes (6 numbers). */
  orient: number[];
  /** Palm centre and fingertip centre relative to the face, in face widths. Null without a face. */
  loc: number[] | null;
  /** Palm velocity, squashed to below 1: direction plus "slow or fast" (2 numbers). */
  vel: number[];
}

export interface SignFrame {
  t: number;
  /** Ordered left to right in the camera image: the signer's right hand first. */
  hands: SignHand[];
}

export const SHAPE_SIZE = 16;
export const HAND_SIZE = SHAPE_SIZE + 6 + 4 + 2;

const FINGER_CHAINS = [
  [5, 6, 7, 8],
  [9, 10, 11, 12],
  [13, 14, 15, 16],
  [17, 18, 19, 20],
] as const;

const sub = (a: Point3, b: Point3): Point3 => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
const len = (v: Point3): number => Math.hypot(v.x, v.y, v.z);
const unit = (v: Point3): number[] => {
  const l = len(v) || 1e-9;
  return [v.x / l, v.y / l, v.z / l];
};
const cross = (a: Point3, b: Point3): Point3 => ({ x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x });

/** Angle between two vectors, radians. */
function angle(a: Point3, b: Point3): number {
  const c = (a.x * b.x + a.y * b.y + a.z * b.z) / (len(a) * len(b) || 1e-9);
  return Math.acos(Math.min(1, Math.max(-1, c)));
}

/** Hand shape from 3D world landmarks: independent of hand size and rotation. */
export function handShape(w: readonly Point3[]): number[] {
  const v = (a: number, b: number) => sub(w[b], w[a]);
  const palm = len(v(0, 9)) || 1e-6;
  const out: number[] = [];
  for (const [mcp, pip, dip, tip] of FINGER_CHAINS) {
    out.push(angle(v(0, mcp), v(mcp, pip)));
    out.push((angle(v(mcp, pip), v(pip, dip)) + angle(v(pip, dip), v(dip, tip))) / 2);
  }
  out.push(angle(v(1, 2), v(2, 3)), angle(v(2, 3), v(3, 4)));
  out.push(len(v(4, 5)) / palm, len(v(4, 8)) / palm, len(v(4, 17)) / palm);
  out.push(angle(v(5, 6), v(9, 10)), angle(v(9, 10), v(13, 14)), angle(v(13, 14), v(17, 18)));
  return out;
}

/** Which way the palm faces and the fingers point. */
export function handOrient(w: readonly Point3[]): number[] {
  return [...unit(cross(sub(w[5], w[0]), sub(w[17], w[0]))), ...unit(sub(w[9], w[0]))];
}

export function signHand(h: HandFeatures, face: FaceBox | null): SignHand {
  let loc: number[] | null = null;
  if (face) {
    const palm = centroid([0, 5, 9, 13, 17].map((i) => h.px[i]));
    const tips = centroid([4, 8, 12, 16, 20].map((i) => h.px[i]));
    loc = [(palm.x - face.cx) / face.w, (palm.y - face.cy) / face.w, (tips.x - face.cx) / face.w, (tips.y - face.cy) / face.w];
  }
  return { shape: handShape(h.world), orient: handOrient(h.world), loc, vel: [0, 0] };
}

/** Hands are ordered by image position, not by MediaPipe's handedness label, which is sometimes wrong. */
export function signFrame(t: number, hands: readonly HandFeatures[], face: FaceBox | null): SignFrame {
  const ordered = [...hands].sort((a, b) => a.palmCenter.x - b.palmCenter.x);
  return { t, hands: ordered.map((h) => signHand(h, face)) };
}

/** Velocity is measured over this interval, ms. */
export const VELOCITY_LAG_MS = 133;
/** Speed (face widths per second) that maps to 0.5: faster movements all look "fast". */
const VELOCITY_KNEE = 1.5;
/** A hand that moved further than this between two frames is a different hand. */
const MAX_JUMP = 1.2;

/** Fills in `vel` of each hand from the nearest hand in an earlier frame. */
export function setVelocity(frame: SignFrame, earlier: SignFrame | null): void {
  const dt = earlier ? (frame.t - earlier.t) / 1000 : 0;
  for (const h of frame.hands) {
    h.vel = [0, 0];
    if (!earlier || dt <= 0 || !h.loc) continue;
    let near: number[] | null = null;
    let nearDist = MAX_JUMP;
    for (const e of earlier.hands) {
      if (!e.loc) continue;
      const d = Math.hypot(e.loc[0] - h.loc[0], e.loc[1] - h.loc[1]);
      if (d < nearDist) {
        near = e.loc;
        nearDist = d;
      }
    }
    if (!near) continue;
    const vx = (h.loc[0] - near[0]) / dt;
    const vy = (h.loc[1] - near[1]) / dt;
    const k = 1 / (Math.hypot(vx, vy) + VELOCITY_KNEE);
    h.vel = [vx * k, vy * k];
  }
}

/** Velocities for a whole recording (frames in time order). */
export function setVelocities(frames: readonly SignFrame[]): void {
  let j = 0;
  for (const f of frames) {
    while (j < frames.length - 1 && frames[j + 1].t <= f.t - VELOCITY_LAG_MS) j++;
    setVelocity(f, frames[j] === f ? null : frames[j]);
  }
}

/**
 * The same hand seen in a mirror: a left-handed signer, or someone copying
 * the video like a mirror. The palm normal is a cross product, so mirroring
 * x flips its other two components.
 */
export function mirrorHand(h: SignHand): SignHand {
  const [nx, ny, nz, ux, uy, uz] = h.orient;
  return {
    shape: h.shape,
    orient: [nx, -ny, -nz, -ux, uy, uz],
    loc: h.loc && [-h.loc[0], h.loc[1], -h.loc[2], h.loc[3]],
    vel: [-h.vel[0], h.vel[1]],
  };
}

export function mirrorFrame(f: SignFrame): SignFrame {
  return { t: f.t, hands: f.hands.map(mirrorHand).reverse() };
}

function rms(a: readonly number[], b: readonly number[]): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += (a[i] - b[i]) ** 2;
  return Math.sqrt(s / a.length);
}

/** Relative weight of each part of the hand description. */
const WEIGHTS = { shape: 1, orient: 1, loc: 1, vel: 0.5 };
const WEIGHT_SUM = WEIGHTS.shape + WEIGHTS.orient + WEIGHTS.loc + WEIGHTS.vel;
/** Location difference assumed when the face is not visible. */
const NO_LOC = 0.5;
/** Cost of a frame where the camera sees no hands at all. */
const NO_HANDS = 1.5;
/** Extra cost when a two-handed sign is shown with one hand. */
const MISSING_HAND = 1;

export function handDistance(u: SignHand, t: SignHand): number {
  const loc = u.loc && t.loc ? rms(u.loc, t.loc) : NO_LOC;
  return (
    (WEIGHTS.shape * rms(u.shape, t.shape) +
      WEIGHTS.orient * rms(u.orient, t.orient) +
      WEIGHTS.loc * loc +
      WEIGHTS.vel * rms(u.vel, t.vel)) /
    WEIGHT_SUM
  );
}

/**
 * How different a camera frame is from a template frame (0 = identical).
 * For a one-handed sign either hand may be the signing one; for a
 * two-handed sign the hands are compared left with left, right with right.
 */
export function frameDistance(u: SignFrame, t: SignFrame): number {
  const U = u.hands;
  const T = t.hands;
  if (!U.length || !T.length) return NO_HANDS;
  if (T.length === 1) {
    let best = handDistance(U[0], T[0]);
    for (let i = 1; i < U.length; i++) best = Math.min(best, handDistance(U[i], T[0]));
    return best;
  }
  if (U.length === 1) return (Math.min(handDistance(U[0], T[0]), handDistance(U[0], T[1])) + MISSING_HAND) / 2;
  return (handDistance(U[0], T[0]) + handDistance(U[1], T[1])) / 2;
}

/** Compact storage of a hand: shape, orient, loc, vel in one array. */
export function packHand(h: SignHand, digits = 3): number[] {
  const k = 10 ** digits;
  return [...h.shape, ...h.orient, ...(h.loc ?? [0, 0, 0, 0]), ...h.vel].map((v) => Math.round(v * k) / k);
}

export function unpackHand(a: readonly number[]): SignHand {
  return {
    shape: a.slice(0, SHAPE_SIZE),
    orient: a.slice(SHAPE_SIZE, SHAPE_SIZE + 6),
    loc: a.slice(SHAPE_SIZE + 6, SHAPE_SIZE + 10),
    vel: a.slice(SHAPE_SIZE + 10, HAND_SIZE),
  };
}
