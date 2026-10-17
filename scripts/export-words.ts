// Regenerates docs/WORDS.md from the vocabulary: `npm run docs:words`.
import { mkdirSync, writeFileSync } from 'node:fs';
import { AUTHORS } from '../src/data/authors';
import { describeGesture } from '../src/data/gestureText';
import { SIGN_BY_WORD } from '../src/data/signs';
import { CATEGORIES, VOCABULARY } from '../src/data/vocabulary';

const cap = (s: string) => s[0].toLocaleUpperCase('kk') + s.slice(1);

// The site offers the words of the video lessons only (src/data/words.ts, LESSON_WORDS).
const WORDS = VOCABULARY.filter((w) => SIGN_BY_WORD.has(w.id));

const lines = [
  `# Qoldau — ${WORDS.length} сөз / ${WORDS.length} слов`,
  '',
  `Авторлар / Авторы: ${AUTHORS.join(', ')}`,
  '',
  '> Файл создан автоматически из `src/data/vocabulary.ts` командой `npm run docs:words`.',
  '> У каждого слова есть видеоурок (src/data/signs.ts): камера узнаёт жест из видео.',
  '> «Жест» — упрощённый жест-шаблон Qoldau (режим «Всё» или «Только шаблоны» в настройках).',
  '> «Лоб / лицо / грудь» — положение руки относительно лица; ведущая рука — правая (меняется в настройках).',
  '',
];

let n = 0;
for (const category of CATEGORIES) {
  const words = WORDS.filter((w) => w.category === category.id);
  if (!words.length) continue;
  lines.push(`## ${category.icon} ${category.label.kk} / ${category.label.ru} / ${category.label.en}`, '');
  lines.push('| № | Қазақша | Русский | English | Жест | Подсказка |', '|---|---|---|---|---|---|');
  for (const w of words) {
    n++;
    const kk = cap(w.kk) + (w.question ? '?' : '');
    const gesture = w.gesture ? describeGesture(w.gesture, 'ru') : '—';
    lines.push(`| ${n} | **${kk}** | ${w.ru} | ${w.en} | ${gesture} | ${w.hint?.ru ?? ''} |`);
  }
  lines.push('');
}

mkdirSync(new URL('../docs/', import.meta.url), { recursive: true });
writeFileSync(new URL('../docs/WORDS.md', import.meta.url), lines.join('\n'));
console.log(`docs/WORDS.md: ${n} words`);
