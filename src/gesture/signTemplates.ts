import { packHand, unpackHand, type SignFrame, type SignHand } from './signFeatures';

/** Templates and the live camera are compared at this rate. */
export const TICK_MS = 1000 / 15;

export interface SignTemplate {
  /** Sign id (data/signs.ts). */
  id: string;
  twoHanded: boolean;
  /** One frame per tick. */
  frames: SignFrame[];
}

export interface SignModel {
  version: 1;
  tickMs: number;
  templates: SignTemplate[];
}

/** Hands below this (face widths under the face centre) are resting, not signing. */
const REST_Y = 2.6;
/** Rising or dropping faster than this (face widths per second) is moving to or from rest. */
const FAST = 1.5;
/** Low hands that are still moving vertically are also on their way. */
const LOW_Y = 2;
const SLOW = 0.5;
/** Velocities for trimming are measured over ±this, ms. */
const TRIM_WINDOW_MS = 100;
/** A sign that stays in one place is cut to its middle part of this length… */
const STATIC_MAX_MS = 1000;
/** …when the hand moves less than this (face widths). */
const STATIC_RANGE = 0.5;
/** A sign is two-handed when the second hand is up (not resting) for at least half of it. */
const SECOND_HAND_Y = 2.2;

const handY = (f: SignFrame): number => Math.min(...f.hands.map((h) => h.loc?.[1] ?? Infinity));

/**
 * Where the sign itself is in a recording, ms: without the hand rising from
 * rest at the start and dropping back at the end.
 */
export function activeRange(frames: readonly SignFrame[]): [number, number] {
  const vy = (i: number): number => {
    let a = i;
    let b = i;
    while (a > 0 && frames[i].t - frames[a - 1].t <= TRIM_WINDOW_MS) a--;
    while (b < frames.length - 1 && frames[b + 1].t - frames[i].t <= TRIM_WINDOW_MS) b++;
    const dy = handY(frames[b]) - handY(frames[a]);
    return Number.isFinite(dy) && b > a ? (dy / (frames[b].t - frames[a].t)) * 1000 : NaN;
  };
  const resting = (i: number): boolean => !Number.isFinite(handY(frames[i])) || Number.isNaN(vy(i)) || handY(frames[i]) > REST_Y;
  const rising = (i: number) => resting(i) || vy(i) < -FAST || (handY(frames[i]) > LOW_Y && vy(i) < -SLOW);
  const falling = (i: number) => resting(i) || vy(i) > FAST || (handY(frames[i]) > LOW_Y && vy(i) > SLOW);

  let s = 0;
  while (s < frames.length - 1 && rising(s)) s++;
  let e = frames.length - 1;
  while (e > s && falling(e)) e--;
  return [frames[s].t, frames[e].t];
}

/** The frame nearest to each tick from `from` to `to`. */
export function resample(frames: readonly SignFrame[], from: number, to: number): SignFrame[] {
  const out: SignFrame[] = [];
  let j = 0;
  for (let t = from; t <= to + 1e-6; t += TICK_MS) {
    while (j < frames.length - 1 && Math.abs(frames[j + 1].t - t) <= Math.abs(frames[j].t - t)) j++;
    out.push(frames[j]);
  }
  return out;
}

/**
 * Turns one recording (features of every frame, velocities set) into a
 * template. `range` overrides the automatic trimming, ms.
 */
export function buildTemplate(id: string, frames: readonly SignFrame[], range?: [number, number]): SignTemplate {
  let [from, to] = range ?? activeRange(frames);
  const active = frames.filter((f) => f.t >= from && f.t <= to && f.hands.length);
  if (!active.length) throw new Error(`${id}: no hands in ${from}–${to} ms`);

  const pos = active.map((f) => f.hands[0].loc ?? [0, 0]);
  const spread = (k: number) => Math.max(...pos.map((p) => p[k])) - Math.min(...pos.map((p) => p[k]));
  if (Math.max(spread(0), spread(1)) < STATIC_RANGE && to - from > STATIC_MAX_MS) {
    const mid = (from + to) / 2;
    from = mid - STATIC_MAX_MS / 2;
    to = mid + STATIC_MAX_MS / 2;
  }

  const two = active.filter((f) => f.hands.length === 2);
  const twoHanded =
    two.length >= active.length / 2 && two.reduce((s, f) => s + (f.hands[1].loc?.[1] ?? Infinity), 0) / two.length < SECOND_HAND_Y;

  const ticks = resample(frames, from, to).map((f): SignFrame => {
    if (twoHanded || f.hands.length < 2) return f;
    // One-handed sign: keep the hand that is higher up — the other one is resting.
    const signing = f.hands.reduce((a, b) => ((a.loc?.[1] ?? Infinity) <= (b.loc?.[1] ?? Infinity) ? a : b));
    return { t: f.t, hands: [signing] };
  });
  return { id, twoHanded, frames: ticks.map((f, i) => ({ t: Math.round(i * TICK_MS), hands: f.hands })) };
}

/** JSON form of the model: every hand packed into one array of numbers. */
export interface StoredSignModel {
  version: 1;
  tickMs: number;
  templates: Array<{ id: string; twoHanded: boolean; frames: number[][][] }>;
}

export function packModel(model: SignModel): StoredSignModel {
  return {
    version: 1,
    tickMs: model.tickMs,
    templates: model.templates.map((t) => ({
      id: t.id,
      twoHanded: t.twoHanded,
      frames: t.frames.map((f) => f.hands.map((h) => packHand(h))),
    })),
  };
}

export function unpackModel(stored: StoredSignModel): SignModel {
  return {
    version: 1,
    tickMs: stored.tickMs,
    templates: stored.templates.map((t) => ({
      id: t.id,
      twoHanded: t.twoHanded,
      frames: t.frames.map((hands, i) => ({ t: Math.round(i * stored.tickMs), hands: hands.map((h): SignHand => unpackHand(h)) })),
    })),
  };
}
