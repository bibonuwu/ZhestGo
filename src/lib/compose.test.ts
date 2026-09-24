import { describe, expect, it } from 'vitest';
import { WORDS_BY_ID } from '../data/vocabulary';
import { composeLocal } from './compose';

const words = (...ids: string[]) => ids.map((id) => WORDS_BY_ID.get(id)!);

describe('composeLocal', () => {
  it('builds a grammatical sentence from signed words', () => {
    expect(composeLocal(words('men', 'su', 'ishu', 'kerek'))).toBe('Маған су ішу керек.');
  });

  it('ends questions with a question mark', () => {
    expect(composeLocal(words('siz', 'kaida'))).toBe('Сіз қайдасыз?');
  });

  it('treats greetings as exclamations', () => {
    expect(composeLocal(words('salem'))).toBe('Сәлем!');
  });

  it('capitalises Kazakh-specific letters', () => {
    expect(composeLocal(words('uiyktau'))).toBe('Ұйықтаймын.');
  });

  it('keeps words the user added', () => {
    expect(composeLocal([{ id: 'user_x', kk: 'айгүл' }])).toBe('Айгүл.');
  });

  it('returns an empty string for no words', () => {
    expect(composeLocal([])).toBe('');
  });
});
