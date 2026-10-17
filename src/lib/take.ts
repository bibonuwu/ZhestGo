import { DOMINANT, SECOND, drawHand, drawTrail, type TrailPoint } from '../gesture/draw';
import { recordingFeatures, type RecordedFrame } from '../gesture/recording';
import { buildTemplate, packFrames } from '../gesture/signTemplates';
import type { Point3 } from '../gesture/types';
import type { EngineFrame } from '../hooks/useGestureEngine';

/** Length of one take, ms. */
export const RECORD_MS = 2500;
/** Minimum gap between two frames kept as training samples, ms. */
const SAMPLE_EVERY_MS = 70;
/** The still frame is taken no later than this far into the take — the sign is usually formed by then. */
const STILL_BEFORE = 0.45;
const THUMB_WIDTH = 320;
/** A sign found in a take must last at least this many ticks (≈ 0.3 s). */
const MIN_SIGN_TICKS = 5;

/**
 * Collects one take: the feature vectors used for training, the hands of
 * every frame (the take becomes a personal template of the video-sign
 * matcher), plus what is needed to show the take back — the path of the
 * hand and one still frame.
 */
export class TakeCapture {
  readonly vectors: number[][] = [];
  readonly trail: TrailPoint[] = [];
  private readonly frames: RecordedFrame[] = [];
  private frameCount = 0;
  private handFrames = 0;
  private lastSampleAt = -Infinity;
  private still: HTMLCanvasElement | null = null;
  private stillHands: { px: Point3[]; dom: boolean }[] = [];
  private videoWidth = 0;

  constructor(readonly startedAt: number) {}

  /** Share of frames where the hand was visible, 0…1. */
  get coverage(): number {
    return this.frameCount ? this.handFrames / this.frameCount : 0;
  }

  /**
   * The sign in this take, cut and stored like a video lesson's template
   * (see signTemplates.ts); null when there is no clear sign in it.
   */
  sign(): number[][][] | null {
    if (this.handFrames < 2) return null;
    try {
      const { frames } = buildTemplate('take', recordingFeatures(this.frames));
      return frames.length >= MIN_SIGN_TICKS ? packFrames(frames) : null;
    } catch {
      return null;
    }
  }

  /** Adds one engine frame; returns true when it was kept as a training sample. */
  push(f: EngineFrame, video: HTMLVideoElement | null): boolean {
    this.frameCount++;
    this.frames.push({ t: f.t - this.startedAt, hands: f.hands, face: f.face });
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

const CLIP_TYPES = ['video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
/** Small clips: a take is 2.5 s, and up to 60 of them stay in the browser. */
const CLIP_BITS_PER_SECOND = 700_000;

/** Records the camera during a take, so the take can be watched and saved to the device. */
export class ClipRecorder {
  private readonly recorder: MediaRecorder;
  private readonly chunks: Blob[] = [];
  private readonly done: Promise<Blob | null>;

  private constructor(stream: MediaStream, mimeType: string) {
    this.recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: CLIP_BITS_PER_SECOND });
    this.recorder.ondataavailable = (e) => {
      if (e.data.size) this.chunks.push(e.data);
    };
    this.done = new Promise((resolve) => {
      this.recorder.onstop = () => resolve(this.chunks.length ? new Blob(this.chunks, { type: mimeType.split(';')[0] }) : null);
      this.recorder.onerror = () => resolve(null);
    });
    this.recorder.start();
  }

  /** Starts recording the video's camera stream; null where the browser cannot record. */
  static start(video: HTMLVideoElement | null): ClipRecorder | null {
    const stream = video?.srcObject;
    if (!(stream instanceof MediaStream) || typeof MediaRecorder === 'undefined') return null;
    const type = CLIP_TYPES.find((t) => MediaRecorder.isTypeSupported(t));
    if (!type) return null;
    try {
      return new ClipRecorder(stream, type);
    } catch (err) {
      console.warn('[qoldau] cannot record the take video', err);
      return null;
    }
  }

  /** Stops; resolves to the clip (null if nothing was recorded). */
  stop(): Promise<Blob | null> {
    if (this.recorder.state !== 'inactive') this.recorder.stop();
    return this.done;
  }
}
