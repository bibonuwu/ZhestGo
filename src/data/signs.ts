import type { Localized, TopicIcon } from './vocabulary';

/**
 * Video lessons: 50 signs recorded by the Qoldau team.
 *
 * `source` is the original camera file in `video/` (not shipped with the site).
 * `npm run videos` compresses it into `public/signs/<id>.mp4` and a poster
 * `public/signs/<id>.webp`. `wordId` links the sign to the dictionary word with
 * the same meaning: the camera recognises the sign from the video
 * (`npm run landmarks` → `npm run sign-model`) and writes that word.
 *
 * Pure data: also imported by the API server (to validate progress) and by
 * the scripts.
 */
export type SignTopicId = 'basics' | 'people' | 'time' | 'animals' | 'colors' | 'things' | 'describe' | 'actions';

export interface Sign {
  id: string;
  kk: string;
  ru: string;
  en: string;
  topic: SignTopicId;
  source: string;
  wordId?: string;
  /**
   * The part of the video that is the sign itself, ms — only where the
   * automatic trimming (gesture/signTemplates.ts) gets it wrong.
   */
  trim?: [number, number];
}

export const SIGN_TOPICS: ReadonlyArray<{ id: SignTopicId; label: Localized; icon: TopicIcon }> = [
  { id: 'basics', label: { kk: 'Негізгі', ru: 'Основное', en: 'Basics' }, icon: 'hand' },
  { id: 'people', label: { kk: 'Адамдар', ru: 'Люди', en: 'People' }, icon: 'users' },
  { id: 'time', label: { kk: 'Уақыт', ru: 'Время', en: 'Time' }, icon: 'clock' },
  { id: 'animals', label: { kk: 'Жануарлар', ru: 'Животные', en: 'Animals' }, icon: 'paw' },
  { id: 'colors', label: { kk: 'Түстер', ru: 'Цвета', en: 'Colours' }, icon: 'palette' },
  { id: 'things', label: { kk: 'Заттар мен орындар', ru: 'Вещи и места', en: 'Things & places' }, icon: 'home' },
  { id: 'describe', label: { kk: 'Сипаттау', ru: 'Описание', en: 'Describing' }, icon: 'ruler' },
  { id: 'actions', label: { kk: 'Әрекеттер', ru: 'Действия', en: 'Actions' }, icon: 'zap' },
];

export const SIGNS: readonly Sign[] = [
  { id: 'salem', kk: 'сәлем', ru: 'привет', en: 'hi', topic: 'basics', source: 'C0921', wordId: 'salem' },
  { id: 'ia', kk: 'иә', ru: 'да', en: 'yes', topic: 'basics', source: 'C0922', wordId: 'ia' },
  { id: 'esim', kk: 'есім', ru: 'имя', en: 'name', topic: 'people', source: 'C0923', wordId: 'esim' },
  { id: 'ana', kk: 'ана', ru: 'мама', en: 'mother', topic: 'people', source: 'C0924', wordId: 'ana' },
  { id: 'ake', kk: 'әке', ru: 'папа', en: 'father', topic: 'people', source: 'C0925', wordId: 'ake' },
  { id: 'kala', kk: 'қала', ru: 'город', en: 'city', topic: 'things', source: 'C0926', wordId: 'kala' },
  { id: 'bugin', kk: 'бүгін', ru: 'сегодня', en: 'today', topic: 'time', source: 'C0927', wordId: 'bugin' },
  { id: 'erten', kk: 'ертең', ru: 'завтра', en: 'tomorrow', topic: 'time', source: 'C0928', wordId: 'erten' },
  { id: 'keshe', kk: 'кеше', ru: 'вчера', en: 'yesterday', topic: 'time', source: 'C0929', wordId: 'keshe' },
  { id: 'su', kk: 'су', ru: 'вода', en: 'water', topic: 'things', source: 'C0930', wordId: 'su' },
  { id: 'ui', kk: 'үй', ru: 'дом', en: 'home', topic: 'things', source: 'C0931', wordId: 'ui' },
  { id: 'kitap', kk: 'кітап', ru: 'книга', en: 'book', topic: 'things', source: 'C0932', wordId: 'kitap' },
  { id: 'mektep', kk: 'мектеп', ru: 'школа', en: 'school', topic: 'things', source: 'C0933', wordId: 'mektep' },
  { id: 'it', kk: 'ит', ru: 'собака', en: 'dog', topic: 'animals', source: 'C0934', wordId: 'it' },
  { id: 'mysyk', kk: 'мысық', ru: 'кошка', en: 'cat', topic: 'animals', source: 'C0935', wordId: 'mysyk' },
  { id: 'nan', kk: 'нан', ru: 'хлеб', en: 'bread', topic: 'things', source: 'C0936', wordId: 'nan' },
  { id: 'dos', kk: 'дос', ru: 'друг', en: 'friend', topic: 'people', source: 'C0937', wordId: 'dos' },
  { id: 'otbasy', kk: 'отбасы', ru: 'семья', en: 'family', topic: 'people', source: 'C0938', wordId: 'otbasy' },
  { id: 'tamak', kk: 'тамақ', ru: 'еда', en: 'food', topic: 'things', source: 'C0939', wordId: 'tamak' },
  { id: 'kun', kk: 'күн', ru: 'день, солнце', en: 'day, sun', topic: 'time', source: 'C0940', wordId: 'kun' },
  { id: 'bala', kk: 'бала', ru: 'ребёнок', en: 'child', topic: 'people', source: 'C0941', wordId: 'bala' },
  { id: 'zhaksy', kk: 'жақсы', ru: 'хорошо', en: 'good', topic: 'describe', source: 'C0942', wordId: 'zhaksy' },
  { id: 'zhaman', kk: 'жаман', ru: 'плохо', en: 'bad', topic: 'describe', source: 'C0943', wordId: 'zhaman' },
  { id: 'tun', kk: 'түн', ru: 'ночь', en: 'night', topic: 'time', source: 'C0944', wordId: 'tun' },
  { id: 'tan', kk: 'таң', ru: 'утро, рассвет', en: 'dawn, morning', topic: 'time', source: 'C0945', wordId: 'tan' },
  { id: 'kesh', kk: 'кеш', ru: 'вечер', en: 'evening', topic: 'time', source: 'C0946', wordId: 'kesh' },
  { id: 'aksha', kk: 'ақша', ru: 'деньги', en: 'money', topic: 'things', source: 'C0947', wordId: 'aksha' },
  { id: 'uakyt', kk: 'уақыт', ru: 'время', en: 'time', topic: 'time', source: 'C0948', wordId: 'uakyt' },
  { id: 'balyk', kk: 'балық', ru: 'рыба', en: 'fish', topic: 'animals', source: 'C0949', wordId: 'balyk' },
  { id: 'kus', kk: 'құс', ru: 'птица', en: 'bird', topic: 'animals', source: 'C0950', wordId: 'kus' },
  { id: 'kyzyl', kk: 'қызыл', ru: 'красный', en: 'red', topic: 'colors', source: 'C0951', wordId: 'kyzyl' },
  { id: 'kok', kk: 'көк', ru: 'синий, голубой', en: 'blue', topic: 'colors', source: 'C0952', wordId: 'kok' },
  { id: 'zhasyl', kk: 'жасыл', ru: 'зелёный', en: 'green', topic: 'colors', source: 'C0953', wordId: 'zhasyl' },
  { id: 'ak', kk: 'ақ', ru: 'белый', en: 'white', topic: 'colors', source: 'C0954', wordId: 'ak' },
  { id: 'kara', kk: 'қара', ru: 'чёрный', en: 'black', topic: 'colors', source: 'C0955', wordId: 'kara' },
  { id: 'sary', kk: 'сары', ru: 'жёлтый', en: 'yellow', topic: 'colors', source: 'C0956', wordId: 'sary' },
  { id: 'ulken', kk: 'үлкен', ru: 'большой', en: 'big', topic: 'describe', source: 'C0957', wordId: 'ulken', trim: [400, 1100] },
  { id: 'kishkentai', kk: 'кішкентай', ru: 'маленький', en: 'small', topic: 'describe', source: 'C0958', wordId: 'kishkentai' },
  { id: 'erkek', kk: 'еркек', ru: 'мужчина', en: 'man', topic: 'people', source: 'C0959', wordId: 'erkek' },
  { id: 'aiel', kk: 'әйел', ru: 'женщина', en: 'woman', topic: 'people', source: 'C0960', wordId: 'aiel' },
  { id: 'apta', kk: 'апта', ru: 'неделя', en: 'week', topic: 'time', source: 'C0961', wordId: 'apta' },
  { id: 'ai', kk: 'ай', ru: 'месяц, луна', en: 'month, moon', topic: 'time', source: 'C0962', wordId: 'ai' },
  { id: 'zhyl', kk: 'жыл', ru: 'год', en: 'year', topic: 'time', source: 'C0963', wordId: 'zhyl' },
  { id: 'oku', kk: 'оқу', ru: 'читать, учиться', en: 'read, study', topic: 'actions', source: 'C0964', wordId: 'oku' },
  { id: 'zhazu', kk: 'жазу', ru: 'писать', en: 'write', topic: 'actions', source: 'C0965', wordId: 'zhazu' },
  { id: 'ushu', kk: 'ұшу', ru: 'летать', en: 'fly', topic: 'actions', source: 'C0966', wordId: 'ushu' },
  { id: 'uiyktau', kk: 'ұйықтау', ru: 'спать', en: 'sleep', topic: 'actions', source: 'C0967', wordId: 'uiyktau' },
  { id: 'tyndau', kk: 'тыңдау', ru: 'слушать', en: 'listen', topic: 'actions', source: 'C0968', wordId: 'tyndau' },
  { id: 'karau', kk: 'қарау', ru: 'смотреть', en: 'look, watch', topic: 'actions', source: 'C0969', wordId: 'karau' },
  { id: 'bilu', kk: 'білу', ru: 'знать', en: 'know', topic: 'actions', source: 'C0970', wordId: 'bilu' },
];

export const SIGNS_BY_ID: ReadonlyMap<string, Sign> = new Map(SIGNS.map((s) => [s.id, s]));

/** The video lesson for a dictionary word, if one was recorded. */
export const SIGN_BY_WORD: ReadonlyMap<string, Sign> = new Map(
  SIGNS.filter((s) => s.wordId).map((s) => [s.wordId as string, s]),
);
