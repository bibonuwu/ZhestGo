/**
 * Next-word prediction: a small bigram model built from everyday phrases and
 * from the phrases this user has actually said (weighted higher, so the
 * suggestions adapt to the person over time). Runs fully offline.
 */

/** One-tap phrases for the quick board (word ids, composed by the grammar engine). */
export const QUICK_PHRASES: readonly (readonly string[])[] = [
  ['komek'],
  ['men', 'su', 'ishu', 'kerek'],
  ['keshiriniz', 'darethana', 'kaida'],
  ['men', 'dariger', 'kerek'],
  ['men', 'tusinu', 'zhok'],
  ['otinemin', 'kutu'],
  ['rakhmet'],
  ['men', 'sharshadym'],
  ['men', 'ashyktym'],
  ['men', 'ui', 'baru', 'kerek'],
  ['siz', 'kalai'],
  ['zhedel'],
];

/** Typical sentences that seed the model before the user has any history. */
const SEED: readonly (readonly string[])[] = [
  ...QUICK_PHRASES,
  ['salemetsiz'],
  ['salem', 'dos'],
  ['rakhmet', 'dos'],
  ['men', 'zhaksy'],
  ['men', 'su', 'kerek'],
  ['men', 'tamak', 'kerek'],
  ['men', 'dari', 'kerek'],
  ['men', 'uiyktau', 'kerek'],
  ['men', 'darethana', 'baru', 'kerek'],
  ['men', 'ana', 'konyrau', 'kerek'],
  ['men', 'ui', 'baru'],
  ['men', 'mektep', 'baru'],
  ['men', 'zhumys', 'baru'],
  ['men', 'erten', 'kelu'],
  ['erten', 'men', 'zhumys', 'baru'],
  ['keshe', 'men', 'dariger', 'baru'],
  ['men', 'auyrady'],
  ['men', 'sholdedim'],
  ['men', 'korkamyn'],
  ['men', 'suyk'],
  ['men', 'bilu', 'zhok'],
  ['men', 'siz', 'kutu'],
  ['men', 'siz', 'zhaksy_koremin'],
  ['men', 'shai', 'ishu'],
  ['men', 'nan', 'zheu'],
  ['siz', 'kaida', 'baru'],
  ['siz', 'ne', 'kerek'],
  ['siz', 'kashan', 'kelu'],
  ['siz', 'kaida'],
  ['ana', 'kaida'],
  ['ana', 'auyrady'],
  ['bala', 'uiyktau'],
  ['kansha', 'aksha'],
  ['ia', 'rakhmet'],
  ['zhok', 'rakhmet'],
];

const START = '^';
const HISTORY_WEIGHT = 3;
const BACKOFF = 0.08;

export class WordPredictor {
  private readonly bigrams = new Map<string, Map<string, number>>();
  private readonly unigrams = new Map<string, number>();
  private unigramTotal = 0;

  constructor(sequences: Iterable<{ ids: readonly string[]; weight: number }>) {
    for (const { ids, weight } of sequences) {
      let prev = START;
      for (const id of ids) {
        const row = this.bigrams.get(prev) ?? new Map<string, number>();
        row.set(id, (row.get(id) ?? 0) + weight);
        this.bigrams.set(prev, row);
        this.unigrams.set(id, (this.unigrams.get(id) ?? 0) + weight);
        this.unigramTotal += weight;
        prev = id;
      }
    }
  }

  /** Most likely next words after `context` (word ids), best first. */
  suggest(context: readonly string[], count = 6, known?: (id: string) => boolean): string[] {
    const prev = context[context.length - 1] ?? START;
    const scores = new Map<string, number>();
    const row = this.bigrams.get(prev);
    if (row) {
      const total = [...row.values()].reduce((a, b) => a + b, 0);
      for (const [id, n] of row) scores.set(id, n / total);
    }
    for (const [id, n] of this.unigrams) {
      scores.set(id, (scores.get(id) ?? 0) + (BACKOFF * n) / this.unigramTotal);
    }
    const used = new Set(context);
    return [...scores.entries()]
      .filter(([id]) => id !== prev && !(used.has(id) && id !== 'kerek') && (!known || known(id)))
      .sort((a, b) => b[1] - a[1])
      .slice(0, count)
      .map(([id]) => id);
  }
}

export function buildPredictor(history: readonly { words?: readonly string[] }[]): WordPredictor {
  return new WordPredictor([
    ...SEED.map((ids) => ({ ids, weight: 1 })),
    ...history.flatMap((p) => (p.words?.length ? [{ ids: p.words, weight: HISTORY_WEIGHT }] : [])),
  ]);
}

/** Phrases the user says most often (said at least twice), most frequent first. */
export function frequentPhrases<T extends { text: string; at: number }>(history: readonly T[], count = 4): T[] {
  const byText = new Map<string, { phrase: T; n: number }>();
  for (const p of history) {
    const entry = byText.get(p.text);
    if (entry) entry.n++;
    else byText.set(p.text, { phrase: p, n: 1 });
  }
  return [...byText.values()]
    .filter((e) => e.n >= 2)
    .sort((a, b) => b.n - a.n || b.phrase.at - a.phrase.at)
    .slice(0, count)
    .map((e) => e.phrase);
}
