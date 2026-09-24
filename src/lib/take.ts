import { DOMINANT, SECOND, drawHand, drawTrail, type TrailPoint } from '../gesture/draw';
import type { Point3 } from '../gesture/types';
import type { EngineFrame } from '../hooks/useGestureEngine';

/** Length of one take, ms. */
export const RECORD_MS = 2500;
/** Minimum gap between two frames kept as training samples, ms. */
const SAMPLE_EVERY_MS = 70;
/** The still frame is taken no later than this far into the take — the sign is usually formed by then. */
const STILL_BEFORE = 0.45;
const THUMB_WIDTH = 320;

/**
 * Collects one take: the feature vectors used for training, plus what is
 * needed to show the take back — the path of the hand and one still frame.
 */
export class TakeCapture {
  readonly vectors: number[][] = [];
  readonly trail: TrailPoint[] = [];
  private frames = 0;
  private handFrames = 0;
  private lastSampleAt = -Infinity;
  private still: HTMLCanvasElement | null = null;
  private stillHands: { px: Point3[]; dom: boolean }[] = [];
  private videoWidth = 0;

  constructor(readonly startedAt: number) {}

  /** Share of frames where the hand was visible, 0…1. */
  get coverage(): number {
    return this.frames ? this.handFrames / this.frames : 0;
  }

  /** Adds one engine frame; returns true when it was kept as a training sample. */
  push(f: EngineFrame, video: HTMLVideoElement | null): boolean {
    this.frames++;
    if (!f.dom) return false;
    this.handFrames++;

    let sampled = false;
    if (f.features && f.t - this.lastSampleAt >= SAMPLE_EVERY_MS) {
      this.lastSampleAt = f.t;
      this.vectors.push(f.features);
      sampled = true;
    }
    this.trail.push({ x: f.dom.tip.x, y: f.dom.tip.y, sampled });

    if (video && (!this.still || f.t - this.startedAt < RECORD_MS * STILL_BEFORE)) this.snap(video, f);
    return sampled;
  }

  /** The still frame with the hands and their path drawn on it, as the user saw it. */
  thumbnail(mirror: boolean): string | null {
    const still = this.still;
    const ctx = still && document.createElement('canvas').getContext('2d');
    if (!still || !ctx) return null;
    const out = ctx.canvas;
    out.width = still.width;
    out.height = still.height;
    if (mirror) {
      ctx.translate(out.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(still, 0, 0);
    const scale = out.width / this.videoWidth;
    ctx.scale(scale, scale);
    for (const hand of this.stillHands) drawHand(ctx, hand.px, hand.dom ? DOMINANT : SECOND, 1.6 / scale);
    drawTrail(ctx, this.trail, 3.2 / scale, 5);
    try {
      return out.toDataURL('image/jpeg', 0.82);
    } catch {
      return null;
    }
  }

  private snap(video: HTMLVideoElement, f: EngineFrame): void {
    const { videoWidth, videoHeight } = video;
    if (!videoWidth || !videoHeight) return;
    const canvas = (this.still ??= document.createElement('canvas'));
    const height = Math.round((THUMB_WIDTH * videoHeight) / videoWidth);
    if (canvas.width !== THUMB_WIDTH || canvas.height !== height) {
      canvas.width = THUMB_WIDTH;
      canvas.height = height;
    }
    canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height);
    this.videoWidth = videoWidth;
    this.stillHands = f.hands.map((h) => ({ px: h.px, dom: h === f.dom || h.side === f.dom?.side }));
  }
}
