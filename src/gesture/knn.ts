import { dist } from './geometry';
import { LM } from './landmarks';
import type { MotionSummary } from './motion';
import type { FaceBox, HandFeatures, Point3 } from './types';

/**
 * Feature vector for user-trained gestures:
 *   [dominant hand shape 60] [second hand shape 60] [second hand present 1]
 *   [location 2] [second hand offset 2] [motion 5]
 * Blocks are pre-weighted so plain Euclidean distance balances them.
 */
export const FEATURE_LENGTH = 60 + 60 + 1 + 2 + 2 + 5;

const WEIGHTS = { shape: 1, second: 0.6, presence: 1.5, location: 1.2, motion: 1 };

function shapeBlock(world: readonly Point3[], weight: number): number[] {
  const wrist = world[LM.WRIST];
  const palm = dist(wrist, world[LM.MIDDLE_MCP]) || 1e-6;
  const out: number[] = [];
  for (let i = 1; i < 21; i++) {
    const p = world[i];
    out.push(((p.x - wrist.x) / palm) * weight, ((p.y - wrist.y) / palm) * weight, ((p.z - wrist.z) / palm) * weight);
  }
  return out;
}

export function buildFeatureVector(
  dom: HandFeatures,
  nonDom: HandFeatures | null,
  motion: MotionSummary,
  face: FaceBox | null,
): number[] {
  const unitX = face?.w ?? dom.scale * 1.6;
  const unitY = face?.h ?? dom.scale * 1.6;
  const originX = face?.cx ?? dom.anchor.x;
  const originY = face?.cy ?? dom.anchor.y;

  const loc = [((dom.anchor.x - originX) / unitX) * WEIGHTS.location, ((dom.anchor.y - originY) / unitY) * WEIGHTS.location];
  const offset = nonDom
    ? [
        ((nonDom.palmCenter.x - dom.palmCenter.x) / unitX) * WEIGHTS.location,
        ((nonDom.palmCenter.y - dom.palmCenter.y) / unitY) * WEIGHTS.location,
      ]
    : [0, 0];
  const w = WEIGHTS.motion;
  const motionBlock = [
    Math.min(motion.rangeX, 2) * w,
    Math.min(motion.rangeY, 2) * w,
    (Math.min(motion.swingsX, 4) / 4) * w,
    (Math.min(motion.swingsY, 4) / 4) * w,
    (Math.min(Math.abs(motion.turn), 4 * Math.PI) / (2 * Math.PI)) * w,
  ];

  return [
    ...shapeBlock(dom.world, WEIGHTS.shape),
    ...(nonDom ? shapeBlock(nonDom.world, WEIGHTS.second) : new Array<number>(60).fill(0)),
    nonDom ? WEIGHTS.presence : 0,
    ...loc,
    ...offset,
    ...motionBlock,
  ];
}

function euclidean(a: readonly number[], b: readonly number[]): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i];
    s += d * d;
  }
  return Math.sqrt(s);
}

export interface KnnResult {
  label: string;
  confidence: number;
  distance: number;
}

export type SampleSet = Record<string, number[][]>;

/**
 * k-nearest-neighbours over recorded frames. Each label gets its own
 * acceptance radius from the spread of its samples, so a gesture far from
 * everything the user recorded is rejected instead of forced into a class.
 */
export class KnnModel {
  private readonly points: { label: string; v: number[] }[] = [];
  private readonly radius = new Map<string, number>();

  constructor(
    samples: SampleSet,
    private readonly k = 5,
  ) {
    for (const [label, vectors] of Object.entries(samples)) {
      for (const v of vectors) if (v.length === FEATURE_LENGTH) this.points.push({ label, v });
    }
    this.calibrate();
  }

  get size(): number {
    return this.points.length;
  }

  private calibrate(): void {
    const byLabel = new Map<string, number[][]>();
    for (const p of this.points) {
      const list = byLabel.get(p.label) ?? [];
      list.push(p.v);
      byLabel.set(p.label, list);
    }
    for (const [label, vectors] of byLabel) {
      if (vectors.length < 2) {
        this.radius.set(label, 1.2);
        continue;
      }
      const nn = vectors.map((v, i) => {
        let best = Infinity;
        vectors.forEach((u, j) => {
          if (i !== j) best = Math.min(best, euclidean(v, u));
        });
        return best;
      });
      nn.sort((a, b) => a - b);
      const median = nn[Math.floor(nn.length / 2)];
      this.radius.set(label, 2.5 * median + 0.35);
    }
  }

  classify(v: readonly number[]): KnnResult | null {
    if (this.points.length === 0 || v.length !== FEATURE_LENGTH) return null;
    const nearest = this.points
      .map((p) => ({ label: p.label, d: euclidean(v, p.v) }))
      .sort((a, b) => a.d - b.d)
      .slice(0, this.k);

    const votes = new Map<string, number>();
    let total = 0;
    for (const n of nearest) {
      const w = 1 / (n.d + 1e-3);
      votes.set(n.label, (votes.get(n.label) ?? 0) + w);
      total += w;
    }
    let label = nearest[0].label;
    let bestVote = 0;
    for (const [l, w] of votes) {
      if (w > bestVote) {
        label = l;
        bestVote = w;
      }
    }
    const confidence = bestVote / total;
    const distance = nearest.find((n) => n.label === label)!.d;
    if (confidence < 0.6 || distance > (this.radius.get(label) ?? 1.2)) return null;
    return { label, confidence, distance };
  }
}
