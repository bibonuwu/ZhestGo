import { LOCATION_ZONES } from './hand';
import { HAND_CONNECTIONS } from './landmarks';
import type { FaceBox, HandFeatures, Point2, Point3 } from './types';

export const DOMINANT = '#2dd4bf';
export const SECOND = '#fbbf24';

/** Hand skeleton: bones in `color`, joints as white dots. */
export function drawHand(ctx: CanvasRenderingContext2D, px: readonly Point3[], color: string, width: number): void {
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = color;
  ctx.globalAlpha = 0.9;
  ctx.lineWidth = width;
  ctx.beginPath();
  for (const [a, b] of HAND_CONNECTIONS) {
    ctx.moveTo(px[a].x, px[a].y);
    ctx.lineTo(px[b].x, px[b].y);
  }
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  for (const p of px) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, width * 0.9, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

export interface TrailPoint extends Point2 {
  /** This frame was kept as a training sample. */
  sampled: boolean;
}

/**
 * The path the hand took during a take, fading like a comet tail towards its
 * start; frames kept for training are marked with dots.
 * `width` is in canvas units, `glow` in bitmap pixels (shadows ignore transforms).
 */
export function drawTrail(ctx: CanvasRenderingContext2D, points: readonly TrailPoint[], width: number, glow: number): void {
  const n = points.length;
  if (n === 0) return;
  const mid = (a: Point2, b: Point2): Point2 => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = DOMINANT;
  ctx.shadowColor = DOMINANT;
  ctx.shadowBlur = glow;
  for (let i = 1; i < n; i++) {
    const k = i / (n - 1);
    const from = i === 1 ? points[0] : mid(points[i - 2], points[i - 1]);
    const to = i === n - 1 ? points[i] : mid(points[i - 1], points[i]);
    ctx.globalAlpha = 0.2 + 0.8 * k;
    ctx.lineWidth = width * (0.45 + 0.55 * k);
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.quadraticCurveTo(points[i - 1].x, points[i - 1].y, to.x, to.y);
    ctx.stroke();
  }

  ctx.shadowBlur = 0;
  ctx.fillStyle = '#ffffff';
  points.forEach((p, i) => {
    if (!p.sampled) return;
    ctx.globalAlpha = 0.35 + 0.65 * (i / Math.max(1, n - 1));
    ctx.beginPath();
    ctx.arc(p.x, p.y, width * 0.36, 0, Math.PI * 2);
    ctx.fill();
  });

  const head = points[n - 1];
  ctx.globalAlpha = 1;
  ctx.shadowColor = DOMINANT;
  ctx.shadowBlur = glow * 1.5;
  ctx.beginPath();
  ctx.arc(head.x, head.y, width * 0.95, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Draws hand skeletons (and, in debug mode, the face box and location zones). */
export function drawOverlay(
  ctx: CanvasRenderingContext2D,
  size: { width: number; height: number },
  hands: readonly HandFeatures[],
  dom: HandFeatures | null,
  face: FaceBox | null,
  opts: { skeleton: boolean; debug: boolean },
): void {
  ctx.clearRect(0, 0, size.width, size.height);

  if (opts.debug && face) {
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.setLineDash([6, 6]);
    ctx.lineWidth = 2;
    ctx.strokeRect(face.cx - face.w / 2, face.cy - face.h / 2, face.w, face.h);
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    const z = LOCATION_ZONES;
    for (const v of [z.headAbove, z.faceAbove, z.chestAbove]) {
      const y = face.cy + v * face.h;
      ctx.beginPath();
      ctx.moveTo(face.cx - face.w * z.maxSide, y);
      ctx.lineTo(face.cx + face.w * z.maxSide, y);
      ctx.stroke();
    }
    ctx.restore();
  }

  if (!opts.skeleton) return;

  for (const hand of hands) {
    const color = hand === dom || (dom && hand.side === dom.side) ? DOMINANT : SECOND;
    const width = Math.max(2, hand.scale / 28);
    drawHand(ctx, hand.px, color, width);
    ctx.save();
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(hand.anchor.x, hand.anchor.y, width * 2.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}
