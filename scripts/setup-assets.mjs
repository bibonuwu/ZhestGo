// Copies the MediaPipe WASM runtime into public/ and downloads the vision
// models and the offline Kazakh voices, so the site serves everything itself
// and keeps working without Google's CDN or Hugging Face.
// Failures are non-fatal: the app falls back to the original URLs.
import { cpSync, existsSync, mkdirSync, renameSync, statSync, unlinkSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const publicDir = join(root, 'public');

const MODELS = [
  {
    dir: 'models',
    file: 'hand_landmarker.task',
    url: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
  },
  {
    dir: 'models',
    file: 'blaze_face_short_range.tflite',
    url: 'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite',
  },
];

// Piper voices trained on ISSAI KazakhTTS (see README for licences).
const PIPER = 'https://huggingface.co/rhasspy/piper-voices/resolve/main/kk/kk_KZ';
const VOICES = [
  ['kk_KZ-raya-x_low', 'raya/x_low'],
  ['kk_KZ-iseke-x_low', 'iseke/x_low'],
].flatMap(([id, path]) => [
  { dir: 'voices', file: `${id}.onnx`, url: `${PIPER}/${path}/${id}.onnx` },
  { dir: 'voices', file: `${id}.onnx.json`, url: `${PIPER}/${path}/${id}.onnx.json` },
]);

function copyWasm() {
  const src = join(root, 'node_modules', '@mediapipe', 'tasks-vision', 'wasm');
  const dst = join(publicDir, 'mediapipe', 'wasm');
  if (!existsSync(src)) {
    console.warn('[qoldau] @mediapipe/tasks-vision is not installed yet — skipping WASM copy');
    return;
  }
  mkdirSync(dst, { recursive: true });
  cpSync(src, dst, { recursive: true });
  console.log('[qoldau] MediaPipe WASM → public/mediapipe/wasm');
}

async function downloadModels() {
  if (process.env.QOLDAU_SKIP_MODELS) return;
  const files = process.env.QOLDAU_SKIP_VOICES ? MODELS : [...MODELS, ...VOICES];

  for (const { dir: sub, file, url } of files) {
    const dir = join(publicDir, sub);
    mkdirSync(dir, { recursive: true });
    const target = join(dir, file);
    if (existsSync(target) && statSync(target).size > 0) continue;
    const tmp = `${target}.part`;
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await writeFile(tmp, Buffer.from(await res.arrayBuffer()));
      renameSync(tmp, target);
      console.log(`[qoldau] downloaded → public/${sub}/${file}`);
    } catch (err) {
      if (existsSync(tmp)) unlinkSync(tmp);
      console.warn(`[qoldau] could not download ${file} (${err.message}); the original URL will be used at runtime`);
    }
  }
}

copyWasm();
await downloadModels();
