import type { Direction, GestureSpec, HandShape, Location, MotionState, Relation } from '../gesture/types';
import type { Localized } from './vocabulary';

export type Lang = 'kk' | 'ru' | 'en';

export const LANGS: readonly Lang[] = ['kk', 'ru', 'en'];

export const SHAPE_LABELS: Record<HandShape, Localized> = {
  fist: { kk: 'Жұдырық', ru: 'Кулак', en: 'Fist' },
  open: { kk: 'Ашық алақан', ru: 'Открытая ладонь', en: 'Open palm' },
  four: { kk: 'Жазық алақан (бас бармақ бүгулі)', ru: 'Ровная ладонь (большой прижат)', en: 'Flat hand (thumb tucked)' },
  point: { kk: 'Сұқ саусақ', ru: 'Указательный палец', en: 'Index finger' },
  v: { kk: 'Екі саусақ (V)', ru: 'Два пальца (V)', en: 'Two fingers (V)' },
  three: { kk: 'Үш саусақ', ru: 'Три пальца', en: 'Three fingers' },
  k: { kk: 'Бас бармақ + екі саусақ', ru: 'Большой + два пальца', en: 'Thumb + two fingers' },
  thumb: { kk: 'Бас бармақ', ru: 'Большой палец', en: 'Thumb' },
  ok: { kk: '«ОК» белгісі', ru: 'Знак «ОК»', en: '“OK” sign' },
  pinky: { kk: 'Шынашақ', ru: 'Мизинец', en: 'Little finger' },
  call: { kk: 'Бас бармақ + шынашақ', ru: 'Большой + мизинец', en: 'Thumb + little finger' },
  l: { kk: 'Бас бармақ + сұқ саусақ (L)', ru: 'Большой + указательный (L)', en: 'Thumb + index finger (L)' },
  ily: { kk: 'Бас бармақ + сұқ + шынашақ', ru: 'Большой + указательный + мизинец', en: 'Thumb + index + little finger' },
  horns: { kk: 'Сұқ саусақ + шынашақ', ru: 'Указательный + мизинец', en: 'Index + little finger' },
  pinch: { kk: 'Шоқ саусақ (ұштары бірге)', ru: 'Щепоть (кончики вместе)', en: 'Pinch (fingertips together)' },
};

export const SHAPE_SHORT: Record<HandShape, Localized> = {
  fist: { kk: 'Жұдырық', ru: 'Кулак', en: 'Fist' },
  open: { kk: 'Ашық алақан', ru: 'Ладонь', en: 'Palm' },
  four: { kk: 'Жазық алақан', ru: 'Ровная ладонь', en: 'Flat hand' },
  point: { kk: 'Сұқ саусақ', ru: 'Указательный', en: 'Index' },
  v: { kk: 'V', ru: 'V', en: 'V' },
  three: { kk: 'Үш саусақ', ru: 'Три пальца', en: 'Three fingers' },
  k: { kk: 'K', ru: 'K', en: 'K' },
  thumb: { kk: 'Бас бармақ', ru: 'Большой палец', en: 'Thumb' },
  ok: { kk: 'ОК', ru: 'ОК', en: 'OK' },
  pinky: { kk: 'Шынашақ', ru: 'Мизинец', en: 'Little finger' },
  call: { kk: 'Телефон', ru: 'Телефон', en: 'Phone' },
  l: { kk: 'L', ru: 'L', en: 'L' },
  ily: { kk: '🤟', ru: '🤟', en: '🤟' },
  horns: { kk: 'Мүйіз', ru: 'Рожки', en: 'Horns' },
  pinch: { kk: 'Шоқ саусақ', ru: 'Щепоть', en: 'Pinch' },
};

export const DIRECTION_LABELS: Record<Direction, Localized> = {
  up: { kk: 'жоғары қарай', ru: 'вверх', en: 'pointing up' },
  down: { kk: 'төмен қарай', ru: 'вниз', en: 'pointing down' },
  side: { kk: 'бүйірге қарай', ru: 'в сторону', en: 'pointing sideways' },
  forward: { kk: 'камераға қарай', ru: 'к камере', en: 'towards the camera' },
};

export const LOCATION_LABELS: Record<Location, Localized> = {
  head: { kk: 'бас / маңдай деңгейінде', ru: 'на уровне лба', en: 'at forehead level' },
  face: { kk: 'бет / иек деңгейінде', ru: 'на уровне лица', en: 'at face level' },
  chest: { kk: 'кеуде деңгейінде', ru: 'на уровне груди', en: 'at chest level' },
  low: { kk: 'төменде', ru: 'внизу', en: 'low' },
};

export const LOCATION_SHORT: Record<Location, Localized> = {
  head: { kk: 'Бас', ru: 'Голова', en: 'Head' },
  face: { kk: 'Бет', ru: 'Лицо', en: 'Face' },
  chest: { kk: 'Кеуде', ru: 'Грудь', en: 'Chest' },
  low: { kk: 'Төмен', ru: 'Низ', en: 'Low' },
};

export const MOTION_LABELS: Record<MotionState, Localized> = {
  still: { kk: 'қозғалтпай ұстаңыз', ru: 'держите неподвижно', en: 'hold still' },
  wave: { kk: 'оңды-солды бұлғаңыз', ru: 'помашите влево-вправо', en: 'wave left and right' },
  nod: { kk: 'жоғары-төмен қағыңыз', ru: 'покачайте вверх-вниз', en: 'tap up and down' },
  circle: { kk: 'шеңбер сызыңыз', ru: 'сделайте круг', en: 'draw a circle' },
  moving: { kk: 'қозғалыста', ru: 'в движении', en: 'moving' },
};

export const MOTION_SHORT: Record<MotionState, Localized> = {
  still: { kk: 'Тұрақты', ru: 'Неподвижно', en: 'Still' },
  wave: { kk: 'Бұлғау', ru: 'Взмах', en: 'Wave' },
  nod: { kk: 'Қағу', ru: 'Кивок', en: 'Tap' },
  circle: { kk: 'Шеңбер', ru: 'Круг', en: 'Circle' },
  moving: { kk: 'Қозғалыс', ru: 'Движение', en: 'Moving' },
};

export const RELATION_LABELS: Record<Relation, Localized> = {
  together: { kk: 'қолдар бір-біріне тиіп тұрады', ru: 'руки касаются друг друга', en: 'hands touching' },
  apart: { kk: 'қолдар алшақ', ru: 'руки врозь', en: 'hands apart' },
};

const HANDS_LABELS = {
  both: { kk: 'Екі қол', ru: 'Обе руки', en: 'Both hands' },
  dominant: { kk: 'Негізгі қол', ru: 'Ведущая рука', en: 'Dominant hand' },
  second: { kk: 'екінші қол', ru: 'вторая рука', en: 'other hand' },
} satisfies Record<string, Localized>;

const capitalize = (s: string): string => (s ? s[0].toLocaleUpperCase() + s.slice(1) : s);
/** Lower-cases only the first letter, so "(V)", "(L)", "OK" keep their case. */
const lowerFirst = (s: string): string => (s ? s[0].toLocaleLowerCase() + s.slice(1) : s);

/** Human-readable instruction for a gesture, e.g. "Сұқ саусақ, жоғары қарай, кеуде деңгейінде, қозғалтпай ұстаңыз." */
export function describeGesture(spec: GestureSpec, lang: Lang): string {
  const parts: string[] = [];
  if (spec.second) {
    const same = spec.second.shape === spec.shape;
    const hands = same
      ? `${HANDS_LABELS.both[lang]}: ${lowerFirst(SHAPE_LABELS[spec.shape][lang])}`
      : `${HANDS_LABELS.dominant[lang]}: ${lowerFirst(SHAPE_LABELS[spec.shape][lang])}; ${
          HANDS_LABELS.second[lang]
        }: ${lowerFirst(SHAPE_LABELS[spec.second.shape][lang])}`;
    parts.push(hands);
    if (spec.second.relation) parts.push(RELATION_LABELS[spec.second.relation][lang]);
  } else {
    parts.push(SHAPE_LABELS[spec.shape][lang]);
  }
  if (spec.dir) parts.push(DIRECTION_LABELS[spec.dir][lang]);
  if (spec.location) parts.push(LOCATION_LABELS[spec.location][lang]);
  parts.push(MOTION_LABELS[spec.motion ?? 'still'][lang]);
  return `${capitalize(parts.join(', '))}.`;
}
