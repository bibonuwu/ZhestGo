/**
 * Kazakh syllables (буын) for the lessons: “сәлем” → сә•лем.
 *
 * Every syllable has one vowel. Between two vowels a single consonant starts
 * the next syllable (кө-мек), of a cluster only the last one does (мек-теп,
 * айт-ты). у and и are vowels after a consonant (ба-ру, су-ық, ки-ім) and
 * consonants (w, j) after a vowel (қа-рау, а-уы-ра-ды); у also at the start
 * of a word before a vowel (уа-қыт).
 */

const VOWELS = 'аәеёоөұүыіэюя';
const SIGNS = 'ьъ';

function isVowelAt(w: string, i: number): boolean {
  const c = w[i];
  if (VOWELS.includes(c)) return true;
  if (c !== 'у' && c !== 'и') return false;
  const afterVowel = i > 0 && isVowelAt(w, i - 1);
  if (afterVowel) return false;
  return !(c === 'у' && i === 0 && i + 1 < w.length && VOWELS.includes(w[i + 1]));
}

/** One word split into syllables, letter case kept. Text without vowels stays whole. */
export function syllables(word: string): string[] {
  const w = word.toLocaleLowerCase('kk');
  const vowels = [...w].map((_, i) => i).filter((i) => isVowelAt(w, i));
  if (vowels.length < 2) return [word];

  const parts: string[] = [];
  let start = 0;
  for (let k = 1; k < vowels.length; k++) {
    const prev = vowels[k - 1];
    const next = vowels[k];
    // The consonant just before the vowel goes with it; ь/ъ never start a syllable.
    let cut = Math.max(prev + 1, next - 1);
    while (cut < next && SIGNS.includes(w[cut])) cut++;
    parts.push(word.slice(start, cut));
    start = cut;
  }
  parts.push(word.slice(start));
  return parts;
}
