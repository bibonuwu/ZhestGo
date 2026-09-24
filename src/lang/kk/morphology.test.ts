import { describe, expect, it } from 'vitest';
import {
  continuousTense,
  nounCase,
  pastTense,
  plural,
  politeImperative,
  possessedCase,
  possessive,
  predicate,
  presentTense,
} from './morphology';
import { harmonyOf } from './phonology';

describe('phonology', () => {
  it('reads vowel harmony from the last vowel', () => {
    expect(harmonyOf('мектеп')).toBe('front');
    expect(harmonyOf('автобус')).toBe('back');
    expect(harmonyOf('су')).toBe('back');
    expect(harmonyOf('қоңырау шал')).toBe('back');
    expect(harmonyOf('жақсы көр')).toBe('front');
  });
});

describe('nouns', () => {
  it.each([
    ['үй', 'dat', 'үйге'],
    ['мектеп', 'dat', 'мектепке'],
    ['қала', 'dat', 'қалаға'],
    ['жұмыс', 'dat', 'жұмысқа'],
    ['дүкен', 'dat', 'дүкенге'],
    ['үй', 'loc', 'үйде'],
    ['мектеп', 'loc', 'мектепте'],
    ['жұмыс', 'loc', 'жұмыста'],
    ['дүкен', 'abl', 'дүкеннен'],
    ['қала', 'abl', 'қаладан'],
    ['мектеп', 'abl', 'мектептен'],
    ['адам', 'gen', 'адамның'],
    ['үй', 'gen', 'үйдің'],
    ['су', 'gen', 'судың'],
    ['мектеп', 'gen', 'мектептің'],
    ['ана', 'gen', 'ананың'],
    ['су', 'acc', 'суды'],
    ['нан', 'acc', 'нанды'],
    ['ет', 'acc', 'етті'],
    ['қала', 'acc', 'қаланы'],
    ['автобус', 'ins', 'автобуспен'],
    ['нан', 'ins', 'нанмен'],
    ['қыз', 'ins', 'қызбен'],
  ] as const)('%s + %s → %s', (word, kase, expected) => {
    expect(nounCase(word, kase)).toBe(expected);
  });

  it('builds plurals', () => {
    expect(plural('бала')).toBe('балалар');
    expect(plural('үй')).toBe('үйлер');
    expect(plural('адам')).toBe('адамдар');
    expect(plural('дос')).toBe('достар');
    expect(plural('көл')).toBe('көлдер');
  });

  it('builds possessives, voicing the final consonant', () => {
    expect(possessive('ана', '1sg')).toBe('анам');
    expect(possessive('әке', '1sg')).toBe('әкем');
    expect(possessive('дос', '1sg')).toBe('досым');
    expect(possessive('үй', '1sg')).toBe('үйім');
    expect(possessive('мектеп', '1sg')).toBe('мектебім');
    expect(possessive('ана', '2sgF')).toBe('анаңыз');
    expect(possessive('дос', '2sgF')).toBe('досыңыз');
    expect(possessive('ана', '3')).toBe('анасы');
    expect(possessive('дос', '3')).toBe('досы');
    expect(possessive('бала', '1pl')).toBe('баламыз');
  });

  it('puts cases on possessed nouns', () => {
    expect(possessedCase('анам', '1sg', 'dat')).toBe('анама');
    expect(possessedCase('анам', '1sg', 'acc')).toBe('анамды');
    expect(possessedCase('досым', '1sg', 'ins')).toBe('досыммен');
    expect(possessedCase('анаңыз', '2sgF', 'dat')).toBe('анаңызға');
    expect(possessedCase('анасы', '3', 'dat')).toBe('анасына');
    expect(possessedCase('анасы', '3', 'loc')).toBe('анасында');
    expect(possessedCase('анасы', '3', 'acc')).toBe('анасын');
  });

  it('adds personal predicate endings', () => {
    expect(predicate('жақсы', '1sg')).toBe('жақсымын');
    expect(predicate('дәрігер', '1sg')).toBe('дәрігермін');
    expect(predicate('қазақ', '1sg')).toBe('қазақпын');
    expect(predicate('жалғыз', '1sg')).toBe('жалғызбын');
    expect(predicate('үйде', '1sg')).toBe('үйдемін');
    expect(predicate('қалай', '2sgF')).toBe('қалайсыз');
    expect(predicate('кім', '2sgF')).toBe('кімсіз');
    expect(predicate('емес', '1sg')).toBe('емеспін');
    expect(predicate('жақсы', '1pl')).toBe('жақсымыз');
  });
});

describe('verbs', () => {
  const bar = { stem: 'бар' };
  const kel = { stem: 'кел' };
  const ish = { stem: 'іш' };
  const zhe = { stem: 'же' };
  const oky = { stem: 'оқы' };
  const tusin = { stem: 'түсін' };

  it('conjugates the present-future tense', () => {
    expect(presentTense(bar, '1sg')).toBe('барамын');
    expect(presentTense(bar, '2sgF')).toBe('барасыз');
    expect(presentTense(bar, '3')).toBe('барады');
    expect(presentTense(bar, '1pl')).toBe('барамыз');
    expect(presentTense(kel, '1sg')).toBe('келемін');
    expect(presentTense(kel, '3')).toBe('келеді');
    expect(presentTense(ish, '1sg')).toBe('ішемін');
    expect(presentTense(zhe, '1sg')).toBe('жеймін');
    expect(presentTense(zhe, '2sgF')).toBe('жейсіз');
    expect(presentTense(oky, '1sg')).toBe('оқимын');
    expect(presentTense(oky, '3')).toBe('оқиды');
    expect(presentTense({ stem: 'ойна' }, '1sg')).toBe('ойнаймын');
    expect(presentTense({ stem: 'қоңырау шал' }, '1sg')).toBe('қоңырау шаламын');
    expect(presentTense({ stem: 'жақсы көр' }, '1sg')).toBe('жақсы көремін');
    expect(presentTense({ stem: 'қорық', presentStem: 'қорқ' }, '1sg')).toBe('қорқамын');
  });

  it('negates the present-future tense', () => {
    expect(presentTense(bar, '1sg', true)).toBe('бармаймын');
    expect(presentTense(kel, '1sg', true)).toBe('келмеймін');
    expect(presentTense(ish, '1sg', true)).toBe('ішпеймін');
    expect(presentTense(tusin, '1sg', true)).toBe('түсінбеймін');
    expect(presentTense({ stem: 'жаз' }, '1sg', true)).toBe('жазбаймын');
    expect(presentTense(oky, '3', true)).toBe('оқымайды');
    expect(presentTense({ stem: 'қорық', presentStem: 'қорқ' }, '1sg', true)).toBe('қорықпаймын');
  });

  it('conjugates the past tense', () => {
    expect(pastTense(bar, '1sg')).toBe('бардым');
    expect(pastTense(ish, '1sg')).toBe('іштім');
    expect(pastTense(kel, '3')).toBe('келді');
    expect(pastTense(kel, '1pl')).toBe('келдік');
    expect(pastTense(bar, '1pl')).toBe('бардық');
    expect(pastTense(bar, '2sgF')).toBe('бардыңыз');
    expect(pastTense({ stem: 'шарша' }, '1sg')).toBe('шаршадым');
    expect(pastTense({ stem: 'ашық' }, '1sg')).toBe('ашықтым');
    expect(pastTense(bar, '1sg', true)).toBe('бармадым');
    expect(pastTense(ish, '1sg', true)).toBe('ішпедім');
  });

  it('builds the continuous state and polite imperatives', () => {
    expect(continuousTense({ stem: 'ауыр' }, '1sg')).toBe('ауырып тұрмын');
    expect(continuousTense({ stem: 'ауыр' }, '3')).toBe('ауырып тұр');
    expect(politeImperative({ stem: 'күт' })).toBe('күтіңіз');
    expect(politeImperative(bar)).toBe('барыңыз');
    expect(politeImperative(zhe)).toBe('жеңіз');
    expect(politeImperative(oky)).toBe('оқыңыз');
    expect(politeImperative(bar, true)).toBe('бармаңыз');
    expect(politeImperative(ish, true)).toBe('ішпеңіз');
  });
});

describe('nounCase', () => {
  it('leaves the nominative untouched', () => {
    expect(nounCase('үй', 'nom')).toBe('үй');
  });
});
