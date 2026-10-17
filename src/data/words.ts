import { useTraining, type UserWord } from '../store/training';
import type { Lang } from './gestureText';
import { SIGN_BY_WORD } from './signs';
import { TEMPLATE_WORDS, VOCABULARY, WORDS_BY_ID, type WordEntry } from './vocabulary';

/** A built-in word, or a word the user added in an earlier version of the app. */
export type AnyWord =
  | WordEntry
  | (UserWord & { category: 'custom'; en?: undefined; gesture?: undefined; question?: undefined; hint?: undefined });

/**
 * The words the site offers: those with a video lesson. The other words of
 * the vocabulary stay for the grammar and for old phrases in the history.
 */
export const LESSON_WORDS: readonly WordEntry[] = VOCABULARY.filter((w) => SIGN_BY_WORD.has(w.id));

export const isLessonWord = (id: string): boolean => SIGN_BY_WORD.has(id);

/** Qoldau's simplified gestures of the lesson words (the "templates" recognition mode). */
export const LESSON_TEMPLATE_WORDS = TEMPLATE_WORDS.filter((w) => isLessonWord(w.id));

/** Translation shown under the Kazakh word. User words have a single translation field (`ru`). */
export const glossOf = (word: AnyWord, lang: Lang): string => (lang === 'en' ? (word.en ?? word.ru) : word.ru);

/** Whether the word matches a search in any of its languages. */
export const matchesQuery = (word: AnyWord, q: string): boolean =>
  [word.kk, word.ru, word.en].some((s) => s?.toLocaleLowerCase().includes(q));

export function lookupWord(id: string, userWords: readonly UserWord[] = useTraining.getState().userWords): AnyWord | undefined {
  const builtIn = WORDS_BY_ID.get(id);
  if (builtIn) return builtIn;
  const user = userWords.find((w) => w.id === id);
  return user ? { ...user, category: 'custom' } : undefined;
}

export const capitalize = (s: string): string => (s ? s[0].toLocaleUpperCase('kk') + s.slice(1) : s);
