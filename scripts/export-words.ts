// Regenerates docs/WORDS.md from the vocabulary: `npm run docs:words`.
import { mkdirSync, writeFileSync } from 'node:fs';
import { AUTHORS } from '../src/data/authors';
import { describeGesture } from '../src/data/gestureText';
import { CATEGORIES, VOCABULARY } from '../src/data/vocabulary';

const cap = (s: string) => s[0].toLocaleUpperCase('kk') + s.slice(1);

const lines = [
  '# Qoldau — 100 сөз / 100 слов',
  '',
  `Авторлар / Авторы: ${AUTHORS.join(', ')}`,
  '',
  '> Файл создан автоматически из `src/data/vocabulary.ts` командой `npm run docs:words`.',
  '> Жесты — упрощённая система Qoldau для веб-камеры, а не официальный казахский жестовый язык.',
  '> «Лоб / лицо / грудь» — положение руки относительно лица; ведущая рука — правая (меняется в настройках).',
  '',
];

let n = 0;
for (const category of CATEGORIES) {
  const words = VOCABULARY.filter((w) => w.category === category.id);
  lines.push(`## ${category.icon} ${category.label.kk} / ${category.label.ru}`, '');
  lines.push('| № | Қазақша | Русский | Жест | Подсказка |', '|---|---|---|---|---|');
  for (const w of words) {
    n++;
    const kk = cap(w.kk) + (w.question ? '?' : '');
    lines.push(`| ${n} | **${kk}** | ${w.ru} | ${describeGesture(w.gesture, 'ru')} | ${w.hint?.ru ?? ''} |`);
  }
  lines.push('');
}

mkdirSync(new URL('../docs/', import.meta.url), { recursive: true });
writeFileSync(new URL('../docs/WORDS.md', import.meta.url), lines.join('\n'));
console.log(`docs/WORDS.md: ${n} words`);
