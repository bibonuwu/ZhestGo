import { assignHands, handRelation } from './hand';
import { buildFeatureVector, type KnnModel } from './knn';
import { bestMatch, isStillSpec, signatureOf, type SpecEntry } from './matcher';
import { MotionTracker, type MotionSummary } from './motion';
import type { FaceBox, HandFeatures, HandSide, Observation, Relation } from './types';

export type RecognitionMode = 'both' | 'templates' | 'custom';
export type CandidateSource = 'template' | 'custom';

export interface RecognizerOptions {
  /** How long a static gesture must be held, ms. */
  holdMs: number;
  mode: RecognitionMode;
  dominant: HandSide;
}

export interface Candidate {
  wordId: string;
  source: CandidateSource;
  /** 0…1 — how close the candidate is to being committed. */
  progress: number;
  /** Already committed and waiting for the hand to change. */
  blocked: boolean;
}

export interface CommitEvent {
  wordId: string;
  source: CandidateSource;
  /** The new word replaces the previous one (see SUPERSEDE_WINDOW_MS). */
  replaceLast: boolean;
}

export interface RecognizerFrame {
  t: number;
  hands: readonly HandFeatures[];
  face: FaceBox | null;
}

export interface RecognizerOutput {
  observation: Observation;
  dom: HandFeatures | null;
  nonDom: HandFeatures | null;
  motion: MotionSummary | null;
  candidate: Candidate | null;
  commit: CommitEvent | null;
  locked: boolean;
  /** How long no hand has been visible, ms. */
  handsAbsentFor: number;
  /** Feature vector for training / custom recognition. */
  features: number[] | null;
}

/** Template candidates must persist this long before they are committed. */
const CONFIRM_MS = 150;
/** Minimum gap between two commits. */
const MIN_GAP_MS = 350;
const LOCK_RELEASE_NO_HANDS_MS = 300;
const LOCK_RELEASE_CHANGE_MS = 250;
/**
 * A still gesture followed quickly by a moving (or two-handed) gesture that
 * starts from the same hand is treated as the signer "setting up" — the
 * later, more specific gesture replaces the accidental one.
 */
const SUPERSEDE_WINDOW_MS = 1500;
const TRACKER_RESET_MS = 300;
const RELATION_WINDOW_MS = 600;
const RELATION_TOGETHER_SHARE = 0.35;

interface Current {
  wordId: string;
  source: CandidateSource;
  still: boolean;
  twoHanded: boolean;
  since: number;
}

interface Lock {
  wordId: string;
  signature: string;
  changedSince: number | null;
}

interface LastCommit {
  wordId: string;
  at: number;
  still: boolean;
  twoHanded: boolean;
  domShape: string | null;
}

export class Recognizer {
  private readonly trackers: Record<HandSide, MotionTracker> = { left: new MotionTracker(), right: new MotionTracker() };
  private readonly lastSeen: Record<HandSide, number> = { left: -Infinity, right: -Infinity };
  private relationHistory: { t: number; together: boolean }[] = [];
  private current: Current | null = null;
  private lock: Lock | null = null;
  private last: LastCommit | null = null;
  private lastHandsAt = -Infinity;
  private byId = new Map<string, SpecEntry>();

  constructor(
    private entries: readonly SpecEntry[],
    public options: RecognizerOptions,
    public knn: KnnModel | null = null,
  ) {
    this.setEntries(entries);
  }

  setEntries(entries: readonly SpecEntry[]): void {
    this.entries = entries;
    this.byId = new Map(entries.map((e) => [e.id, e]));
  }

  reset(): void {
    this.trackers.left.reset();
    this.trackers.right.reset();
    this.relationHistory = [];
    this.current = null;
    this.lock = null;
    this.last = null;
  }

  process(frame: RecognizerFrame): RecognizerOutput {
    const { t, face } = frame;
    const { holdMs, mode } = this.options;
    const { dom, nonDom } = assignHands(frame.hands, this.options.dominant);

    for (const hand of [dom, nonDom]) {
      if (!hand) continue;
      const unit = face?.w ?? hand.scale * 1.6;
      this.trackers[hand.side].push({
        t,
        x: hand.tip.x / unit,
        y: hand.tip.y / unit,
        shape: hand.shape,
        dir: hand.dir,
        location: hand.location,
      });
      this.lastSeen[hand.side] = t;
    }
    for (const side of ['left', 'right'] as const) {
      if (t - this.lastSeen[side] > TRACKER_RESET_MS) this.trackers[side].reset();
    }
    if (dom) this.lastHandsAt = t;

    const domMotion = dom ? this.trackers[dom.side].summarize(holdMs) : null;
    const nonDomMotion = nonDom ? this.trackers[nonDom.side].summarize(holdMs) : null;
    const relation = this.updateRelation(t, dom, nonDom);

    const observation: Observation = {
      hands: frame.hands.length,
      motion: domMotion?.motion ?? 'moving',
      dom: domMotion ? { shape: domMotion.shape, dir: domMotion.dir, location: domMotion.location } : null,
      nonDom: nonDom ? { shape: nonDomMotion?.shape ?? nonDom.shape, dir: nonDom.dir, location: nonDom.location } : null,
      relation,
    };
    const features = dom && domMotion ? buildFeatureVector(dom, nonDom, domMotion, face) : null;

    // 1. Find what the hands are showing right now.
    let found: Omit<Current, 'since'> | null = null;
    if (mode !== 'templates' && this.knn && features) {
      const result = this.knn.classify(features);
      if (result) {
        const spec = this.byId.get(result.label)?.gesture;
        found = {
          wordId: result.label,
          source: 'custom',
          still: spec ? isStillSpec(spec) : observation.motion === 'still' || observation.motion === 'moving',
          twoHanded: nonDom !== null,
        };
      }
    }
    // The observation the match was made on (may be the other hand, see below).
    let matched = observation;
    if (!found && mode !== 'custom') {
      let match = bestMatch(this.entries, observation);
      if (!match && nonDom && nonDomMotion && relation === 'apart') {
        // The dominant hand shows nothing (resting, or handedness was misread):
        // read one-handed signs from the other hand.
        const other: Observation = {
          hands: observation.hands,
          motion: nonDomMotion.motion,
          dom: { shape: nonDomMotion.shape, dir: nonDomMotion.dir, location: nonDomMotion.location },
          nonDom: null,
          relation: null,
        };
        match = bestMatch(this.entries, other);
        if (match) matched = other;
      }
      if (match) {
        found = {
          wordId: match.entry.id,
          source: 'template',
          still: isStillSpec(match.entry.gesture),
          twoHanded: Boolean(match.entry.gesture.second),
        };
      }
    }

    if (!found) this.current = null;
    else if (this.current?.wordId !== found.wordId) this.current = { ...found, since: t };

    // 2. Keep repeated frames of the same sign from producing repeated words.
    const signature = signatureOf(matched);
    this.updateLock(t, dom !== null, signature);

    // 3. Commit once the candidate has been stable long enough.
    let candidate: Candidate | null = null;
    let commit: CommitEvent | null = null;
    const cur = this.current;
    if (cur) {
      const elapsed = t - cur.since;
      const need = cur.source === 'custom' ? holdMs : CONFIRM_MS;
      const blocked = this.isBlocked(cur, signature);
      const progress = blocked
        ? 1
        : cur.source === 'template' && cur.still
          ? Math.min(1, (holdMs + elapsed) / (holdMs + CONFIRM_MS))
          : Math.min(1, elapsed / need);
      candidate = { wordId: cur.wordId, source: cur.source, progress, blocked };
      if (!blocked && elapsed >= need && t - (this.last?.at ?? -Infinity) >= MIN_GAP_MS) {
        commit = this.commit(t, cur, matched, signature);
      }
    } else if (mode !== 'custom' && dom && domMotion && domMotion.motion === 'moving' && domMotion.stillFor > 0) {
      // Preview: which static sign is the hand settling into?
      const preview = bestMatch(this.entries, {
        ...observation,
        motion: 'still',
        dom: { shape: dom.shape, dir: dom.dir, location: dom.location },
      });
      if (preview && !(this.lock?.wordId === preview.entry.id)) {
        candidate = {
          wordId: preview.entry.id,
          source: 'template',
          progress: Math.min(0.95, domMotion.stillFor / (holdMs + CONFIRM_MS)),
          blocked: false,
        };
      }
    }

    return {
      observation,
      dom,
      nonDom,
      motion: domMotion,
      candidate,
      commit,
      locked: this.lock !== null,
      handsAbsentFor: dom ? 0 : t - this.lastHandsAt,
      features,
    };
  }

  private updateRelation(t: number, dom: HandFeatures | null, nonDom: HandFeatures | null): Relation | null {
    if (!dom || !nonDom) {
      this.relationHistory = [];
      return null;
    }
    this.relationHistory.push({ t, together: handRelation(dom, nonDom) === 'together' });
    this.relationHistory = this.relationHistory.filter((r) => r.t >= t - RELATION_WINDOW_MS);
    const together = this.relationHistory.filter((r) => r.together).length;
    return together / this.relationHistory.length >= RELATION_TOGETHER_SHARE ? 'together' : 'apart';
  }

  private updateLock(t: number, handsVisible: boolean, signature: string): void {
    const lock = this.lock;
    if (!lock) return;
    if (!handsVisible) {
      if (t - this.lastHandsAt >= LOCK_RELEASE_NO_HANDS_MS) this.lock = null;
      return;
    }
    if (signature === lock.signature) {
      lock.changedSince = null;
      return;
    }
    lock.changedSince ??= t;
    if (t - lock.changedSince >= LOCK_RELEASE_CHANGE_MS) this.lock = null;
  }

  private isBlocked(cur: Current, signature: string): boolean {
    if (!this.lock) return false;
    if (cur.wordId === this.lock.wordId) return true;
    // After a sign ends, the hand often rests in the same place: do not read
    // that rest as the static sign with the same hand configuration.
    return cur.still && signature === this.lock.signature;
  }

  private commit(t: number, cur: Current, observation: Observation, signature: string): CommitEvent {
    const domShape = observation.dom?.shape ?? null;
    const last = this.last;
    const replaceLast =
      last !== null &&
      last.wordId !== cur.wordId &&
      t - last.at <= SUPERSEDE_WINDOW_MS &&
      last.domShape === domShape &&
      ((last.still && !cur.still) || (!last.twoHanded && cur.twoHanded));

    this.last = { wordId: cur.wordId, at: t, still: cur.still, twoHanded: cur.twoHanded, domShape };
    this.lock = { wordId: cur.wordId, signature, changedSince: null };
    return { wordId: cur.wordId, source: cur.source, replaceLast };
  }
}
