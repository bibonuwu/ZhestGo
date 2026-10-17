import { analyzeHand } from './hand';
import { keepLostHand, setVelocities, signFrame, smoothFrame, SMOOTH_MS, type SignFrame } from './signFeatures';
import type { FaceBox, HandFeatures, Point3, RawHand } from './types';

/** Landmarks of one sign video as written by scripts/extract-landmarks.ts (video/landmarks/<id>.json). */
export interface Recording {
  id: string;
  fps: number;
  width: number;
  height: number;
  frames: Array<{
    t: number;
    /** Centre x, centre y, width, height in pixels. */
    face: [number, number, number, number] | null;
    hands: Array<{ label: 'Left' | 'Right'; score: number; lm: number[]; world: number[] }>;
  }>;
}

export interface RecordedFrame {
  t: number;
  hands: HandFeatures[];
  face: FaceBox | null;
}

const points = (flat: readonly number[]): Point3[] =>
  Array.from({ length: flat.length / 3 }, (_, i) => ({ x: flat[i * 3], y: flat[i * 3 + 1], z: flat[i * 3 + 2] }));

/** The recording as the camera pipeline would see it, frame by frame. */
export function recordedFrames(rec: Recording): RecordedFrame[] {
  const size = { width: rec.width, height: rec.height };
  return rec.frames.map((f) => {
    const face = f.face ? { cx: f.face[0], cy: f.face[1], w: f.face[2], h: f.face[3] } : null;
    const hands = f.hands.map((h) => {
      const raw: RawHand = { label: h.label, score: h.score, landmarks: points(h.lm), world: points(h.world) };
      return analyzeHand(raw, size, face);
    });
    return { t: f.t, hands, face };
  });
}

/** Sign features of every frame, as the live matcher builds them (see SignSpotter.push). */
export function recordingFeatures(frames: readonly RecordedFrame[]): SignFrame[] {
  let pair: SignFrame | null = null;
  const raw = frames.map((f) => {
    const frame = signFrame(f.t, f.hands, f.face);
    if (frame.hands.length === 2) pair = frame;
    else keepLostHand(frame, pair);
    return frame;
  });
  let from = 0;
  const features = raw.map((frame, i) => {
    while (frame.t - raw[from].t >= SMOOTH_MS) from++;
    return smoothFrame(frame, raw.slice(from, i));
  });
  setVelocities(features);
  return features;
}
