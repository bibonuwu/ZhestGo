/** Kazakh sound rules that decide which variant of a suffix to use. */

export type Harmony = 'back' | 'front';

const BACK_VOWELS = 'аоұыя';
const FRONT_VOWELS = 'әөүіеэ';
/** Letters that are always vowels. у/и/ю are left out: word-finally they act as consonants (w, j). */
const VOWELS = 'аәеёоөұүыіэя';
const VOICELESS = 'кқпстфхцчшщһ';
const NASALS = 'мнң';

/** Vowel harmony of a word, decided by its last back or front vowel. */
export function harmonyOf(word: string): Harmony {
  const w = word.toLocaleLowerCase('kk');
  for (let i = w.length - 1; i >= 0; i--) {
    if (BACK_VOWELS.includes(w[i])) return 'back';
    if (FRONT_VOWELS.includes(w[i])) return 'front';
  }
  // Only и/у/ю: front if the word has к or г, otherwise back (су → суға).
  return /[кг]/.test(w) ? 'front' : 'back';
}

/** Last letter that matters for suffix choice (ь/ъ ignored). */
export function lastLetter(word: string): string {
  const w = word.trim().toLocaleLowerCase('kk').replace(/[ьъ]+$/, '');
  return w[w.length - 1] ?? '';
}

export const endsInVowel = (word: string): boolean => VOWELS.includes(lastLetter(word));
export const endsVoiceless = (word: string): boolean => VOICELESS.includes(lastLetter(word));
export const endsInNasal = (word: string): boolean => NASALS.includes(lastLetter(word));
/** ж, з and the borrowed voiced stops. */
export const endsVoicedObstruent = (word: string): boolean => 'жзбвгдғ'.includes(lastLetter(word));

/** Picks the back or front form of a suffix to match `word`. */
export const pick = (word: string, back: string, front: string): string => (harmonyOf(word) === 'back' ? back : front);

/** Word-final п/қ/к become voiced before a vowel-initial suffix: мектеп → мектебім. */
export function voiceFinal(word: string): string {
  const map: Record<string, string> = { п: 'б', қ: 'ғ', к: 'г' };
  const last = word[word.length - 1];
  return map[last] ? word.slice(0, -1) + map[last] : word;
}
