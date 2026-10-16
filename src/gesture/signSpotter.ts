import { frameDistance, mirrorFrame, setVelocity, signFrame, VELOCITY_LAG_MS, type SignFrame } from './signFeatures';
import type { SignModel } from './signTemplates';
import type { FaceBox, HandFeatures, HandSide } from './types';

/**
 * Finds the recorded signs (the video lessons) in the camera stream.
 *
 * Every template is matched against the live frames with dynamic time
 * warping: each template frame is paired with one camera frame, in order, so
 * the signer may be up to 2× faster or 3× slower than the video, and the sign
 * may start at any moment. The cost of a match is the mean distance of the
 * paired frames (see signFeatures.ts). Templates are also tried mirrored, for
 * the other hand.
 */

/** A sign is accepted when its match costs less than this. */
export const SIGN_ACCEPT = 0.27;
/** Below this the sign is shown as "almost there". */
const SIGN_SHOW = 0.42;
/** A committed sign can be committed again once its cost has been above this… */
const SIGN_RELEASE = 0.4;
const RELEASE_TICKS = 3;
/** …or once the hands have been gone for this many ticks. */
const RELEASE_NO_HANDS_TICKS = 2;
/** The best sign must stay the best for this many ticks before it is committed. */
const CONFIRM_TICKS = 2;
/** A match must cover at least this many camera ticks (≈ 0.45 s): a glimpse is not a sign. */
const MIN_SPAN_TICKS = 7;
/** A match starting this soon after the previous one ended uses the same frames. */
const GAP_TICKS = 2;
/** Of two overlapping matches the later one wins unless it is this much worse. */
const PREFER_LATER = 1.2;
/** Signing with the non-dominant hand (a mirrored template) costs this much more. */
const OTHER_HAND_PENALTY = 1.2;
/** One camera tick may advance the template by up to this many frames… no: skip up to MAX_STEP − 1 camera ticks. */
const MAX_STEP = 3;
/** After a longer pause in camera frames the matching starts over. */
const MAX_PAUSE_TICKS = 4;
/** Only the last few commits can still be replaced. */
const KEEP_COMMITS = 6;

interface Row {
  /** Best cost of a path ending at template frame j after a normal step… */
  c: Float64Array;
  /** …or after a repeat step (the same camera frame paired with two template frames). */
  z: Float64Array;
  /** Tick where those paths start. */
  sc: Int32Array;
  sz: Int32Array;
}

/** Streaming DTW of one template. */
class Track {
  private rows: Row[] = [];

  constructor(
    readonly id: string,
    readonly mirrored: boolean,
    private readonly frames: readonly SignFrame[],
  ) {}

  reset(): void {
    this.rows = [];
  }

  /** The best match of the whole template that ends at this tick. */
  step(u: SignFrame, tick: number): { cost: number; start: number } {
    const m = this.frames.length;
    const row: Row = {
      c: new Float64Array(m).fill(Infinity),
      z: new Float64Array(m).fill(Infinity),
      sc: new Int32Array(m),
      sz: new Int32Array(m),
    };
    for (let j = 0; j < m; j++) {
      const d = frameDistance(u, this.frames[j]);
      if (j === 0) {
        row.c[0] = d;
        row.sc[0] = tick;
        continue;
      }
      // Normal step: the previous template frame was paired 1…MAX_STEP ticks ago.
      let prev = Infinity;
      let start = tick;
      for (const r of this.rows) {
        if (r.c[j - 1] < prev) {
          prev = r.c[j - 1];
          start = r.sc[j - 1];
        }
        if (r.z[j - 1] < prev) {
          prev = r.z[j - 1];
          start = r.sz[j - 1];
        }
      }
      row.c[j] = prev + d;
      row.sc[j] = start;
      // Repeat step, never twice in a row: so at most 2× faster than the video.
      row.z[j] = row.c[j - 1] + d;
      row.sz[j] = row.sc[j - 1];
    }
    this.rows.unshift(row);
    if (this.rows.length > MAX_STEP) this.rows.pop();
    const viaRepeat = row.z[m - 1] < row.c[m - 1];
    return {
      cost: (viaRepeat ? row.z[m - 1] : row.c[m - 1]) / m,
      start: viaRepeat ? row.sz[m - 1] : row.sc[m - 1],
    };
  }
}

export interface SignCandidate {
  id: string;
  /** 0…1 — how close the sign is to being accepted. */
  progress: number;
  /** Already committed and still being held. */
  blocked: boolean;
}

export interface SignCommit {
  id: string;
  /** How many of the previous sign commits this one replaces (they were parts of it). */
  replaces: number;
}

export interface SignResult {
  candidate: SignCandidate | null;
  commit: SignCommit | null;
}

interface Committed {
  id: string;
  start: number;
  end: number;
  cost: number;
}

export class SignSpotter {
  private readonly tracks: Track[];
  private readonly tickMs: number;
  /** Recent camera frames, for velocities. */
  private history: SignFrame[] = [];
  private nextTickAt = -Infinity;
  private tick = 0;
  private noHandTicks = 0;
  private pending: { id: string; ticks: number } | null = null;
  /** Committed signs that cannot be committed again yet → ticks spent away. */
  private blocked = new Map<string, number>();
  private commits: Committed[] = [];
  private candidate: SignCandidate | null = null;

  constructor(model: SignModel) {
    this.tickMs = model.tickMs;
    this.tracks = model.templates.flatMap((t) => [
      new Track(t.id, false, t.frames),
      new Track(t.id, true, t.frames.map(mirrorFrame)),
    ]);
  }

  get size(): number {
    return this.tracks.length / 2;
  }

  reset(): void {
    for (const track of this.tracks) track.reset();
    this.history = [];
    this.nextTickAt = -Infinity;
    this.noHandTicks = 0;
    this.pending = null;
    this.blocked.clear();
    this.commits = [];
    this.candidate = null;
  }

  /** Feeds one camera frame. Matching runs at a fixed rate whatever the camera's frame rate. */
  push(t: number, hands: readonly HandFeatures[], face: FaceBox | null, dominant: HandSide): SignResult {
    const frame = signFrame(t, hands, face);
    let earlier: SignFrame | null = null;
    for (let i = this.history.length - 1; i >= 0 && !earlier; i--) {
      if (this.history[i].t <= t - VELOCITY_LAG_MS) earlier = this.history[i];
    }
    setVelocity(frame, earlier);
    this.history.push(frame);
    while (this.history.length && this.history[0].t < t - 4 * VELOCITY_LAG_MS) this.history.shift();

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
    let best = { id: '', cost: Infinity, start: tick };
    for (const track of this.tracks) {
      const match = track.step(frame, tick);
      const cost = match.cost * (track.mirrored === (dominant === 'right') ? OTHER_HAND_PENALTY : 1);
      if (cost < (costs.get(track.id) ?? Infinity)) costs.set(track.id, cost);
      if (cost < best.cost) best = { id: track.id, cost, start: match.start };
    }

    for (const [id, away] of this.blocked) {
      const ticks = (costs.get(id) ?? Infinity) > SIGN_RELEASE ? away + 1 : 0;
      if (ticks >= RELEASE_TICKS || this.noHandTicks >= RELEASE_NO_HANDS_TICKS) this.blocked.delete(id);
      else this.blocked.set(id, ticks);
    }

    if (this.blocked.has(best.id)) {
      this.pending = null;
      this.candidate = { id: best.id, progress: 1, blocked: true };
      return null;
    }
    this.candidate =
      best.cost < SIGN_SHOW
        ? { id: best.id, progress: Math.min(0.9, (SIGN_SHOW - best.cost) / (SIGN_SHOW - SIGN_ACCEPT)), blocked: false }
        : null;
    if (best.cost >= SIGN_ACCEPT || tick - best.start + 1 < MIN_SPAN_TICKS) {
      this.pending = null;
      return null;
    }
    this.pending = this.pending?.id === best.id ? { id: best.id, ticks: this.pending.ticks + 1 } : { id: best.id, ticks: 1 };
    if (this.pending.ticks < CONFIRM_TICKS) return null;
    this.pending = null;

    // The same camera frames cannot be two signs: of overlapping matches keep the better one.
    let k = this.commits.length;
    while (k > 0 && best.start <= this.commits[k - 1].end + GAP_TICKS) k--;
    const overlapping = this.commits.slice(k);
    if (overlapping.some((o) => o.id === best.id)) return null;
    if (overlapping.length && best.cost >= Math.min(...overlapping.map((o) => o.cost)) * PREFER_LATER) return null;

    this.commits.splice(k, overlapping.length, { id: best.id, start: best.start, end: tick, cost: best.cost });
    if (this.commits.length > KEEP_COMMITS) this.commits.shift();
    for (const o of overlapping) this.blocked.delete(o.id);
    this.blocked.set(best.id, 0);
    this.candidate = { id: best.id, progress: 1, blocked: true };
    return { id: best.id, replaces: overlapping.length };
  }
}
