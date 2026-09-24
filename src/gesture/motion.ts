import { mode } from './geometry';
import type { Direction, HandShape, Location, MotionState } from './types';

/**
 * Thresholds in "units" — one unit is the signer's face width (≈ 14 cm),
 * or 1.6 × hand size when no face has been seen.
 */
export const MOTION_THRESHOLDS = {
  windowMs: 1300,
  /** Max drift from the mean position that still counts as holding still. */
  stillTolerance: 0.15,
  waveSwing: 0.15,
  waveRange: 0.3,
  nodSwing: 0.1,
  nodRange: 0.2,
  circleTurn: 1.5 * Math.PI,
  circleRange: 0.2,
  /** Minimum travel before a new direction sample is taken for circle detection. */
  circleStep: 0.03,
  /** Share of frames that must agree on the hand shape. */
  stillShapeShare: 0.7,
  motionShapeShare: 0.6,
};

const M = MOTION_THRESHOLDS;

export interface MotionSample {
  t: number;
  /** Position in units (see MOTION_THRESHOLDS). */
  x: number;
  y: number;
  shape: HandShape | null;
  dir: Direction;
  location: Location;
}

export interface MotionSummary {
  motion: MotionState;
  /** Shape/direction/location agreed over the frames that define `motion`. */
  shape: HandShape | null;
  dir: Direction;
  location: Location;
  /** How long the hand has been continuously still, in ms. */
  stillFor: number;
  rangeX: number;
  rangeY: number;
  swingsX: number;
  swingsY: number;
  /** Accumulated turning angle of the path in radians (signed). */
  turn: number;
}

/** Counts direction reversals whose amplitude is at least `minAmp`. */
export function countSwings(values: readonly number[], minAmp: number): number {
  if (values.length < 2) return 0;
  let direction = 0;
  let lo = values[0];
  let hi = values[0];
  let extreme = values[0];
  let swings = 0;
  for (const v of values) {
    if (direction === 0) {
      lo = Math.min(lo, v);
      hi = Math.max(hi, v);
      if (v - lo >= minAmp) {
        direction = 1;
        extreme = v;
      } else if (hi - v >= minAmp) {
        direction = -1;
        extreme = v;
      }
    } else if (direction === 1) {
      if (v > extreme) extreme = v;
      else if (extreme - v >= minAmp) {
        swings++;
        direction = -1;
        extreme = v;
      }
    } else if (v < extreme) extreme = v;
    else if (v - extreme >= minAmp) {
      swings++;
      direction = 1;
      extreme = v;
    }
  }
  return swings;
}

/**
 * Sum of gentle heading changes along the path. Sharp reversals (as in a
 * wave) are ignored, so only genuinely curved paths accumulate a large turn.
 */
export function totalTurn(points: readonly { x: number; y: number }[], minStep: number): number {
  if (points.length < 3) return 0;
  let anchor = points[0];
  let lastHeading: number | null = null;
  let total = 0;
  for (const p of points) {
    const dx = p.x - anchor.x;
    const dy = p.y - anchor.y;
    if (Math.hypot(dx, dy) < minStep) continue;
    const heading = Math.atan2(dy, dx);
    if (lastHeading !== null) {
      let d = heading - lastHeading;
      while (d > Math.PI) d -= 2 * Math.PI;
      while (d < -Math.PI) d += 2 * Math.PI;
      if (Math.abs(d) < Math.PI * 0.6) total += d;
    }
    lastHeading = heading;
    anchor = p;
  }
  return total;
}

function range(values: readonly number[]): number {
  let lo = Infinity;
  let hi = -Infinity;
  for (const v of values) {
    lo = Math.min(lo, v);
    hi = Math.max(hi, v);
  }
  return values.length ? hi - lo : 0;
}

/** Keeps a short trajectory of one hand and classifies its movement. */
export class MotionTracker {
  private samples: MotionSample[] = [];

  push(sample: MotionSample): void {
    this.samples.push(sample);
    const cutoff = sample.t - M.windowMs;
    while (this.samples.length && this.samples[0].t < cutoff) this.samples.shift();
  }

  reset(): void {
    this.samples = [];
  }

  get size(): number {
    return this.samples.length;
  }

  /** Duration of the latest continuous stretch where the hand stayed in place. */
  private stillDuration(): number {
    const s = this.samples;
    if (s.length === 0) return 0;
    const last = s[s.length - 1];
    let cx = 0;
    let cy = 0;
    let n = 0;
    let startT = last.t;
    for (let i = s.length - 1; i >= 0; i--) {
      const p = s[i];
      const nx = (cx * n + p.x) / (n + 1);
      const ny = (cy * n + p.y) / (n + 1);
      // Stop once the new point, or the updated centre, drifts too far.
      if (Math.hypot(p.x - nx, p.y - ny) > M.stillTolerance || Math.hypot(last.x - nx, last.y - ny) > M.stillTolerance) {
        break;
      }
      cx = nx;
      cy = ny;
      n++;
      startT = p.t;
    }
    return last.t - startT;
  }

  summarize(holdMs: number): MotionSummary {
    const s = this.samples;
    const last = s[s.length - 1];
    const empty: MotionSummary = {
      motion: 'moving',
      shape: last?.shape ?? null,
      dir: last?.dir ?? 'up',
      location: last?.location ?? 'low',
      stillFor: 0,
      rangeX: 0,
      rangeY: 0,
      swingsX: 0,
      swingsY: 0,
      turn: 0,
    };
    if (s.length < 3) return empty;

    const xs = s.map((p) => p.x);
    const ys = s.map((p) => p.y);
    const rangeX = range(xs);
    const rangeY = range(ys);
    const swingsX = countSwings(xs, M.waveSwing);
    const swingsY = countSwings(ys, M.nodSwing);
    const turn = totalTurn(s, M.circleStep);
    const stillFor = this.stillDuration();

    let motion: MotionState = 'moving';
    if (
      Math.abs(turn) >= M.circleTurn &&
      rangeX >= M.circleRange &&
      rangeY >= M.circleRange &&
      Math.max(rangeX, rangeY) < 3 * Math.min(rangeX, rangeY)
    ) {
      motion = 'circle';
    } else if (swingsX >= 2 && rangeX >= M.waveRange && rangeX > rangeY * 1.3) {
      motion = 'wave';
    } else if (swingsY >= 2 && rangeY >= M.nodRange && rangeY > rangeX * 1.3) {
      motion = 'nod';
    } else if (stillFor >= holdMs) {
      motion = 'still';
    }

    // Aggregate shape/dir/location over the frames that define the motion.
    const frames = motion === 'still' ? s.filter((p) => p.t >= last.t - holdMs) : s;
    const needShare = motion === 'still' ? M.stillShapeShare : M.motionShapeShare;
    const shapeMode = mode(frames.map((p) => p.shape));
    const shape = shapeMode && shapeMode.share >= needShare ? shapeMode.value : null;

    return {
      motion,
      shape,
      dir: mode(frames.map((p) => p.dir))?.value ?? last.dir,
      location: mode(frames.map((p) => p.location))?.value ?? last.location,
      stillFor,
      rangeX,
      rangeY,
      swingsX,
      swingsY,
      turn,
    };
  }
}
