import type { Gram, NounKind, QuestionRole } from '../lang/kk/lexicon';
import type { Person } from '../lang/kk/morphology';

/** Grammar of each vocabulary word, keyed by word id. */
export interface WordGrammar {
  gram: Gram;
  /** What to say when the word is signed on its own. */
  alone?: string;
}

const pron = (person: Person): WordGrammar => ({ gram: { pos: 'pron', person } });
const noun = (kind?: NounKind, alone?: string): WordGrammar => ({ gram: kind ? { pos: 'noun', kind } : { pos: 'noun' }, alone });
const verb = (stem: string, extra: Omit<Extract<Gram, { pos: 'verb' }>, 'pos' | 'stem'> = {}, alone?: string): WordGrammar => ({
  gram: { pos: 'verb', stem, ...extra },
  alone,
});
const adj = (extra: Omit<Extract<Gram, { pos: 'adj' }>, 'pos'> = {}): WordGrammar => ({ gram: { pos: 'adj', ...extra } });
const time = (tense: 'past' | 'present' | 'future'): WordGrammar => ({ gram: { pos: 'time', tense } });
const q = (role: QuestionRole): WordGrammar => ({ gram: { pos: 'q', role } });
const phrase = (kind: Extract<Gram, { pos: 'phrase' }>['kind'], alone?: string, polite?: boolean): WordGrammar => ({
  gram: { pos: 'phrase', kind, ...(polite ? { polite } : {}) },
  alone,
});
const num: WordGrammar = { gram: { pos: 'num' } };
const quant: WordGrammar = { gram: { pos: 'quant' } };

export const GRAMMAR: Readonly<Record<string, WordGrammar>> = {
  // Greetings & courtesy
  salemetsiz: phrase('greeting'),
  salem: phrase('greeting'),
  sau_bol: phrase('greeting'),
  rakhmet: phrase('thanks'),
  keshiriniz: phrase('prefix'),
  otinemin: phrase('prefix', 'Өтінемін!', true),
  ia: phrase('answer', 'Иә.'),
  zhok: { gram: { pos: 'neg' }, alone: 'Жоқ.' },
  zharaidy: phrase('answer', 'Жарайды.'),
  kosh_keldiniz: phrase('greeting'),
  tanyskanyma: phrase('greeting'),
  kuttyktaimyn: phrase('greeting'),

  // People
  men: pron('1sg'),
  sen: pron('2sg'),
  siz: pron('2sgF'),
  ol: pron('3'),
  biz: pron('1pl'),
  olar: pron('3pl'),
  adam: noun('person'),
  dos: noun('kin'),
  ana: noun('kin'),
  ake: noun('kin'),
  bala: noun('kin'),
  otbasy: noun('kin'),
  esim: noun(),
  erkek: noun('person'),
  aiel: noun('person'),

  // Questions
  kim: q('who'),
  ne: q('what'),
  kaida: q('where'),
  kashan: q('when'),
  kalai: q('how'),
  kansha: q('howMany'),
  nege: q('why'),
  kandai: q('which'),

  // Needs
  komek: noun('need', 'Көмектесіңіз!'),
  kerek: { gram: { pos: 'modal' }, alone: 'Керек.' },
  su: noun('need'),
  tamak: noun('need'),
  darethana: noun('place', 'Маған дәретханаға бару керек.'),
  dariger: noun('person', 'Маған дәрігер керек.'),
  dari: noun('need'),
  auyrady: verb('ауыр', { infinitive: 'ауыру', progressive: true }),
  zhedel: noun('need', 'Жедел жәрдем шақырыңыз!'),
  toktanyz: phrase('command'),
  aksha: noun('need'),
  kitap: noun('need'),

  // Actions
  baru: verb('бар', { motion: 'to' }),
  kelu: verb('кел', { motion: 'come' }),
  ishu: verb('іш', { object: 'acc' }),
  zheu: verb('же', { object: 'acc' }),
  uiyktau: verb('ұйықта'),
  soileu: verb('сөйле', { object: 'ins' }),
  tyndau: verb('тыңда', { object: 'acc' }),
  koru: verb('көр', { object: 'acc' }),
  karau: verb('қара', { object: 'dat' }),
  bilu: verb('біл', { object: 'acc' }),
  tusinu: verb('түсін', { object: 'acc' }),
  zhazu: verb('жаз', { object: 'dat' }),
  oku: verb('оқы', { object: 'acc' }),
  zhumys: noun('place'),
  kutu: verb('күт', { object: 'acc' }),
  konyrau: verb('қоңырау шал', { object: 'dat' }),
  oinau: verb('ойна', { object: 'ins' }),

  // Feelings & states
  zhaksy: adj(),
  zhaman: adj(),
  kuanyshtymyn: adj({ lemma: 'қуанышты' }),
  kaigyly: adj(),
  sharshadym: verb('шарша', { infinitive: 'шаршау', tense: 'past' }),
  ashyktym: verb('ашық', { infinitive: 'ашығу', tense: 'past' }),
  sholdedim: verb('шөлде', { infinitive: 'шөлдеу', tense: 'past' }),
  suyk: adj({ experiencer: true }),
  ystyk: adj({ experiencer: true }),
  korkamyn: verb('қорық', { presentStem: 'қорқ', infinitive: 'қорқу' }),
  zhaksy_koremin: verb('жақсы көр', { infinitive: 'жақсы көру', object: 'acc' }),

  // Time
  bugin: time('present'),
  erten: time('future'),
  keshe: time('past'),
  kazir: time('present'),
  keiin: time('future'),
  uakyt: noun('time'),
  kun: { gram: { pos: 'noun', kind: 'time', adverb: 'күндіз' } },
  tun: { gram: { pos: 'noun', kind: 'time', adverb: 'түнде' } },
  tan: { gram: { pos: 'noun', kind: 'time', adverb: 'таңертең' } },
  kesh: { gram: { pos: 'noun', kind: 'time', adverb: 'кешке' } },
  apta: noun('time'),
  ai: noun('time'),
  zhyl: noun('time'),

  // Places
  ui: noun('place'),
  mektep: noun('place'),
  aurukhana: noun('place'),
  duken: noun('place'),
  koshe: noun('place'),
  avtobus: noun('vehicle'),
  kala: noun('place'),
  munda: { gram: { pos: 'here' } },

  // Food
  nan: noun('need'),
  shai: noun('need'),
  sut: noun('need'),
  et: noun('need'),

  // Describing
  ulken: adj(),
  kishkentai: adj(),
  kop: quant,
  az: quant,
  tagy: quant,

  // Animals
  it: noun(),
  mysyk: noun(),
  balyk: noun(),
  kus: noun(),

  // Colours
  kyzyl: adj(),
  kok: adj(),
  zhasyl: adj(),
  ak: adj(),
  kara: adj(),
  sary: adj(),

  // Numbers
  bir: num,
  eki: num,
  ush: num,
  tort: num,
  bes: num,
};
