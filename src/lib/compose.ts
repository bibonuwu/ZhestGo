import type { LexItem } from '../lang/kk/lexicon';
import { composeKazakh } from '../lang/kk/sentence';

/**
 * Offline sentence builder: applies Kazakh grammar (cases, possessives,
 * conjugation, negation, word order) to the signed words. Works without a
 * network; the optional AI composer on the server is only a refinement.
 */
export function composeLocal(words: readonly LexItem[]): string {
  return composeKazakh(words);
}
