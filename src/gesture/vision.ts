import { FaceDetector, FilesetResolver, HandLandmarker, type Detection } from '@mediapipe/tasks-vision';
import type { FaceBox, RawHand } from './types';

const BASE = import.meta.env.BASE_URL;
const WASM_LOCAL = `${BASE}mediapipe/wasm`;
const WASM_CDN = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${__MEDIAPIPE_VERSION__}/wasm`;

const HAND_MODEL = {
  local: `${BASE}models/hand_landmarker.task`,
  remote: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
};
const FACE_MODEL = {
  local: `${BASE}models/blaze_face_short_range.tflite`,
  remote:
    'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite',
};

/** A face hidden behind a hand is remembered for this long. */
const FACE_TTL_MS = 4000;

export interface VisionFrame {
  hands: RawHand[];
  face: FaceBox | null;
  width: number;
  height: number;
}

async function withDelegateFallback<T>(create: (delegate: 'GPU' | 'CPU') => Promise<T>): Promise<T> {
  try {
    return await create('GPU');
  } catch (err) {
    console.warn('[qoldau] GPU delegate unavailable, falling back to CPU', err);
    return create('CPU');
  }
}

function largestFace(detections: readonly Detection[]): FaceBox | null {
  let best: FaceBox | null = null;
  for (const d of detections) {
    const b = d.boundingBox;
    if (!b) continue;
    if (!best || b.width * b.height > best.w * best.h) {
      best = { cx: b.originX + b.width / 2, cy: b.originY + b.height / 2, w: b.width, h: b.height };
    }
  }
  return best;
}

let loading: Promise<VisionEngine> | null = null;

/** MediaPipe hand landmarker + face detector, shared by every page. */
export class VisionEngine {
  private face: FaceBox | null = null;
  private faceAt = -Infinity;
  private frameNo = 0;
  private lastT = 0;

  private constructor(
    private readonly hands: HandLandmarker,
    private readonly faces: FaceDetector,
  ) {}

  private static async create(source: 'local' | 'remote'): Promise<VisionEngine> {
    const fileset = await FilesetResolver.forVisionTasks(source === 'local' ? WASM_LOCAL : WASM_CDN);
    const hands = await withDelegateFallback((delegate) =>
      HandLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: HAND_MODEL[source], delegate },
        runningMode: 'VIDEO',
        numHands: 2,
        minHandDetectionConfidence: 0.6,
        minHandPresenceConfidence: 0.6,
        minTrackingConfidence: 0.5,
      }),
    );
    const faces = await withDelegateFallback((delegate) =>
      FaceDetector.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: FACE_MODEL[source], delegate },
        runningMode: 'VIDEO',
        minDetectionConfidence: 0.5,
      }),
    );
    return new VisionEngine(hands, faces);
  }

  static load(): Promise<VisionEngine> {
    if (!loading) {
      // Self-hosted files (cached by the service worker, so they work offline);
      // Google's CDN only if the build was made without them.
      loading = __LOCAL_VISION_ASSETS__
        ? VisionEngine.create('local').catch((err: unknown) => {
            console.warn('[qoldau] local vision models failed, trying the CDN', err);
            return VisionEngine.create('remote');
          })
        : VisionEngine.create('remote');
      // Let a later call retry after a failed load (e.g. offline on first visit).
      loading.catch(() => {
        loading = null;
      });
    }
    return loading;
  }

  detect(video: HTMLVideoElement, now: number): VisionFrame {
    // MediaPipe requires strictly increasing timestamps.
    const t = Math.max(now, this.lastT + 1);
    this.lastT = t;

    const result = this.hands.detectForVideo(video, t);
    const hands: RawHand[] = result.landmarks.map((landmarks, i) => {
      const category = result.handedness[i]?.[0];
      return {
        landmarks,
        world: result.worldLandmarks[i] ?? [],
        label: category?.categoryName === 'Right' ? 'Right' : 'Left',
        score: category?.score ?? 0,
      };
    });

    // The face moves slowly; every other frame is plenty.
    if (this.frameNo++ % 2 === 0) {
      const face = largestFace(this.faces.detectForVideo(video, t).detections);
      if (face) {
        this.face = face;
        this.faceAt = t;
      }
    }

    return {
      hands,
      face: t - this.faceAt < FACE_TTL_MS ? this.face : null,
      width: video.videoWidth,
      height: video.videoHeight,
    };
  }
}
