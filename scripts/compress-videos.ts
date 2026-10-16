// Compresses the sign recordings in video/ for the web: `npm run videos`.
//
// Each camera file (1080×1920, 50 fps, ~8 MB) becomes a small silent H.264
// clip (450×640, 25 fps, ~100 KB) plus a WebP poster, in public/signs/.
// Files that are already up to date are skipped. Needs ffmpeg in PATH.
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { SIGNS } from '../src/data/signs';

const root = fileURLToPath(new URL('..', import.meta.url));
const inDir = `${root}video`;
const outDir = `${root}public/signs`;

// Keep the bottom 80% of the frame: the signer from just above the head
// (hands go over it in some signs) down to the waist.
const FRAME = 'crop=iw:ih*0.8:0:ih*0.2,scale=450:640:flags=lanczos,eq=contrast=1.04:saturation=1.06';

function run(args: string[]): void {
  const res = spawnSync('ffmpeg', ['-v', 'error', '-y', ...args], { stdio: 'inherit' });
  if (res.error) throw new Error(`ffmpeg not found: ${res.error.message}`);
  if (res.status !== 0) throw new Error(`ffmpeg failed: ${args.join(' ')}`);
}

function duration(file: string): number {
  const res = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', file], {
    encoding: 'utf8',
  });
  return Number(res.stdout.trim()) || 1;
}

const isFresh = (out: string, src: string) => existsSync(out) && statSync(out).mtimeMs >= statSync(src).mtimeMs;

mkdirSync(outDir, { recursive: true });

let made = 0;
let total = 0;
for (const sign of SIGNS) {
  const src = [`${inDir}/${sign.source}.MP4`, `${inDir}/${sign.source}.mp4`].find(existsSync);
  if (!src) {
    console.warn(`! ${sign.kk}: ${sign.source}.MP4 not found in video/`);
    continue;
  }
  const mp4 = `${outDir}/${sign.id}.mp4`;
  const webp = `${outDir}/${sign.id}.webp`;

  if (!isFresh(mp4, src)) {
    run([
      '-i', src,
      '-an', '-sn', '-dn', '-map_metadata', '-1',
      '-vf', `${FRAME},fps=25,format=yuv420p`,
      '-c:v', 'libx264', '-preset', 'slow', '-crf', '28', '-profile:v', 'main',
      '-movflags', '+faststart',
      mp4,
    ]);
    made++;
  }
  if (!isFresh(webp, src)) {
    // The middle of the clip is where the hands hold the sign.
    run(['-ss', (duration(src) * 0.55).toFixed(2), '-i', src, '-frames:v', '1', '-vf', FRAME, '-c:v', 'libwebp', '-quality', '72', webp]);
  }
  const size = statSync(mp4).size + statSync(webp).size;
  total += size;
  console.log(`${sign.id.padEnd(12)} ${sign.kk.padEnd(12)} ${(size / 1024).toFixed(0).padStart(5)} KB`);
}

console.log(`\n${SIGNS.length} signs, ${made} encoded now, ${(total / 1024 / 1024).toFixed(1)} MB in public/signs/`);
