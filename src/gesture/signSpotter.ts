import {
  frameDistance,
  keepLostHand,
  mirrorFrame,
  setVelocity,
  signFrame,
  smoothFrame,
  SMOOTH_MS,
  VELOCITY_LAG_MS,
  type SignFrame,
} from './signFeatures';
import type { SignModel, SignTemplate } from './signTemplates';
import type { FaceBox, HandFeatures, HandSide } from './types';

/**
 * Finds the recorded signs (the video lessons) in the camera stream.
 *
 * Every template is matched against the live frames with dynamic time
 * warping: each template frame is paired with one camera frame, in order, so
 * the signer may be up to 2× faster or 3× slower than the video, and the sign
 * may start at any moment. The cost of a match is the mean distance of the
 * paired frames (see signFeatures.ts). Templates are also tried mirrored, for
 * the other hand. Besides the lessons, the user's own recordings of a word
 * (takes on the Train page) are matched the same way.
 */

/** A sign is accepted when its match costs less than this. */
export const SIGN_ACCEPT = 0.29;
/** Below this the sign is shown as "almost there". */
const SIGN_SHOW = 0.42;
/** A committed sign can be committed again once its cost has been above this… */
const SIGN_RELEASE = 0.4;
const RELEASE_TICKS = 3;
/** …or once the hands have been gone for this many ticks (≈ 0.25 s: longer than MediaPipe's short dropouts). */
const RELEASE_NO_HANDS_TICKS = 4;
/**
 * A match must cover at least this many camera ticks (≈ 0.45 s): a glimpse is
 * not a sign. A short sign shown up to 2× faster than in the video needs
 * less — this share of its own length.
 */
const MIN_SPAN_TICKS = 7;
const MIN_SPAN_SHARE = 0.6;
/** A match starting this soon after the previous one ended uses the same frames. */
const GAP_TICKS = 2;
/** Of two overlapping matches the later one wins unless it is this much worse. */
const PREFER_LATER = 1.2;
/**
 * Signing with the non-dominant hand (a mirrored template) costs this much
 * more. Kept small: beginners often copy the video like a mirror.
 */
const OTHER_HAND_PENALTY = 1.05;
/** The user's own recording of a word is how they sign it: it wins a near tie with a lesson. */
const OWN_PREFERENCE = 0.92;
/** Consecutive template frames may be paired with camera ticks up to this far apart: up to 3× slower than the video. */
const MAX_STEP = 3;
/** After a longer pause in camera frames the matching starts over. */
const MAX_PAUSE_TICKS = 4;
/** Only the last few commits can still be replaced. */
const KEEP_COMMITS = 6;
/**
 * A longer sign "under way" — its first third or more already fits the same
 * frames better — may contain the sign just found (тыңдау is the middle of
 * әйел): the found one waits for it, at most this many ticks (1 s).
 */
const MAX_HOLD_TICKS = 15;

interface Match {
  cost: number;
  start: number;
}

interface Row {
  /** Distance of this tick's camera frame to each template frame. */
  d: Float64Array;
  /** Summed cost and number of pairs of the best path ending at template frame j after a normal step… */
  c: Float64Array;
  nc: Int32Array;
  /** …or after a repeat step (the same camera frame paired with two template frames). */
  z: Float64Array;
  nz: Int32Array;
  /** Tick where those paths start. */
  sc: Int32Array;
  sz: Int32Array;
}

/**
 * A camera frame between two paired ones is paired with the template frame
 * too, at no more than this cost: the matcher cannot simply skip frames that
 * do not fit, but can bridge a frame or two without hands.
 */
const SKIPPED_FRAME_COST = 0.5;

/** Streaming DTW of one template. */
class Track {
  private rows: Row[] = [];
  /** Shortest match accepted, ticks. */
  readonly minSpan: number;

  constructor(
    readonly id: string,
    readonly mirrored: boolean,
    private readonly frames: readonly SignFrame[],
    /** The user's own recording, not a video lesson. */
    readonly own = false,
  ) {
    this.minSpan = Math.min(MIN_SPAN_TICKS, Math.ceil(frames.length * MIN_SPAN_SHARE));
  }

  reset(): void {
    this.rows = [];
  }

  /**
   * `full`: the best match of the whole template that ends at this tick;
   * `partial`: the best match of its first third or more (but not all of it).
   * Costs are the mean distance over all paired frames.
   */
  step(u: SignFrame, tick: number): { full: Match; partial: Match } {
    const m = this.frames.length;
    const partial: Match = { cost: Infinity, start: tick };
    const row: Row = {
      d: new Float64Array(m),
      c: new Float64Array(m).fill(Infinity),
      nc: new Int32Array(m).fill(1),
      z: new Float64Array(m).fill(Infinity),
      nz: new Int32Array(m).fill(1),
      sc: new Int32Array(m),
      sz: new Int32Array(m),
    };
    for (let j = 0; j < m; j++) {
      const d = frameDistance(u, this.frames[j]);
      row.d[j] = d;
      if (j === 0) {
        row.c[0] = d;
        row.sc[0] = tick;
        continue;
      }
      // Normal step: the previous template frame was paired 1…MAX_STEP ticks
      // ago; the camera frames in between are paired with this one.
      let best = Infinity;
      let skipped = 0;
      for (let k = 0; k < this.rows.length; k++) {
        const r = this.rows[k];
        for (const [cost, n, start] of [
          [r.c[j - 1], r.nc[j - 1], r.sc[j - 1]],
          [r.z[j - 1], r.nz[j - 1], r.sz[j - 1]],
        ]) {
          const sum = cost + d + skipped;
          const pairs = n + k + 1;
          if (sum / pairs < best) {
            best = sum / pairs;
            row.c[j] = sum;
            row.nc[j] = pairs;
            row.sc[j] = start;
          }
        }
        skipped += Math.min(r.d[j], SKIPPED_FRAME_COST);
      }
      // Repeat step, never twice in a row: so at most 2× faster than the video.
      row.z[j] = row.c[j - 1] + d;
      row.nz[j] = row.nc[j - 1] + 1;
      row.sz[j] = row.sc[j - 1];
      if (j < m - 1 && (j + 1) * 3 >= m) {
        const viaRepeat = row.z[j] / row.nz[j] < row.c[j] / row.nc[j];
        const cost = viaRepeat ? row.z[j] / row.nz[j] : row.c[j] / row.nc[j];
        if (cost < partial.cost) {
          partial.cost = cost;
          partial.start = viaRepeat ? row.sz[j] : row.sc[j];
        }
      }
    }
    this.rows.unshift(row);
    if (this.rows.length > MAX_STEP) this.rows.pop();
    const last = m - 1;
    const viaRepeat = row.z[last] / row.nz[last] < row.c[last] / row.nc[last];
    const full = {
      cost: viaRepeat ? row.z[last] / row.nz[last] : row.c[last] / row.nc[last],
      start: viaRepeat ? row.sz[last] : row.sc[last],
    };
    return { full, partial };
  }
}

export interface SignCandidate {
  id: string;
  /** 0…1 — how close the sign is to being accepted. */
  progress: number;
  /** Already committed and still being held. */
  blocked: boolean;
  /** Matched one of the user's own recordings. */
  own: boolean;
}

export interface SignCommit {
  id: string;
  /** How many of the previous sign commits this one replaces (they were parts of it). */
  replaces: number;
  own: boolean;
}

export interface SignResult {
  candidate: SignCandidate | null;
  commit: SignCommit | null;
}

/** A match of a whole template. */
interface Found {
  id: string;
  /** Ticks of the camera frames it was matched on. */
  start: number;
  end: number;
  cost: number;
  own: boolean;
}

interface Committed extends Found {
  /** Already passed on (not waiting for a longer sign, see MAX_HOLD_TICKS). */
  shown: boolean;
  heldSince: number;
  /** Words already passed on that this one replaces when it is passed on. */
  owes: number;
}

export class SignSpotter {
  private readonly tracks: Track[];
  private readonly tickMs: number;
  /** Recent camera frames as seen, for smoothing… */
  private raw: SignFrame[] = [];
  /** …and smoothed, for velocities. */
  private history: SignFrame[] = [];
  /** The last camera frame with both hands. */
  private pair: SignFrame | null = null;
  private nextTickAt = -Infinity;
  private tick = 0;
  private noHandTicks = 0;
  /** A sign accepted on the previous tick, waiting for one more look. */
  private pending: Found | null = null;
  /** Committed signs that cannot be committed again yet → ticks spent away. */
  private blocked = new Map<string, number>();
  private commits: Committed[] = [];
  private candidate: SignCandidate | null = null;

  /** `own`: templates from the user's recordings, with the ids of their words. */
  constructor(model: SignModel, own: readonly SignTemplate[] = []) {
    this.tickMs = model.tickMs;
    const tracks = (templates: readonly SignTemplate[], mine: boolean) =>
      templates.flatMap((t) => [new Track(t.id, false, t.frames, mine), new Track(t.id, true, t.frames.map(mirrorFrame), mine)]);
    this.tracks = [...tracks(model.templates, false), ...tracks(own, true)];
  }

  get size(): number {
    return this.tracks.length / 2;
  }

  reset(): void {
    for (const track of this.tracks) track.reset();
    this.raw = [];
    this.history = [];
    this.pair = null;
    this.nextTickAt = -Infinity;
    this.noHandTicks = 0;
    this.pending = null;
    this.blocked.clear();
    this.commits = [];
    this.candidate = null;
  }

  /** Feeds one camera frame. Matching runs at a fixed rate whatever the camera's frame rate. */
  push(t: number, hands: readonly HandFeatures[], face: FaceBox | null, dominant: HandSide): SignResult {
    const seen = signFrame(t, hands, face);
    if (seen.hands.length === 2) this.pair = seen;
    else keepLostHand(seen, this.pair);
    while (this.raw.length && this.raw[0].t <= t - SMOOTH_MS) this.raw.shift();
    const frame = smoothFrame(seen, this.raw);
    this.raw.push(seen);
    let earlier: SignFrame | null = null;
    for (let i = this.history.length - 1; i >= 0 && !earlier; i--) {
      if (this.history[i].t <= t - VELOCITY_LAG_MS) earlier = this.history[i];
    }
    setVelocity(frame, earlier);
    this.history.push(frame);
    while (this.history.length && this.history[0].t < t - 4 * VELOCITY_LAG_MS) this.history.shift();
    return this.pushFrame(frame, dominant);
  }

  /** Feeds the features of one camera frame (velocities set). */
  pushFrame(frame: SignFrame, dominant: HandSide): SignResult {
    const { t } = frame;
    if (t - this.nextTickAt > MAX_PAUSE_TICKS * this.tickMs) {
      for (const track of this.tracks) track.reset();
      this.pending = null;
      this.nextTickAt = t;
    }
    let commit: SignCommit | null = null;
    // A slow camera repeats its frame so that the time base stays the same.
    while (this.nextTickAt <= t) {
      commit = this.step(frame, dominant) ?? commit;
      this.nextTickAt += this.tickMs;
    }
    return { candidate: this.candidate, commit };
  }

  private step(frame: SignFrame, dominant: HandSide): SignCommit | null {
    const tick = this.tick++;
    this.noHandTicks = frame.hands.length ? 0 : this.noHandTicks + 1;

    const costs = new Map<string, number>();
    const partials: Array<Match & { id: string }> = [];
    let best = { id: '', cost: Infinity, start: tick, minSpan: MIN_SPAN_TICKS, own: false };
    for (const track of this.tracks) {
      const { full, partial } = track.step(frame, tick);
      const penalty = (track.mirrored === (dominant === 'right') ? OTHER_HAND_PENALTY : 1) * (track.own ? OWN_PREFERENCE : 1);
      const cost = full.cost * penalty;
      if (cost < (costs.get(track.id) ?? Infinity)) costs.set(track.id, cost);
      if (cost < best.cost) best = { id: track.id, cost, start: full.start, minSpan: track.minSpan, own: track.own };
      if (partial.cost * penalty < SIGN_ACCEPT) partials.push({ id: track.id, cost: partial.cost * penalty, start: partial.start });
    }

    for (const [id, away] of this.blocked) {
      const ticks = (costs.get(id) ?? Infinity) > SIGN_RELEASE ? away + 1 : 0;
      if (ticks >= RELEASE_TICKS || this.noHandTicks >= RELEASE_NO_HANDS_TICKS) this.blocked.delete(id);
      else this.blocked.set(id, ticks);
    }

    let show = this.accept(best, tick, costs, frame.hands.length > 0);
    // The newest sign is passed on once no longer sign can still contain it.
    const last = this.commits[this.commits.length - 1];
    if (!show && last && !last.shown) {
      const rival = partials.some((p) => p.id !== last.id && p.cost < last.cost && p.start <= last.start + GAP_TICKS);
      if (!rival || tick - last.heldSince >= MAX_HOLD_TICKS) show = last;
    }

    const held = last && !last.shown && last !== show ? last : null;
    if (this.blocked.has(best.id)) {
      this.candidate = { id: best.id, progress: held?.id === best.id ? 0.95 : 1, blocked: held?.id !== best.id, own: best.own };
    } else if (best.cost < SIGN_SHOW) {
      this.candidate = { id: best.id, progress: Math.min(0.9, (SIGN_SHOW - best.cost) / (SIGN_SHOW - SIGN_ACCEPT)), blocked: false, own: best.own };
    } else {
      this.candidate = held ? { id: held.id, progress: 0.95, blocked: false, own: held.own } : null;
    }

    if (!show) return null;
    show.shown = true;
    return { id: show.id, replaces: show.owes, own: show.own };
  }

  /**
   * A sign is committed when it is the best match on two ticks in a row, or
   * when it was on one tick and then ended there — the hands moved on or
   * went away (the last frame of a sign is often its best moment).
   * Returns a held sign that has to be passed on now, before the new one.
   */
  private accept(best: { id: string; cost: number; start: number; minSpan: number; own: boolean }, tick: number, costs: ReadonlyMap<string, number>, hands: boolean): Committed | null {
    const pending = this.pending;
    this.pending = null;
    if (this.blocked.has(best.id) || best.cost >= SIGN_ACCEPT || tick - best.start + 1 < best.minSpan) {
      const ended = pending && (!hands || (costs.get(pending.id) ?? Infinity) >= SIGN_ACCEPT);
      return pending && ended && !this.blocked.has(pending.id) ? this.add(pending) : null;
    }
    if (pending?.id !== best.id) {
      this.pending = { id: best.id, start: best.start, end: tick, cost: best.cost, own: best.own };
      return null;
    }
    return this.add({ id: best.id, start: best.start, end: tick, cost: best.cost, own: best.own });
  }

  private add(best: Found): Committed | null {
    // The same camera frames cannot be two signs: of overlapping matches keep the better one.
    let k = this.commits.length;
    while (k > 0 && best.start <= this.commits[k - 1].end + GAP_TICKS) k--;
    const overlapping = this.commits.slice(k);
    if (overlapping.some((o) => o.id === best.id)) return null;
    if (overlapping.length && best.cost >= Math.min(...overlapping.map((o) => o.cost)) * PREFER_LATER) return null;

    const before = this.commits[k - 1];
    this.commits.splice(k, overlapping.length, {
      ...best,
      shown: false,
      heldSince: best.end,
      owes: overlapping.reduce((n, o) => n + (o.shown ? 1 : o.owes), 0),
    });
    if (this.commits.length > KEEP_COMMITS) this.commits.shift();
    for (const o of overlapping) this.blocked.delete(o.id);
    this.blocked.set(best.id, 0);
    return before && !before.shown ? before : null;
  }
}
