// Builds the recognition model of the video signs: `npm run sign-model`.
//
// Reads the landmarks from video/landmarks/ (`npm run landmarks`), cuts each
// recording to the sign itself and writes the templates to
// src/data/signModel.json. Then replays every video through the recogniser
// and reports what it reads. Manual trimming: `trim` in src/data/signs.ts.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SIGNS } from '../src/data/signs';
import { recordedFrames, recordingFeatures, type Recording } from '../src/gesture/recording';
import { SIGN_ACCEPT, SignSpotter } from '../src/gesture/signSpotter';
import { buildTemplate, packModel, TICK_MS, type SignModel } from '../src/gesture/signTemplates';

const root = fileURLToPath(new URL('..', import.meta.url));
const outFile = join(root, 'src', 'data', 'signModel.json');

const recordings = new Map<string, ReturnType<typeof recordedFrames>>();
const model: SignModel = { version: 1, tickMs: TICK_MS, templates: [] };
for (const sign of SIGNS) {
  const file = join(root, 'video', 'landmarks', `${sign.id}.json`);
  if (!existsSync(file)) {
    console.warn(`! ${sign.kk}: no landmarks — run \`npm run landmarks\``);
    continue;
  }
  const frames = recordedFrames(JSON.parse(readFileSync(file, 'utf8')) as Recording);
  recordings.set(sign.id, frames);
  model.templates.push(buildTemplate(sign.id, recordingFeatures(frames), sign.trim));
}

const stored = packModel(model);
writeFileSync(outFile, `{"version":1,"tickMs":${stored.tickMs},"templates":[\n${stored.templates.map((t) => JSON.stringify(t)).join(',\n')}\n]}\n`);

// Self-check: play each video (with a second of empty camera before and after).
const spotter = new SignSpotter(model);
let found = 0;
let flashed = 0;
for (const template of model.templates) {
  const frames = recordings.get(template.id)!;
  const last = frames[frames.length - 1].t;
  spotter.reset();
  const words: string[] = [];
  const replaced: string[] = [];
  const play = (t: number, f: (typeof frames)[number] | null) => {
    const { commit } = spotter.push(t, f?.hands ?? [], f?.face ?? null, 'right');
    if (!commit) return;
    replaced.push(...words.splice(words.length - commit.replaces));
    words.push(commit.id);
  };
  for (let t = 0; t < 1000; t += 33) play(t, null);
  for (const f of frames) play(1000 + f.t, f);
  for (let t = 0; t < 1000; t += 33) play(2000 + last + t, null);

  const ok = words.length === 1 && words[0] === template.id;
  if (ok) found++;
  if (replaced.length) flashed++;
  const seconds = ((template.frames.length * TICK_MS) / 1000).toFixed(2);
  const note = replaced.length ? `   (briefly: ${replaced.join(', ')})` : '';
  console.log(
    `${ok ? ' ' : '!'} ${template.id.padEnd(11)} ${seconds} s ${template.twoHanded ? '2 hands' : '1 hand '}  → ${words.join(', ') || '—'}${note}`,
  );
}

const kb = (readFileSync(outFile).length / 1024).toFixed(0);
console.log(`\n${found}/${model.templates.length} videos recognised as their own sign (threshold ${SIGN_ACCEPT}).`);
if (flashed) console.log(`${flashed} of them first showed a shorter sign that the full one then replaced.`);
console.log(`Model: src/data/signModel.json, ${kb} KB.`);
