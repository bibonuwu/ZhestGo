/**
 * Piper text-to-speech in a Web Worker, so synthesis never stalls the camera:
 * espeak-ng turns Kazakh text into phonemes (WASM), a VITS model turns the
 * phonemes into audio (ONNX Runtime). All binaries come from Cache Storage.
 */
import * as ort from 'onnxruntime-web/wasm';
import phonemizerSource from '@diffusionstudio/piper-wasm/build/piper_phonemize.js?raw';
import { VOICE_CACHE } from './voiceCache';

interface PiperConfig {
  audio: { sample_rate: number };
  espeak: { voice: string };
  inference: { noise_scale: number; length_scale: number; noise_w: number };
  num_speakers: number;
}

interface PhonemizerModule {
  callMain(args: string[]): number;
}
type PhonemizerFactory = (options: Record<string, unknown>) => Promise<PhonemizerModule>;

type AssetUrls = Record<'ortWasm' | 'phonemizerWasm' | 'phonemizerData' | 'model' | 'config', string>;

export type WorkerRequest =
  | { id: number; type: 'load'; assets: AssetUrls }
  | { id: number; type: 'synth'; text: string; lengthScale: number };

export type WorkerResponse =
  | { id: number; ok: true; pcm?: Float32Array; sampleRate?: number }
  | { id: number; ok: false; error: string };

// The Emscripten glue is a CommonJS/UMD script; evaluate it to get its factory.
const createPhonemizer = new Function(`${phonemizerSource}\nreturn createPiperPhonemize;`)() as PhonemizerFactory;

let state: {
  session: ort.InferenceSession;
  config: PiperConfig;
  phonemizerWasm: ArrayBuffer;
  phonemizerData: ArrayBuffer;
} | null = null;

async function read(url: string): Promise<ArrayBuffer> {
  const cache = await caches.open(VOICE_CACHE);
  const res = (await cache.match(url)) ?? (await fetch(url));
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  return res.arrayBuffer();
}

async function load(assets: AssetUrls): Promise<void> {
  const [ortWasm, phonemizerWasm, phonemizerData, model, config] = await Promise.all([
    read(assets.ortWasm),
    read(assets.phonemizerWasm),
    read(assets.phonemizerData),
    read(assets.model),
    read(assets.config),
  ]);
  ort.env.wasm.wasmBinary = ortWasm;
  ort.env.wasm.numThreads = 1;
  const session = await ort.InferenceSession.create(new Uint8Array(model), { executionProviders: ['wasm'] });
  state = { session, config: JSON.parse(new TextDecoder().decode(config)) as PiperConfig, phonemizerWasm, phonemizerData };
}

function phonemize(text: string): Promise<number[]> {
  const s = state!;
  return new Promise((resolve, reject) => {
    let settled = false;
    createPhonemizer({
      print: (line: string) => {
        if (settled) return;
        try {
          const ids = (JSON.parse(line) as { phoneme_ids?: number[] }).phoneme_ids;
          if (Array.isArray(ids)) {
            settled = true;
            resolve(ids);
          }
        } catch {
          /* not the JSON line */
        }
      },
      printErr: () => undefined,
      wasmBinary: s.phonemizerWasm,
      getPreloadedPackage: () => s.phonemizerData,
      locateFile: (name: string) => name,
    }).then((module) => {
      module.callMain(['-l', s.config.espeak.voice, '--input', JSON.stringify([{ text }]), '--espeak_data', '/espeak-ng-data']);
      if (!settled) reject(new Error('The phonemizer produced no output'));
    }, reject);
  });
}

async function synthesize(text: string, lengthScale: number): Promise<{ pcm: Float32Array; sampleRate: number }> {
  const s = state;
  if (!s) throw new Error('Voice is not loaded');
  const { noise_scale, length_scale, noise_w } = s.config.inference;
  const sampleRate = s.config.audio.sample_rate;
  const sentences = (text.match(/[^.!?…]+[.!?…]*/g) ?? [text]).map((t) => t.trim()).filter(Boolean);
  const pause = new Float32Array(Math.round(sampleRate * 0.15));

  const parts: Float32Array[] = [];
  for (const sentence of sentences) {
    const ids = await phonemize(sentence);
    const feeds: Record<string, ort.Tensor> = {
      input: new ort.Tensor('int64', BigInt64Array.from(ids, (n) => BigInt(n)), [1, ids.length]),
      input_lengths: new ort.Tensor('int64', BigInt64Array.from([BigInt(ids.length)]), [1]),
      scales: new ort.Tensor('float32', Float32Array.from([noise_scale, length_scale * lengthScale, noise_w]), [3]),
    };
    if (s.config.num_speakers > 1) feeds.sid = new ort.Tensor('int64', BigInt64Array.from([0n]), [1]);
    const out = await s.session.run(feeds);
    parts.push(out.output.data as Float32Array, pause);
  }

  const pcm = new Float32Array(parts.reduce((n, p) => n + p.length, 0));
  let offset = 0;
  let peak = 0;
  for (const p of parts) {
    pcm.set(p, offset);
    offset += p.length;
    for (const v of p) peak = Math.max(peak, Math.abs(v));
  }
  // The small models speak quietly: bring the peak up to a comfortable level.
  const gain = peak > 0 ? Math.min(6, 0.92 / peak) : 1;
  if (gain > 1.05) for (let i = 0; i < pcm.length; i++) pcm[i] *= gain;
  return { pcm, sampleRate };
}

const scope = self as unknown as {
  onmessage: ((e: MessageEvent<WorkerRequest>) => void) | null;
  postMessage(message: WorkerResponse, transfer?: Transferable[]): void;
};

scope.onmessage = async ({ data }) => {
  try {
    if (data.type === 'load') {
      await load(data.assets);
      scope.postMessage({ id: data.id, ok: true });
    } else {
      const { pcm, sampleRate } = await synthesize(data.text, data.lengthScale);
      scope.postMessage({ id: data.id, ok: true, pcm, sampleRate }, [pcm.buffer]);
    }
  } catch (err) {
    scope.postMessage({ id: data.id, ok: false, error: err instanceof Error ? err.message : String(err) });
  }
};
