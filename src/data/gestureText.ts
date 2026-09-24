import type { Direction, GestureSpec, HandShape, Location, MotionState, Relation } from '../gesture/types';
import type { Bilingual } from './vocabulary';

export type Lang = 'kk' | 'ru';

export const SHAPE_LABELS: Record<HandShape, Bilingual> = {
  fist: { kk: 'Жұдырық', ru: 'Кулак' },
  open: { kk: 'Ашық алақан', ru: 'Открытая ладонь' },
  four: { kk: 'Жазық алақан (бас бармақ бүгулі)', ru: 'Ровная ладонь (большой прижат)' },
  point: { kk: 'Сұқ саусақ', ru: 'Указательный палец' },
  v: { kk: 'Екі саусақ (V)', ru: 'Два пальца (V)' },
  three: { kk: 'Үш саусақ', ru: 'Три пальца' },
  k: { kk: 'Бас бармақ + екі саусақ', ru: 'Большой + два пальца' },
  thumb: { kk: 'Бас бармақ', ru: 'Большой палец' },
  ok: { kk: '«ОК» белгісі', ru: 'Знак «ОК»' },
  pinky: { kk: 'Шынашақ', ru: 'Мизинец' },
  call: { kk: 'Бас бармақ + шынашақ', ru: 'Большой + мизинец' },
  l: { kk: 'Бас бармақ + сұқ саусақ (L)', ru: 'Большой + указательный (L)' },
  ily: { kk: 'Бас бармақ + сұқ + шынашақ', ru: 'Большой + указательный + мизинец' },
  horns: { kk: 'Сұқ саусақ + шынашақ', ru: 'Указательный + мизинец' },
  pinch: { kk: 'Шоқ саусақ (ұштары бірге)', ru: 'Щепоть (кончики вместе)' },
};

export const SHAPE_SHORT: Record<HandShape, Bilingual> = {
  fist: { kk: 'Жұдырық', ru: 'Кулак' },
  open: { kk: 'Ашық алақан', ru: 'Ладонь' },
  four: { kk: 'Жазық алақан', ru: 'Ровная ладонь' },
  point: { kk: 'Сұқ саусақ', ru: 'Указательный' },
  v: { kk: 'V', ru: 'V' },
  three: { kk: 'Үш саусақ', ru: 'Три пальца' },
  k: { kk: 'K', ru: 'K' },
  thumb: { kk: 'Бас бармақ', ru: 'Большой палец' },
  ok: { kk: 'ОК', ru: 'ОК' },
  pinky: { kk: 'Шынашақ', ru: 'Мизинец' },
  call: { kk: 'Телефон', ru: 'Телефон' },
  l: { kk: 'L', ru: 'L' },
  ily: { kk: '🤟', ru: '🤟' },
  horns: { kk: 'Мүйіз', ru: 'Рожки' },
  pinch: { kk: 'Шоқ саусақ', ru: 'Щепоть' },
};

export const DIRECTION_LABELS: Record<Direction, Bilingual> = {
  up: { kk: 'жоғары қарай', ru: 'вверх' },
  down: { kk: 'төмен қарай', ru: 'вниз' },
  side: { kk: 'бүйірге қарай', ru: 'в сторону' },
  forward: { kk: 'камераға қарай', ru: 'к камере' },
};

export const LOCATION_LABELS: Record<Location, Bilingual> = {
  head: { kk: 'бас / маңдай деңгейінде', ru: 'на уровне лба' },
  face: { kk: 'бет / иек деңгейінде', ru: 'на уровне лица' },
  chest: { kk: 'кеуде деңгейінде', ru: 'на уровне груди' },
  low: { kk: 'төменде', ru: 'внизу' },
};

export const LOCATION_SHORT: Record<Location, Bilingual> = {
  head: { kk: 'Бас', ru: 'Голова' },
  face: { kk: 'Бет', ru: 'Лицо' },
  chest: { kk: 'Кеуде', ru: 'Грудь' },
  low: { kk: 'Төмен', ru: 'Низ' },
};

export const MOTION_LABELS: Record<MotionState, Bilingual> = {
  still: { kk: 'қозғалтпай ұстаңыз', ru: 'держите неподвижно' },
  wave: { kk: 'оңды-солды бұлғаңыз', ru: 'помашите влево-вправо' },
  nod: { kk: 'жоғары-төмен қағыңыз', ru: 'покачайте вверх-вниз' },
  circle: { kk: 'шеңбер сызыңыз', ru: 'сделайте круг' },
  moving: { kk: 'қозғалыста', ru: 'в движении' },
};

export const MOTION_SHORT: Record<MotionState, Bilingual> = {
  still: { kk: 'Тұрақты', ru: 'Неподвижно' },
  wave: { kk: 'Бұлғау', ru: 'Взмах' },
  nod: { kk: 'Қағу', ru: 'Кивок' },
  circle: { kk: 'Шеңбер', ru: 'Круг' },
  moving: { kk: 'Қозғалыс', ru: 'Движение' },
};

export const RELATION_LABELS: Record<Relation, Bilingual> = {
  together: { kk: 'қолдар бір-біріне тиіп тұрады', ru: 'руки касаются друг друга' },
  apart: { kk: 'қолдар алшақ', ru: 'руки врозь' },
};

const capitalize = (s: string): string => (s ? s[0].toLocaleUpperCase() + s.slice(1) : s);

/** Human-readable instruction for a gesture, e.g. "Сұқ саусақ, жоғары қарай, кеуде деңгейінде, қозғалтпай ұстаңыз." */
export function describeGesture(spec: GestureSpec, lang: Lang): string {
  const parts: string[] = [];
  if (spec.second) {
    const same = spec.second.shape === spec.shape;
    const hands = same
      ? `${lang === 'kk' ? 'Екі қол' : 'Обе руки'}: ${SHAPE_LABELS[spec.shape][lang].toLocaleLowerCase()}`
      : `${lang === 'kk' ? 'Негізгі қол' : 'Ведущая рука'}: ${SHAPE_LABELS[spec.shape][lang].toLocaleLowerCase()}; ${
          lang === 'kk' ? 'екінші қол' : 'вторая рука'
        }: ${SHAPE_LABELS[spec.second.shape][lang].toLocaleLowerCase()}`;
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
