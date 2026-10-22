import { describe, expect, it } from 'vitest';
import { SIGNS } from '../../data/signs';
import { syllables } from './syllables';

const split = (word: string) => syllables(word).join('-');

describe('syllables', () => {
  it('gives a single consonant between vowels to the next syllable', () => {
    expect(split('сәлем')).toBe('сә-лем');
    expect(split('көмек')).toBe('кө-мек');
    expect(split('кітап')).toBe('кі-тап');
    expect(split('әйел')).toBe('ә-йел');
  });

  it('splits consonant clusters before their last consonant', () => {
    expect(split('мектеп')).toBe('мек-теп');
    expect(split('кішкентай')).toBe('кіш-кен-тай');
    expect(split('айтты')).toBe('айт-ты');
    expect(split('құттықтаймын')).toBe('құт-тық-тай-мын');
  });

  it('reads у and и as vowels after consonants and as consonants after vowels', () => {
    expect(split('бару')).toBe('ба-ру');
    expect(split('ішу')).toBe('і-шу');
    expect(split('суық')).toBe('су-ық');
    expect(split('қуаныш')).toBe('қу-а-ныш');
    expect(split('қарау')).toBe('қа-рау');
    expect(split('ауырады')).toBe('а-уы-ра-ды');
    expect(split('аурухана')).toBe('ау-ру-ха-на');
    expect(split('ұйықтау')).toBe('ұ-йық-тау');
    expect(split('уақыт')).toBe('уа-қыт');
    expect(split('киім')).toBe('ки-ім');
    expect(split('иә')).toBe('и-ә');
  });

  it('keeps one-syllable words whole and the letter case', () => {
    expect(syllables('су')).toEqual(['су']);
    expect(syllables('үй')).toEqual(['үй']);
    expect(syllables('тау')).toEqual(['тау']);
    expect(syllables('Сәлем')).toEqual(['Сә', 'лем']);
  });

  it('never starts a syllable with ь or ъ', () => {
    expect(split('альбом')).toBe('аль-бом');
  });

  it('loses no letters in the lesson words', () => {
    for (const s of SIGNS) {
      const parts = syllables(s.kk);
      expect(parts.join(''), s.kk).toBe(s.kk);
      expect(parts.every(Boolean), s.kk).toBe(true);
    }
  });
});
