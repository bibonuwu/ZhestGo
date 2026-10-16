// Runs MediaPipe over the sign recordings in video/: `npm run landmarks`.
//
// Uses the same hand and face models as the site, in headless Chrome, and
// writes the landmarks of every frame to video/landmarks/<id>.json. The
// recognition model is then built from these files (`npm run sign-model`).
// Up-to-date files are skipped (`--force` redoes all). Needs ffmpeg and
// Chrome or Edge (or CHROME_PATH).
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SIGNS } from '../src/data/signs';

const root = fileURLToPath(new URL('..', import.meta.url));
const outDir = join(root, 'video', 'landmarks');
const force = process.argv.includes('--force');

/** The camera files are 1080×1920 at 50 fps; the signer stands in the lower 80 %. */
const FRAME = 'crop=iw:ih*0.8:0:ih*0.2,scale=720:-2';
const FPS = 50;

const CHROME_PATHS = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
];

const isFresh = (out: string, src: string) => existsSync(out) && statSync(out).mtimeMs >= statSync(src).mtimeMs;

const jobs = SIGNS.flatMap((sign) => {
  const src = [`${sign.source}.MP4`, `${sign.source}.mp4`].map((f) => join(root, 'video', f)).find(existsSync);
  if (!src) {
    console.warn(`! ${sign.kk}: ${sign.source}.MP4 not found in video/`);
    return [];
  }
  return force || !isFresh(join(outDir, `${sign.id}.json`), src) ? [{ id: sign.id, src }] : [];
});
if (!jobs.length) {
  console.log('All landmark files are up to date.');
  process.exit(0);
}

const modelsDir = join(root, 'public', 'models');
if (!existsSync(join(modelsDir, 'hand_landmarker.task'))) {
  console.error('public/models/ is missing: run `npm install` first.');
  process.exit(1);
}
const chrome = CHROME_PATHS.find((p) => p && existsSync(p));
if (!chrome) {
  console.error('Chrome not found: set CHROME_PATH.');
  process.exit(1);
}

// 1. Video → JPEG frames.
const work = mkdtempSync(join(tmpdir(), 'qoldau-frames-'));
const frameCount: Record<string, number> = {};
for (const job of jobs) {
  const dir = join(work, job.id);
  mkdirSync(dir);
  const res = spawnSync('ffmpeg', ['-v', 'error', '-i', job.src, '-an', '-vf', `${FRAME},fps=${FPS}`, '-q:v', '2', join(dir, '%04d.jpg')], {
    stdio: 'inherit',
  });
  if (res.error) throw new Error(`ffmpeg not found: ${res.error.message}`);
  if (res.status !== 0) throw new Error(`ffmpeg failed on ${job.src}`);
  frameCount[job.id] = readdirSync(dir).length;
}

// 2. The page that runs MediaPipe (same options as src/gesture/vision.ts, CPU for repeatability).
const PAGE = /* html */ `<!doctype html><meta charset="utf-8"><script type="module">
import { FaceDetector, FilesetResolver, HandLandmarker } from '/mp/vision_bundle.mjs';
const post = (path, body) => fetch(path, { method: 'POST', body: JSON.stringify(body) });
const r4 = (v) => Math.round(v * 1e4) / 1e4;
const r5 = (v) => Math.round(v * 1e5) / 1e5;
try {
  const jobs = await (await fetch('/jobs')).json();
  const fileset = await FilesetResolver.forVisionTasks('/mp/wasm');
  const faces = await FaceDetector.createFromOptions(fileset, {
    baseOptions: { modelAssetPath: '/models/blaze_face_short_range.tflite', delegate: 'CPU' },
    runningMode: 'IMAGE',
    minDetectionConfidence: 0.5,
  });
  const crop = document.createElement('canvas');
  crop.width = crop.height = 256;
  const ctx = crop.getContext('2d');

  // The face is small in a full frame: look for it in square crops around the head.
  const faceIn = (img, x, y, s) => {
    ctx.clearRect(0, 0, 256, 256);
    ctx.drawImage(img, x, y, s, s, 0, 0, 256, 256);
    let best = null;
    for (const d of faces.detect(crop).detections) {
      const b = d.boundingBox;
      const score = d.categories?.[0]?.score ?? 0;
      if (b && (!best || score > best.score)) {
        const k = s / 256;
        best = { score, cx: x + (b.originX + b.width / 2) * k, cy: y + (b.originY + b.height / 2) * k, w: b.width * k, h: b.height * k };
      }
    }
    return best;
  };
  const findFace = (img, prev) => {
    const W = img.naturalWidth;
    const H = img.naturalHeight;
    const crops = [];
    if (prev) {
      const s = Math.min(W, H, Math.max(160, prev.w * 4));
      crops.push([Math.min(W - s, Math.max(0, prev.cx - s / 2)), Math.min(H - s, Math.max(0, prev.cy - s / 2)), s]);
    } else {
      for (const s of [W * 0.5, W * 0.7]) {
        for (let y = 0; y + s <= H * 0.75; y += s / 4) for (let x = 0; x + s <= W; x += s / 4) crops.push([x, y, s]);
      }
    }
    let best = null;
    for (const [x, y, s] of crops) {
      const f = faceIn(img, x, y, s);
      if (f && (!best || f.score > best.score)) best = f;
    }
    return best;
  };

  for (const job of jobs) {
    const hands = await HandLandmarker.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: '/models/hand_landmarker.task', delegate: 'CPU' },
      runningMode: 'VIDEO',
      numHands: 2,
      minHandDetectionConfidence: 0.6,
      minHandPresenceConfidence: 0.6,
      minTrackingConfidence: 0.5,
    });
    const frames = [];
    let face = null;
    let width = 0;
    let height = 0;
    for (let i = 0; i < job.frames; i++) {
      const img = new Image();
      img.src = '/frames/' + job.id + '/' + String(i + 1).padStart(4, '0') + '.jpg';
      await img.decode();
      width = img.naturalWidth;
      height = img.naturalHeight;
      const t = (i * 1000) / job.fps;
      const res = hands.detectForVideo(img, t + 1);
      face = findFace(img, face) ?? face;
      frames.push({
        t: Math.round(t),
        face: face && [face.cx, face.cy, face.w, face.h].map((v) => Math.round(v * 10) / 10),
        hands: res.landmarks.map((lm, k) => ({
          label: res.handedness[k]?.[0]?.categoryName === 'Right' ? 'Right' : 'Left',
          score: r4(res.handedness[k]?.[0]?.score ?? 0),
          lm: lm.flatMap((p) => [r4(p.x), r4(p.y), r4(p.z)]),
          world: (res.worldLandmarks[k] ?? []).flatMap((p) => [r5(p.x), r5(p.y), r5(p.z)]),
        })),
      });
    }
    hands.close();
    await post('/result/' + job.id, { id: job.id, fps: job.fps, width, height, frames });
  }
  await post('/done', {});
} catch (err) {
  await post('/fail', { error: String(err && err.stack || err) });
}
</script>`;

const TYPES: Record<string, string> = {
  '.mjs': 'text/javascript',
  '.js': 'text/javascript',
  '.wasm': 'application/wasm',
  '.jpg': 'image/jpeg',
  '.task': 'application/octet-stream',
  '.tflite': 'application/octet-stream',
};
const mpDir = join(root, 'node_modules', '@mediapipe', 'tasks-vision');
const STATIC: Array<[prefix: string, dir: string]> = [
  ['/mp/', mpDir],
  ['/models/', modelsDir],
  ['/frames/', work],
];

mkdirSync(outDir, { recursive: true });
let done = 0;
let browser: ReturnType<typeof spawn> | null = null;

const finish = (code: number) => {
  browser?.kill();
  server.close();
  rmSync(work, { recursive: true, force: true });
  process.exit(code);
};

const server = createServer((req, res) => {
  const url = decodeURIComponent((req.url ?? '/').split('?')[0]);
  if (req.method === 'POST') {
    const chunks: Buffer[] = [];
    req.on('data', (c: Buffer) => chunks.push(c));
    req.on('end', () => {
      res.end('ok');
      const body = Buffer.concat(chunks).toString('utf8');
      if (url.startsWith('/result/')) {
        const id = url.slice('/result/'.length);
        writeFileSync(join(outDir, `${id}.json`), body);
        const data = JSON.parse(body) as { frames: { hands: unknown[]; face: unknown }[] };
        const withHands = data.frames.filter((f) => f.hands.length).length;
        const withFace = data.frames.filter((f) => f.face).length;
        console.log(`${id.padEnd(12)} ${String(data.frames.length).padStart(4)} frames · hands ${withHands} · face ${withFace}`);
        done++;
      } else if (url === '/done') {
        console.log(`\n${done} landmark files written to video/landmarks/`);
        finish(0);
      } else if (url === '/fail') {
        console.error('MediaPipe failed:', JSON.parse(body).error);
        finish(1);
      }
    });
    return;
  }
  if (url === '/') {
    res.setHeader('content-type', 'text/html');
    res.end(PAGE);
    return;
  }
  if (url === '/jobs') {
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify(jobs.map((j) => ({ id: j.id, frames: frameCount[j.id], fps: FPS }))));
    return;
  }
  for (const [prefix, dir] of STATIC) {
    if (!url.startsWith(prefix)) continue;
    const file = join(dir, url.slice(prefix.length));
    if (!file.startsWith(dir) || !existsSync(file)) break;
    res.setHeader('content-type', TYPES[extname(file)] ?? 'application/octet-stream');
    res.end(readFileSync(file));
    return;
  }
  res.statusCode = 404;
  res.end();
});

server.listen(0, '127.0.0.1', () => {
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : 0;
  console.log(`Processing ${jobs.length} videos in ${chrome.split(/[\\/]/).pop()}…\n`);
  browser = spawn(
    chrome,
    [
      '--headless=new',
      '--disable-gpu',
      '--no-first-run',
      '--no-default-browser-check',
      `--user-data-dir=${join(work, 'profile')}`,
      `http://127.0.0.1:${port}/`,
    ],
    { stdio: 'ignore' },
  );
  browser.on('exit', (code) => {
    if (done < jobs.length) {
      console.error(`Chrome exited (${code}) before finishing.`);
      finish(1);
    }
  });
});
