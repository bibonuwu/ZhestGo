import {
  endsInNasal,
  endsInVowel,
  endsVoicedObstruent,
  endsVoiceless,
  harmonyOf,
  lastLetter,
  pick,
  voiceFinal,
} from './phonology';

/** Grammatical person. 2sgF is the polite "сіз". */
export type Person = '1sg' | '2sg' | '2sgF' | '3' | '1pl' | '3pl';
export type Case = 'nom' | 'gen' | 'dat' | 'acc' | 'loc' | 'abl' | 'ins';

// ── Nouns ────────────────────────────────────────────────────────────────

export function plural(word: string): string {
  const c = lastLetter(word);
  if (endsInVowel(word) || 'рйуи'.includes(c)) return word + pick(word, 'лар', 'лер');
  if (endsVoiceless(word)) return word + pick(word, 'тар', 'тер');
  return word + pick(word, 'дар', 'дер');
}

/** Case ending for a bare (non-possessed) noun. */
export function nounCase(word: string, kase: Case): string {
  const vowel = endsInVowel(word);
  const voiceless = endsVoiceless(word);
  switch (kase) {
    case 'nom':
      return word;
    case 'gen':
      if (vowel || endsInNasal(word)) return word + pick(word, 'ның', 'нің');
      return word + (voiceless ? pick(word, 'тың', 'тің') : pick(word, 'дың', 'дің'));
    case 'dat':
      return word + (voiceless ? pick(word, 'қа', 'ке') : pick(word, 'ға', 'ге'));
    case 'acc':
      if (vowel) return word + pick(word, 'ны', 'ні');
      return word + (voiceless ? pick(word, 'ты', 'ті') : pick(word, 'ды', 'ді'));
    case 'loc':
      return word + (voiceless ? pick(word, 'та', 'те') : pick(word, 'да', 'де'));
    case 'abl':
      if (voiceless) return word + pick(word, 'тан', 'тен');
      if (endsInNasal(word)) return word + pick(word, 'нан', 'нен');
      return word + pick(word, 'дан', 'ден');
    case 'ins':
      if (voiceless) return `${word}пен`;
      if (endsVoicedObstruent(word)) return `${word}бен`;
      return `${word}мен`;
  }
}

/** Possessive ending: ана → анам (1sg), анаңыз (2sgF), анасы (3). */
export function possessive(word: string, person: Person): string {
  const vowel = endsInVowel(word);
  const stem = vowel ? word : voiceFinal(word);
  const h = harmonyOf(word);
  const v = (back: string, front: string) => (h === 'back' ? back : front);
  switch (person) {
    case '1sg':
      return stem + (vowel ? 'м' : v('ым', 'ім'));
    case '2sg':
      return stem + (vowel ? 'ң' : v('ың', 'ің'));
    case '2sgF':
      return stem + (vowel ? v('ңыз', 'ңіз') : v('ыңыз', 'іңіз'));
    case '1pl':
      return stem + (vowel ? v('мыз', 'міз') : v('ымыз', 'іміз'));
    case '3':
    case '3pl':
      return stem + (vowel ? v('сы', 'сі') : v('ы', 'і'));
  }
}

/** Case ending on an already possessed noun (анам → анама, анасы → анасына). */
export function possessedCase(possessed: string, person: Person, kase: Case): string {
  if (kase === 'nom') return possessed;
  const third = person === '3' || person === '3pl';
  if (third) {
    switch (kase) {
      case 'dat':
        return possessed + pick(possessed, 'на', 'не');
      case 'loc':
        return possessed + pick(possessed, 'нда', 'нде');
      case 'abl':
        return possessed + pick(possessed, 'нан', 'нен');
      case 'acc':
        return `${possessed}н`;
      default:
        return nounCase(possessed, kase);
    }
  }
  if (kase === 'dat' && (person === '1sg' || person === '2sg')) return possessed + pick(possessed, 'а', 'е');
  return nounCase(possessed, kase);
}

// ── Pronouns ─────────────────────────────────────────────────────────────

const PRONOUNS: Record<Person, Record<Case, string>> = {
  '1sg': { nom: 'мен', gen: 'менің', dat: 'маған', acc: 'мені', loc: 'менде', abl: 'менен', ins: 'менімен' },
  '2sg': { nom: 'сен', gen: 'сенің', dat: 'саған', acc: 'сені', loc: 'сенде', abl: 'сенен', ins: 'сенімен' },
  '2sgF': { nom: 'сіз', gen: 'сіздің', dat: 'сізге', acc: 'сізді', loc: 'сізде', abl: 'сізден', ins: 'сізбен' },
  '3': { nom: 'ол', gen: 'оның', dat: 'оған', acc: 'оны', loc: 'онда', abl: 'одан', ins: 'онымен' },
  '1pl': { nom: 'біз', gen: 'біздің', dat: 'бізге', acc: 'бізді', loc: 'бізде', abl: 'бізден', ins: 'бізбен' },
  '3pl': { nom: 'олар', gen: 'олардың', dat: 'оларға', acc: 'оларды', loc: 'оларда', abl: 'олардан', ins: 'олармен' },
};

export const pronoun = (person: Person, kase: Case = 'nom'): string => PRONOUNS[person][kase];

// ── Predicates ───────────────────────────────────────────────────────────

/** "I am …" endings for nouns and adjectives: жақсымын, дәрігермін, қазақпын, қайдасыз. */
export function predicate(word: string, person: Person): string {
  const c = lastLetter(word);
  const m = endsVoiceless(word) ? 'п' : endsVoicedObstruent(word) && c !== 'ғ' ? 'б' : 'м';
  switch (person) {
    case '1sg':
      return word + m + pick(word, 'ын', 'ін');
    case '2sg':
      return word + pick(word, 'сың', 'сің');
    case '2sgF':
      return word + pick(word, 'сыз', 'сіз');
    case '1pl':
      return word + m + pick(word, 'ыз', 'із');
    case '3':
    case '3pl':
      return word;
  }
}

/** Negated predicate: жақсы емеспін, үлкен емес. */
export const negatedPredicate = (word: string, person: Person): string => `${word} ${predicate('емес', person)}`;

// ── Verbs ────────────────────────────────────────────────────────────────

export interface VerbForms {
  /** Stem: бар, іш, же, оқы, қоңырау шал. */
  stem: string;
  /** Stem used before the present-tense vowel when it differs (қорық → қорқ-амын). */
  presentStem?: string;
}

/** Negation affix -ма/-ба/-па chosen by the stem's last sound. */
function negation(stem: string): string {
  const c = lastLetter(stem);
  if (endsInVowel(stem) || 'рйулиу'.includes(c)) return pick(stem, 'ма', 'ме');
  if (endsVoiceless(stem)) return pick(stem, 'па', 'пе');
  return pick(stem, 'ба', 'бе');
}

const PRESENT_ENDINGS: Record<Person, [string, string]> = {
  '1sg': ['мын', 'мін'],
  '2sg': ['сың', 'сің'],
  '2sgF': ['сыз', 'сіз'],
  '3': ['ды', 'ді'],
  '1pl': ['мыз', 'міз'],
  '3pl': ['ды', 'ді'],
};

const PAST_ENDINGS: Record<Person, [string, string]> = {
  '1sg': ['м', 'м'],
  '2sg': ['ң', 'ң'],
  '2sgF': ['ңыз', 'ңіз'],
  '3': ['', ''],
  '1pl': ['қ', 'к'],
  '3pl': ['', ''],
};

const ending = (stem: string, table: Record<Person, [string, string]>, person: Person) =>
  harmonyOf(stem) === 'back' ? table[person][0] : table[person][1];

/** Present-future tense: барамын, ішеді, жеймін, оқимын; negative: бармаймын. */
export function presentTense(verb: VerbForms, person: Person, negative = false): string {
  if (negative) return `${verb.stem}${negation(verb.stem)}й${ending(verb.stem, PRESENT_ENDINGS, person)}`;
  const stem = verb.presentStem ?? verb.stem;
  let base: string;
  if (endsInVowel(stem)) {
    // оқы + й → оқи
    base = /[ыі]$/.test(stem) ? `${stem.slice(0, -1)}и` : `${stem}й`;
  } else {
    base = stem + pick(stem, 'а', 'е');
  }
  return base + ending(verb.stem, PRESENT_ENDINGS, person);
}

/** Definite past: бардым, іштім, келмедік. */
export function pastTense(verb: VerbForms, person: Person, negative = false): string {
  const base = negative ? verb.stem + negation(verb.stem) : verb.stem;
  const past = endsVoiceless(base) ? pick(base, 'ты', 'ті') : pick(base, 'ды', 'ді');
  return base + past + ending(verb.stem, PAST_ENDINGS, person);
}

/** Continuous state with "тұр": ауырып тұрмын. */
export function continuousTense(verb: VerbForms, person: Person): string {
  const converb = verb.stem + (endsInVowel(verb.stem) ? 'п' : pick(verb.stem, 'ып', 'іп'));
  const aux = person === '3' || person === '3pl' ? 'тұр' : `тұр${PRESENT_ENDINGS[person][0]}`;
  return `${converb} ${aux}`;
}

/** Polite imperative: барыңыз, күтіңіз, жеңіз; negative: бармаңыз. */
export function politeImperative(verb: VerbForms, negative = false): string {
  const base = negative ? verb.stem + negation(verb.stem) : verb.stem;
  if (endsInVowel(base)) return base + pick(base, 'ңыз', 'ңіз');
  return voiceFinal(base) + pick(base, 'ыңыз', 'іңіз');
}
