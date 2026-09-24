/**
 * Offline Kazakh voices (Piper, trained on ISSAI KazakhTTS). Everything the
 * voice needs is stored in the browser's Cache Storage, so after one download
 * it speaks without any network — and without any paid service.
 */
import ortWasmUrl from 'onnxruntime-web/ort-wasm-simd-threaded.wasm?url';
import phonemizerDataUrl from '@diffusionstudio/piper-wasm/build/piper_phonemize.data?url';
import phonemizerWasmUrl from '@diffusionstudio/piper-wasm/build/piper_phonemize.wasm?url';
import { VOICE_CACHE } from './voiceCache';

export { VOICE_CACHE };
const HF = 'https://huggingface.co/rhasspy/piper-voices/resolve/main';

export type VoiceId = 'kk_KZ-raya-x_low' | 'kk_KZ-iseke-x_low';

export const VOICES: Record<VoiceId, { label: { kk: string; ru: string }; path: string }> = {
  'kk_KZ-raya-x_low': { label: { kk: 'Рая — әйел дауысы', ru: 'Рая — женский голос' }, path: 'kk/kk_KZ/raya/x_low' },
  'kk_KZ-iseke-x_low': { label: { kk: 'Исеке — ер дауысы', ru: 'Исеке — мужской голос' }, path: 'kk/kk_KZ/iseke/x_low' },
};

export interface VoiceAsset {
  key: 'ortWasm' | 'phonemizerWasm' | 'phonemizerData' | 'model' | 'config';
  /** Absolute URL; also the Cache Storage key. */
  url: string;
  /** Used when the file is not hosted next to the app. */
  fallback?: string;
  /** Approximate size for progress bars before the server reports it. */
  size: number;
  shared: boolean;
}

const abs = (url: string) => new URL(url, window.location.href).href;

export function voiceAssets(id: VoiceId): VoiceAsset[] {
  const base = `${import.meta.env.BASE_URL}voices/${id}`;
  const remote = `${HF}/${VOICES[id].path}/${id}`;
  return [
    { key: 'ortWasm', url: abs(ortWasmUrl), size: 14_240_000, shared: true },
    { key: 'phonemizerWasm', url: abs(phonemizerWasmUrl), size: 635_000, shared: true },
    { key: 'phonemizerData', url: abs(phonemizerDataUrl), size: 18_077_000, shared: true },
    { key: 'model', url: abs(`${base}.onnx`), fallback: `${remote}.onnx`, size: 28_131_000, shared: false },
    { key: 'config', url: abs(`${base}.onnx.json`), fallback: `${remote}.onnx.json`, size: 4_200, shared: false },
  ];
}

export const cacheSupported = (): boolean => typeof caches !== 'undefined';

export async function isVoiceReady(id: VoiceId): Promise<boolean> {
  if (!cacheSupported()) return false;
  const cache = await caches.open(VOICE_CACHE);
  const hits = await Promise.all(voiceAssets(id).map((a) => cache.match(a.url)));
  return hits.every(Boolean);
}

async function fetchWithProgress(url: string, onBytes: (n: number) => void): Promise<Blob> {
  const res = await fetch(url);
  // The dev server answers unknown paths with index.html.
  if (!res.ok || (res.headers.get('content-type') ?? '').includes('text/html')) {
    throw new Error(`${url}: HTTP ${res.status}`);
  }
  if (!res.body) {
    const blob = await res.blob();
    onBytes(blob.size);
    return blob;
  }
  const reader = res.body.getReader();
  const chunks: BlobPart[] = [];
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    onBytes(value.length);
  }
  return new Blob(chunks, { type: res.headers.get('content-type') ?? 'application/octet-stream' });
}

/** Downloads the voice into Cache Storage. `onProgress` receives 0…1. */
export async function downloadVoice(id: VoiceId, onProgress: (fraction: number) => void): Promise<void> {
  const cache = await caches.open(VOICE_CACHE);
  const assets = voiceAssets(id);
  const total = assets.reduce((n, a) => n + a.size, 0);
  let done = 0;
  const report = () => onProgress(Math.min(1, done / total));

  for (const asset of assets) {
    if (await cache.match(asset.url)) {
      done += asset.size;
      report();
      continue;
    }
    const start = done;
    const onBytes = (n: number) => {
      done += n;
      report();
    };
    let blob: Blob;
    try {
      blob = await fetchWithProgress(asset.url, onBytes);
    } catch (err) {
      if (!asset.fallback) throw err;
      done = start;
      blob = await fetchWithProgress(asset.fallback, onBytes);
    }
    done = start + asset.size;
    report();
    await cache.put(asset.url, new Response(blob, { headers: { 'Content-Type': blob.type, 'Content-Length': String(blob.size) } }));
  }
  // Ask the browser not to evict the voice when storage runs low.
  await navigator.storage?.persist?.().catch(() => false);
}

export async function removeVoice(id: VoiceId): Promise<void> {
  if (!cacheSupported()) return;
  const cache = await caches.open(VOICE_CACHE);
  const others = (Object.keys(VOICES) as VoiceId[]).filter((v) => v !== id);
  const othersReady = (await Promise.all(others.map(isVoiceReady))).some(Boolean);
  for (const asset of voiceAssets(id)) {
    if (!asset.shared || !othersReady) await cache.delete(asset.url);
  }
}

export function assetUrls(id: VoiceId): Record<VoiceAsset['key'], string> {
  return Object.fromEntries(voiceAssets(id).map((a) => [a.key, a.url])) as Record<VoiceAsset['key'], string>;
}
