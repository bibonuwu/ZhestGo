import { useEffect, useLayoutEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { VOCABULARY } from '../data/vocabulary';
import { drawOverlay } from '../gesture/draw';
import { analyzeHand } from '../gesture/hand';
import { KnnModel } from '../gesture/knn';
import { Recognizer, type RecognizerOutput } from '../gesture/recognizer';
import type { FaceBox, HandFeatures } from '../gesture/types';
import { VisionEngine } from '../gesture/vision';
import { useSettings } from '../store/settings';
import { useTraining } from '../store/training';

export interface EngineFrame extends RecognizerOutput {
  t: number;
  hands: HandFeatures[];
  face: FaceBox | null;
  fps: number;
}

export type EngineStatus = 'idle' | 'loading' | 'ready' | 'error';

/**
 * Detection runs on the main thread. On a slow phone one detection can take
 * longer than a video frame, and running it on every frame would freeze the
 * page; so it runs at most as often as keeps it under this share of the time.
 */
const MAX_BUSY = 0.6;
/** The first detections also compile the GPU programs: too slow to judge the device by. */
const WARMUP_FRAMES = 3;

interface Options {
  videoRef: RefObject<HTMLVideoElement | null>;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  running: boolean;
  onFrame?: (frame: EngineFrame) => void;
}

/** Runs detection → feature extraction → recognition → overlay on every new video frame. */
export function useGestureEngine({ videoRef, canvasRef, running, onFrame }: Options) {
  const [status, setStatus] = useState<EngineStatus>('idle');
  const [attempt, setAttempt] = useState(0);
  const engineRef = useRef<VisionEngine | null>(null);

  const holdMs = useSettings((s) => s.holdMs);
  const mode = useSettings((s) => s.mode);
  const dominant = useSettings((s) => s.dominant);
  const skeleton = useSettings((s) => s.showSkeleton);
  const debug = useSettings((s) => s.showDebug);
  const samples = useTraining((s) => s.samples);

  const recognizer = useMemo(() => new Recognizer(VOCABULARY, { holdMs: 550, mode: 'both', dominant: 'right' }), []);
  const knn = useMemo(() => (Object.keys(samples).length ? new KnnModel(samples) : null), [samples]);

  const onFrameRef = useRef(onFrame);
  const drawOpts = useRef({ skeleton, debug });
  useLayoutEffect(() => {
    onFrameRef.current = onFrame;
    drawOpts.current = { skeleton, debug };
  });
  useEffect(() => {
    recognizer.options = { holdMs, mode, dominant };
  }, [recognizer, holdMs, mode, dominant]);
  useEffect(() => {
    recognizer.knn = knn;
  }, [recognizer, knn]);

  useEffect(() => {
    if (!running) return;
    let cancelled = false;
    setStatus(engineRef.current ? 'ready' : 'loading');
    VisionEngine.load()
      .then((engine) => {
        if (cancelled) return;
        engineRef.current = engine;
        setStatus('ready');
      })
      .catch((err: unknown) => {
        console.error('[qoldau] could not load vision models', err);
        if (!cancelled) setStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, [running, attempt]);

  useEffect(() => {
    const engine = engineRef.current;
    if (!running || status !== 'ready' || !engine) return;

    let raf = 0;
    let lastVideoTime = -1;
    let lastT = performance.now();
    let fps = 0;
    let frames = 0;
    let cost = 0;
    let nextAt = 0;

    const tick = () => {
      raf = requestAnimationFrame(tick);
      const video = videoRef.current;
      if (!video || video.readyState < 2 || !video.videoWidth || video.currentTime === lastVideoTime) return;
      const t = performance.now();
      if (t < nextAt) return;
      lastVideoTime = video.currentTime;

      fps = fps ? fps * 0.9 + (1000 / Math.max(1, t - lastT)) * 0.1 : 30;
      lastT = t;

      let frame;
      try {
        frame = engine.detect(video, t);
      } catch (err) {
        console.error('[qoldau] detection failed', err);
        return;
      }
      const size = { width: frame.width, height: frame.height };
      const hands = frame.hands.map((h) => analyzeHand(h, size, frame.face));
      const out = recognizer.process({ t, hands, face: frame.face });

      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (canvas && ctx) {
        if (canvas.width !== size.width || canvas.height !== size.height) {
          canvas.width = size.width;
          canvas.height = size.height;
        }
        drawOverlay(ctx, size, hands, out.dom, frame.face, drawOpts.current);
      }

      onFrameRef.current?.({ ...out, t, hands, face: frame.face, fps });

      const spent = Math.min(250, performance.now() - t);
      if (++frames > WARMUP_FRAMES) cost = cost ? cost * 0.8 + spent * 0.2 : spent;
      nextAt = t + cost / MAX_BUSY;
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      recognizer.reset();
      const canvas = canvasRef.current;
      canvas?.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
    };
  }, [running, status, recognizer, videoRef, canvasRef]);

  return { status, retry: () => setAttempt((n) => n + 1) };
}
