import type { WorkerRequest, WorkerResponse } from './piper.worker';
import { assetUrls, type VoiceId } from './voices';

type Pending = { resolve: (r: Extract<WorkerResponse, { ok: true }>) => void; reject: (e: Error) => void };
/** Omit that keeps each member of a union. */
type WithoutId<T> = T extends unknown ? Omit<T, 'id'> : never;

let worker: Worker | null = null;
let nextId = 1;
const pending = new Map<number, Pending>();
/** The voice loaded (or loading) in the worker. */
let loaded: { voice: VoiceId; ready: Promise<void> } | null = null;

function getWorker(): Worker {
  if (worker) return worker;
  worker = new Worker(new URL('./piper.worker.ts', import.meta.url), { type: 'module' });
  worker.onmessage = ({ data }: MessageEvent<WorkerResponse>) => {
    const p = pending.get(data.id);
    if (!p) return;
    pending.delete(data.id);
    if (data.ok) p.resolve(data);
    else p.reject(new Error(data.error));
  };
  worker.onerror = (e) => {
    for (const p of pending.values()) p.reject(new Error(e.message || 'Speech worker failed'));
    pending.clear();
    worker?.terminate();
    worker = null;
    loaded = null;
  };
  return worker;
}

function call(message: WithoutId<WorkerRequest>): Promise<Extract<WorkerResponse, { ok: true }>> {
  const id = nextId++;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    getWorker().postMessage({ ...message, id } as WorkerRequest);
  });
}

function ensureVoice(voice: VoiceId): Promise<void> {
  if (!loaded || loaded.voice !== voice) {
    const ready = call({ type: 'load', assets: assetUrls(voice) }).then(() => undefined);
    const entry = { voice, ready };
    loaded = entry;
    ready.catch(() => {
      if (loaded === entry) loaded = null;
    });
  }
  return loaded.ready;
}

/** 16-bit PCM WAV from float samples. */
export function pcmToWav(pcm: Float32Array, sampleRate: number): ArrayBuffer {
  const view = new DataView(new ArrayBuffer(44 + pcm.length * 2));
  const text = (offset: number, s: string) => [...s].forEach((c, i) => view.setUint8(offset + i, c.charCodeAt(0)));
  text(0, 'RIFF');
  view.setUint32(4, 36 + pcm.length * 2, true);
  text(8, 'WAVE');
  text(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  text(36, 'data');
  view.setUint32(40, pcm.length * 2, true);
  for (let i = 0; i < pcm.length; i++) {
    const v = Math.max(-1, Math.min(1, pcm[i]));
    view.setInt16(44 + i * 2, v < 0 ? v * 0x8000 : v * 0x7fff, true);
  }
  return view.buffer;
}

/** Synthesises Kazakh speech offline. `rate` > 1 speaks faster. */
export async function synthesizeOffline(text: string, voice: VoiceId, rate: number): Promise<Blob> {
  await ensureVoice(voice);
  const { pcm, sampleRate } = await call({ type: 'synth', text, lengthScale: 1 / rate });
  return new Blob([pcmToWav(pcm!, sampleRate!)], { type: 'audio/wav' });
}

/** Loads the voice model ahead of time so the first sentence is not delayed. */
export function warmUpOfflineVoice(voice: VoiceId): void {
  ensureVoice(voice).catch(() => undefined);
}
