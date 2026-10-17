import { beforeAll, describe, expect, it } from 'vitest';
import stored from '../data/signModel.json';
import { SIGNS } from '../data/signs';
import { TEMPLATE_WORDS } from '../data/vocabulary';
import type { EngineFrame } from '../hooks/useGestureEngine';
import { loadSignModel } from '../lib/signModel';
import { TakeCapture } from '../lib/take';
import { Recognizer, type RecognitionMode } from './recognizer';
import { recordedFrames, recordingFeatures, type RecordedFrame, type Recording } from './recording';
import { mirrorFrame, signFrame, type SignHand } from './signFeatures';
import { SignSpotter } from './signSpotter';
import { buildTemplate, packModel, TICK_MS, unpackFrames, type SignModel, type SignTemplate, type StoredSignModel } from './signTemplates';
import type { FaceBox, HandFeatures, HandSide } from './types';

/** The landmarks of the 50 video lessons (scripts/extract-landmarks.ts). */
const files = import.meta.glob<Recording>('../../video/landmarks/*.json', { eager: true, import: 'default' });
const recordings = new Map(SIGNS.map((s) => [s.id, files[`../../video/landmarks/${s.id}.json`]]));
const frames = (id: string) => recordedFrames(recordings.get(id)!);

/** The same recording as if signed with the other hand (and filmed the same way). */
function mirrored(rec: Recording): Recording {
  return {
    ...rec,
    frames: rec.frames.map((f) => ({
      t: f.t,
      face: f.face && [rec.width - f.face[0], f.face[1], f.face[2], f.face[3]],
      hands: f.hands.map((h) => ({
        label: h.label === 'Left' ? 'Right' : 'Left',
        score: h.score,
        lm: h.lm.map((v, i) => (i % 3 === 0 ? 1 - v : v)),
        world: h.world.map((v, i) => (i % 3 === 0 ? -v : v)),
      })),
    })),
  };
}

/** Replaying all 50 videos takes a second or two; more on a busy machine. */
const SLOW = 30_000;

let model: SignModel;
beforeAll(async () => {
  model = await loadSignModel();
});

/** Plays clips through the recogniser like the Translate page does; returns the resulting words. */
function play(
  clips: RecordedFrame[][],
  opts: { speed?: number; pauseMs?: number; dominant?: HandSide; mode?: RecognitionMode; own?: SignTemplate[]; onOwn?: () => void } = {},
) {
  const { speed = 1, pauseMs = 1000, dominant = 'right', mode = 'signs' } = opts;
  const rec = new Recognizer(TEMPLATE_WORDS, { holdMs: 550, mode, dominant }, null, new SignSpotter(model, opts.own));
  const words: string[] = [];
  let now = 0;
  const push = (t: number, hands: HandFeatures[], face: FaceBox | null) => {
    const { commit } = rec.process({ t, hands, face });
    if (commit) words.splice(words.length - commit.replace, commit.replace, commit.wordId);
    if (commit?.own) opts.onOwn?.();
  };
  const pause = () => {
    for (let t = 0; t < pauseMs; t += 33) push(now + t, [], null);
    now += pauseMs;
  };
  pause();
  for (const clip of clips) {
    for (const f of clip) push(now + f.t * speed, f.hands, f.face);
    now += clip[clip.length - 1].t * speed + 33;
    pause();
  }
  return words;
}

describe('video signs', () => {
  it('reads every video lesson as its own word', () => {
    const wrong = SIGNS.map((s) => ({ want: s.wordId, got: play([frames(s.id)]).join(' ') })).filter((r) => r.got !== r.want);
    expect(wrong).toEqual([]);
  }, SLOW);

  it('reads them when signed slower or faster than in the video', () => {
    for (const speed of [0.75, 1.5]) {
      const wrong = SIGNS.filter((s) => play([frames(s.id)], { speed }).join(' ') !== s.wordId).map((s) => s.id);
      expect(wrong, `speed ×${speed}`).toEqual([]);
    }
  }, SLOW);

  it('reads them signed with the left hand', () => {
    const wrong = SIGNS.filter((s) => play([recordedFrames(mirrored(recordings.get(s.id)!))], { dominant: 'left' }).join(' ') !== s.wordId);
    expect(wrong.map((s) => s.id)).toEqual([]);
  }, SLOW);

  it('reads a sentence of several signs', () => {
    const ids = ['erten', 'mektep', 'oku', 'ana', 'kitap', 'zhaksy'];
    expect(play(ids.map(frames), { pauseMs: 400 })).toEqual(ids);
  });

  it('writes nothing while no hands are visible', () => {
    expect(play([], { pauseMs: 5000 })).toEqual([]);
  });

  it('reads a word from the user’s own take, which wins over the lesson it resembles', () => {
    // The user recorded “кітап” on the Train page the way the video shows “түн”.
    const take = new TakeCapture(0);
    for (const f of frames('tun')) take.push({ t: f.t, hands: f.hands, face: f.face, dom: f.hands[0] ?? null, features: null } as unknown as EngineFrame, null);
    const sign = take.sign();
    expect(sign).not.toBeNull();
    let own = 0;
    const words = play([frames('tun')], { own: [{ id: 'kitap', twoHanded: sign![0].length === 2, frames: unpackFrames(sign!) }], onOwn: () => own++ });
    expect(words).toEqual(['kitap']);
    expect(own).toBe(1);
  });

  it('ignores the video signs in the "templates only" mode', () => {
    expect(play([frames('kitap')], { mode: 'templates' })).not.toContain('kitap');
  });
});

describe('sign model', () => {
  it('is up to date with the landmarks (npm run sign-model)', () => {
    const rebuilt = packModel({
      version: 1,
      tickMs: TICK_MS,
      templates: SIGNS.map((s) => buildTemplate(s.id, recordingFeatures(frames(s.id)), s.trim)),
    });
    expect(rebuilt).toEqual(stored as StoredSignModel);
  });

  it('has a template for every sign, each linked to a word', () => {
    expect(model.templates.map((t) => t.id).sort()).toEqual(SIGNS.map((s) => s.wordId).sort());
  });
});

describe('sign features', () => {
  const close = (a: SignHand, b: SignHand) => {
    for (const k of ['shape', 'orient', 'loc', 'vel'] as const) {
      a[k]!.forEach((v, i) => expect(v).toBeCloseTo(b[k]![i], 4));
    }
  };

  it('describe the other hand as the mirror image', () => {
    const t = 600;
    const at = (rec: Recording) => recordedFrames(rec).find((f) => f.t === t)!;
    const original = at(recordings.get('kitap')!);
    const fromMirror = at(mirrored(recordings.get('kitap')!));
    const a = mirrorFrame(signFrame(t, original.hands, original.face));
    const b = signFrame(t, fromMirror.hands, fromMirror.face);
    expect(b.hands).toHaveLength(2);
    a.hands.forEach((h, i) => close(h, b.hands[i]));
  });

  it('do not depend on how far the signer is from the camera', () => {
    const f = frames('salem')[40];
    const scaled = recordedFrames({
      ...recordings.get('salem')!,
      frames: [recordings.get('salem')!.frames[40]].map((r) => ({
        ...r,
        face: r.face && [r.face[0] * 0.5, r.face[1] * 0.5, r.face[2] * 0.5, r.face[3] * 0.5],
        hands: r.hands.map((h) => ({ ...h, lm: h.lm.map((v) => v * 0.5) })),
      })),
    })[0];
    // Half-size picture of the same scene: shape and orientation come from the
    // 3D landmarks, position is measured in face widths.
    const a = signFrame(0, f.hands, f.face).hands[0];
    const b = signFrame(0, scaled.hands, scaled.face).hands[0];
    close(a, b);
  });
});
