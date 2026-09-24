import { useTraining, type UserWord } from '../store/training';
import { VOCABULARY, WORDS_BY_ID, type WordEntry } from './vocabulary';

/** A built-in word (with a template gesture) or a word the user added. */
export type AnyWord = WordEntry | (UserWord & { category: 'custom'; gesture?: undefined; question?: undefined; hint?: undefined });

export function lookupWord(id: string, userWords: readonly UserWord[] = useTraining.getState().userWords): AnyWord | undefined {
  const builtIn = WORDS_BY_ID.get(id);
  if (builtIn) return builtIn;
  const user = userWords.find((w) => w.id === id);
  return user ? { ...user, category: 'custom' } : undefined;
}

export function useAllWords(): AnyWord[] {
  const userWords = useTraining((s) => s.userWords);
  return [...VOCABULARY, ...userWords.map((w) => ({ ...w, category: 'custom' as const }))];
}

export const capitalize = (s: string): string => (s ? s[0].toLocaleUpperCase('kk') + s.slice(1) : s);
