import type { GestureSpec, Observation, ObservedHand } from './types';

export interface SpecEntry {
  id: string;
  gesture: GestureSpec;
}

/** Specificity: more constrained specs win over looser ones. */
export function specificity(spec: GestureSpec): number {
  let score = 10;
  if (spec.dir) score += 1;
  if (spec.location) score += 1;
  if (spec.second) score += 3 + (spec.second.relation ? 1 : 0);
  return score;
}

export const isStillSpec = (spec: GestureSpec): boolean => (spec.motion ?? 'still') === 'still';

function handMatches(spec: GestureSpec, hand: ObservedHand): boolean {
  if (hand.shape !== spec.shape) return false;
  if (spec.dir && hand.dir !== spec.dir) return false;
  if (spec.location && hand.location !== spec.location) return false;
  return true;
}

/** Returns the spec's specificity if it matches the observation, otherwise -1. */
export function matchSpec(spec: GestureSpec, obs: Observation): number {
  if (!obs.dom) return -1;
  if ((spec.motion ?? 'still') !== obs.motion) return -1;

  if (spec.second) {
    if (!obs.nonDom || !obs.relation) return -1;
    if (spec.second.relation && spec.second.relation !== obs.relation) return -1;
    const second = spec.second.shape;
    // Either hand may play either role — handedness labels are not perfectly reliable.
    const direct = handMatches(spec, obs.dom) && obs.nonDom.shape === second;
    const swapped =
      obs.nonDom.shape === spec.shape &&
      obs.dom.shape === second &&
      (!spec.location || obs.nonDom.location === spec.location || obs.dom.location === spec.location);
    return direct || swapped ? specificity(spec) : -1;
  }

  // Hands held together form a two-handed sign; one-handed specs stay out of it.
  if (obs.nonDom && obs.relation === 'together') return -1;
  return handMatches(spec, obs.dom) ? specificity(spec) : -1;
}

export function bestMatch<T extends SpecEntry>(entries: readonly T[], obs: Observation): { entry: T; score: number } | null {
  let best: { entry: T; score: number } | null = null;
  for (const entry of entries) {
    const score = matchSpec(entry.gesture, obs);
    if (score > (best?.score ?? -1)) best = { entry, score };
  }
  return best;
}

const compatible = <V>(a: V | undefined, b: V | undefined): boolean => a === undefined || b === undefined || a === b;

/** True when `a` constrains at least everything `b` does (a ⊆ b in match space). */
function refines(a: GestureSpec, b: GestureSpec): boolean {
  if (b.dir && a.dir !== b.dir) return false;
  if (b.location && a.location !== b.location) return false;
  if (b.second?.relation && a.second?.relation !== b.second.relation) return false;
  return true;
}

/**
 * Two specs conflict when some observation matches both with the same score
 * and neither is a strict refinement of the other — the winner would then
 * depend on list order. Used by tests to keep the vocabulary unambiguous.
 */
export function specsConflict(a: GestureSpec, b: GestureSpec): boolean {
  if ((a.motion ?? 'still') !== (b.motion ?? 'still')) return false;
  if (Boolean(a.second) !== Boolean(b.second)) return false;
  if (a.second && b.second) {
    const sameOrder = a.shape === b.shape && a.second.shape === b.second.shape;
    const swapped = a.shape === b.second.shape && a.second.shape === b.shape;
    if (!sameOrder && !swapped) return false;
    if (!compatible(a.second.relation, b.second.relation)) return false;
  } else if (a.shape !== b.shape) {
    return false;
  }
  if (!compatible(a.dir, b.dir) || !compatible(a.location, b.location)) return false;
  const aRefinesB = refines(a, b);
  const bRefinesA = refines(b, a);
  if (aRefinesB && bRefinesA) return true; // identical constraints
  if (aRefinesB) return specificity(a) <= specificity(b);
  if (bRefinesA) return specificity(b) <= specificity(a);
  return true; // each constrains something the other does not
}

/** Groups gestures that start from the same hand configuration. */
export function signatureOf(obs: Observation): string {
  return `${obs.dom?.shape ?? '-'}|${obs.dom?.location ?? '-'}|${obs.nonDom?.shape ?? '-'}`;
}
