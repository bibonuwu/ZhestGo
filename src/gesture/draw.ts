import { LOCATION_ZONES } from './hand';
import { HAND_CONNECTIONS } from './landmarks';
import type { FaceBox, HandFeatures } from './types';

const DOMINANT = '#2dd4bf';
const SECOND = '#fbbf24';

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
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = color;
    ctx.globalAlpha = 0.9;
    ctx.lineWidth = width;
    ctx.beginPath();
    for (const [a, b] of HAND_CONNECTIONS) {
      ctx.moveTo(hand.px[a].x, hand.px[a].y);
      ctx.lineTo(hand.px[b].x, hand.px[b].y);
    }
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    for (const p of hand.px) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, width * 0.9, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(hand.anchor.x, hand.anchor.y, width * 2.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}
