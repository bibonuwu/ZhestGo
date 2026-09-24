import { describe, expect, it } from 'vitest';
import { GRAMMAR } from '../../data/grammar';
import { VOCABULARY, WORDS_BY_ID } from '../../data/vocabulary';
import { composeKazakh } from './sentence';

const say = (...ids: string[]) =>
  composeKazakh(
    ids.map((id) => {
      const w = WORDS_BY_ID.get(id);
      if (!w) throw new Error(`unknown word ${id}`);
      return w;
    }),
  );

describe('composeKazakh', () => {
  it.each([
    // needs
    [['men', 'su', 'ishu', 'kerek'], 'Маған су ішу керек.'],
    [['su'], 'Маған су керек.'],
    [['su', 'nan', 'kerek'], 'Маған су мен нан керек.'],
    [['eki', 'nan'], 'Маған екі нан керек.'],
    [['tagy', 'su'], 'Маған тағы су керек.'],
    [['ne', 'kerek'], 'Сізге не керек?'],
    [['men', 'ana', 'konyrau', 'kerek'], 'Маған анама қоңырау шалу керек.'],
    [['men', 'ashyktym', 'tamak', 'kerek'], 'Мен ашықтым, маған тамақ керек.'],
    [['su', 'zhok'], 'Су жоқ.'],
    [['men', 'aksha', 'zhok'], 'Менде ақша жоқ.'],
    // verbs
    [['erten', 'mektep', 'baru'], 'Ертең мектепке барамын.'],
    [['men', 'erten', 'zhumys', 'baru'], 'Мен ертең жұмысқа барамын.'],
    [['keshe', 'men', 'dariger', 'baru'], 'Мен кеше дәрігерге бардым.'],
    [['biz', 'mektep', 'baru'], 'Біз мектепке барамыз.'],
    [['olar', 'keshe', 'kelu'], 'Олар кеше келді.'],
    [['men', 'mektep', 'oku'], 'Мен мектепте оқимын.'],
    [['men', 'avtobus', 'baru'], 'Мен автобуспен барамын.'],
    [['men', 'dos', 'oinau'], 'Мен досыммен ойнаймын.'],
    [['men', 'siz', 'zhaksy_koremin'], 'Мен сізді жақсы көремін.'],
    [['men', 'tusinu', 'zhok'], 'Мен түсінбеймін.'],
    [['tusinu', 'zhok'], 'Түсінбеймін.'],
    [['bala', 'uiyktau'], 'Балам ұйықтайды.'],
    [['ana', 'ake', 'kelu'], 'Анам мен әкем келеді.'],
    [['men', 'tun', 'uiyktau'], 'Мен түнде ұйықтаймын.'],
    [['men', 'ana', 'kutu'], 'Мен анамды күтемін.'],
    [['men', 'siz', 'konyrau'], 'Мен сізге қоңырау шаламын.'],
    [['siz', 'nege', 'kelu', 'zhok'], 'Сіз неге келмейсіз?'],
    [['bala', 'su', 'kerek'], 'Балама су керек.'],
    [['ana', 'auyrady'], 'Анам ауырып тұр.'],
    [['auyrady'], 'Ауырып тұрмын.'],
    [['men', 'sharshadym'], 'Мен шаршадым.'],
    [['ol', 'sharshadym'], 'Ол шаршады.'],
    [['men', 'korkamyn'], 'Мен қорқамын.'],
    // questions
    [['siz', 'kaida', 'baru'], 'Сіз қайда барасыз?'],
    [['kaida', 'baru'], 'Қайда барасыз?'],
    [['siz', 'ne', 'zheu'], 'Сіз не жейсіз?'],
    [['siz', 'kashan', 'kelu'], 'Сіз қашан келесіз?'],
    [['kim', 'kelu'], 'Кім келеді?'],
    [['siz', 'kim'], 'Сіз кімсіз?'],
    [['siz', 'kalai'], 'Сіз қалайсыз?'],
    [['siz', 'kaida'], 'Сіз қайдасыз?'],
    [['ana', 'kaida'], 'Анам қайда?'],
    [['siz', 'ana', 'kaida'], 'Сіздің анаңыз қайда?'],
    // states and descriptions
    [['men', 'zhaksy'], 'Мен жақсымын.'],
    [['men', 'zhaksy', 'zhok'], 'Мен жақсы емеспін.'],
    [['men', 'kuanyshtymyn'], 'Мен қуаныштымын.'],
    [['men', 'suyk'], 'Маған суық.'],
    [['ui', 'ulken'], 'Үй үлкен.'],
    [['men', 'ui'], 'Мен үйдемін.'],
    [['men', 'munda'], 'Мен мұндамын.'],
    [['men', 'adam'], 'Мен адаммын.'],
    [['ol', 'dariger'], 'Ол дәрігер.'],
    // phrases
    [['salem'], 'Сәлем!'],
    [['salem', 'rakhmet'], 'Сәлем! Рақмет!'],
    [['rakhmet', 'dos'], 'Рақмет, досым!'],
    [['keshiriniz', 'darethana', 'kaida'], 'Кешіріңіз, дәретхана қайда?'],
    [['otinemin', 'kutu'], 'Өтінемін, күтіңіз!'],
    [['ia', 'men', 'kelu'], 'Иә, мен келемін.'],
    [['zhok', 'men', 'baru', 'zhok'], 'Жоқ, мен бармаймын.'],
    [['komek'], 'Көмектесіңіз!'],
    [['zhedel'], 'Жедел жәрдем шақырыңыз!'],
    [['darethana'], 'Маған дәретханаға бару керек.'],
    [['toktanyz'], 'Тоқтаңыз!'],
    [['ia'], 'Иә.'],
  ])('%j → %s', (ids, expected) => {
    expect(say(...(ids as string[]))).toBe(expected);
  });

  it('returns an empty string for no words', () => {
    expect(composeKazakh([])).toBe('');
  });

  it('treats unknown (user-added) words as nouns', () => {
    expect(composeKazakh([WORDS_BY_ID.get('men')!, { id: 'user_1', kk: 'айгүл' }])).toBe('Мен айгүлмін.');
  });

  it('never throws and always produces text for any pair of words', () => {
    for (const a of VOCABULARY) {
      for (const b of VOCABULARY) {
        const text = composeKazakh([a, b]);
        expect(text.length).toBeGreaterThan(1);
        expect(text).toMatch(/[.!?]$/);
      }
    }
  });

  it('has grammar for every word', () => {
    expect(VOCABULARY.filter((w) => !GRAMMAR[w.id]).map((w) => w.id)).toEqual([]);
  });
});
