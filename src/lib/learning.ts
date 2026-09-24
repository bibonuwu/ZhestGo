/**
 * Self-learning: the frames of every recognised gesture are remembered, and
 * when the sentence is spoken without that word being deleted, they become
 * training samples. Recognition then adapts to how this person actually signs.
 */
import type { Token } from '../store/session';
import { useSettings } from '../store/settings';
import { useTraining } from '../store/training';

/** Frames kept per confirmed word. */
const SAMPLES_PER_WORD = 10;

const pending = new Map<string, { wordId: string; vectors: number[][] }>();

/** Picks up to `count` frames spread evenly over the gesture. */
export function spread<T>(items: readonly T[], count: number): T[] {
  if (items.length <= count) return [...items];
  return Array.from({ length: count }, (_, i) => items[Math.round((i * (items.length - 1)) / (count - 1))]);
}

export function rememberGesture(tokenKey: string, wordId: string, vectors: readonly number[][]): void {
  if (vectors.length) pending.set(tokenKey, { wordId, vectors: spread(vectors, SAMPLES_PER_WORD) });
}

export function forgetGesture(tokenKey: string | undefined): void {
  if (tokenKey) pending.delete(tokenKey);
}

/** Called once a sentence is spoken: its gesture words were correct. */
export function learnFromConfirmed(tokens: readonly Token[], remainingKeys: readonly string[]): number {
  let learned = 0;
  const enabled = useSettings.getState().autoLearn;
  for (const t of tokens) {
    const p = pending.get(t.key);
    pending.delete(t.key);
    if (enabled && p && p.wordId === t.wordId && t.source === 'gesture') {
      useTraining.getState().addSamples(p.wordId, p.vectors);
      learned++;
    }
  }
  // Drop frames of words that were deleted before speaking.
  const alive = new Set(remainingKeys);
  for (const key of pending.keys()) if (!alive.has(key)) pending.delete(key);
  return learned;
}
