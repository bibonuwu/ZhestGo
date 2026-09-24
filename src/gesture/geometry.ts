import type { Point2, Point3 } from './types';

export const sub = (a: Point3, b: Point3): Point3 => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });

export const len = (v: Point3): number => Math.hypot(v.x, v.y, v.z);

export const dist = (a: Point3, b: Point3): number => len(sub(a, b));

export const dist2 = (a: Point2, b: Point2): number => Math.hypot(a.x - b.x, a.y - b.y);

export const dot = (a: Point3, b: Point3): number => a.x * b.x + a.y * b.y + a.z * b.z;

/** Angle between two vectors in degrees (0 when parallel). */
export function angleBetween(a: Point3, b: Point3): number {
  const la = len(a);
  const lb = len(b);
  if (la === 0 || lb === 0) return 0;
  const cos = Math.min(1, Math.max(-1, dot(a, b) / (la * lb)));
  return (Math.acos(cos) * 180) / Math.PI;
}

export function centroid<T extends Point2>(points: readonly T[]): Point2 {
  let x = 0;
  let y = 0;
  for (const p of points) {
    x += p.x;
    y += p.y;
  }
  const n = points.length || 1;
  return { x: x / n, y: y / n };
}

export function centroid3(points: readonly Point3[]): Point3 {
  let x = 0;
  let y = 0;
  let z = 0;
  for (const p of points) {
    x += p.x;
    y += p.y;
    z += p.z;
  }
  const n = points.length || 1;
  return { x: x / n, y: y / n, z: z / n };
}

/** Most frequent value and its share of the list. */
export function mode<T>(values: readonly T[]): { value: T; share: number } | null {
  if (values.length === 0) return null;
  const counts = new Map<T, number>();
  let best = values[0];
  let bestCount = 0;
  for (const v of values) {
    const c = (counts.get(v) ?? 0) + 1;
    counts.set(v, c);
    if (c > bestCount) {
      best = v;
      bestCount = c;
    }
  }
  return { value: best, share: bestCount / values.length };
}

export const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));
