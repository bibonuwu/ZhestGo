import type { Direction, GestureSpec, HandShape, Motion, Relation, SpecLocation } from '../gesture/types';
import type { Gram } from '../lang/kk/lexicon';
import type { Lang } from './gestureText';
import { GRAMMAR } from './grammar';

export type CategoryId =
  | 'greetings'
  | 'people'
  | 'questions'
  | 'needs'
  | 'actions'
  | 'feelings'
  | 'time'
  | 'places'
  | 'food'
  | 'describe'
  | 'things'
  | 'animals'
  | 'colors'
  | 'numbers';

/** A text in every interface language. */
export type Localized = Record<Lang, string>;

export interface WordEntry {
  id: string;
  /** Kazakh word or phrase in dictionary form, lower case. */
  kk: string;
  ru: string;
  en: string;
  category: CategoryId;
  /**
   * Qoldau's own simplified gesture (see gesture/matcher.ts). Words of the
   * video lessons are also recognised from the recorded sign
   * (gesture/signSpotter.ts), and some exist only as a video sign.
   */
  gesture?: GestureSpec;
  /** Question words end the sentence with "?". */
  question?: boolean;
  /** Mnemonic shown in the dictionary. */
  hint?: Localized;
  /** Grammar used by the offline sentence builder (see data/grammar.ts). */
  gram?: Gram;
  /** What to say when the word is signed on its own. */
  alone?: string;
}

/**
 * Icons of the word categories and lesson topics: names from components/Icon.tsx.
 * (SVG, not emoji: phones load the colour emoji font slowly, and it looks different everywhere.)
 */
export type TopicIcon = 'hand' | 'users' | 'quiz' | 'lifebuoy' | 'zap' | 'heart' | 'clock' | 'home' | 'utensils' | 'ruler' | 'hash' | 'paw' | 'palette' | 'box';

export const CATEGORIES: ReadonlyArray<{ id: CategoryId; label: Localized; icon: TopicIcon }> = [
  { id: 'greetings', label: { kk: 'Сәлемдесу', ru: 'Приветствие', en: 'Greetings' }, icon: 'hand' },
  { id: 'people', label: { kk: 'Адамдар', ru: 'Люди', en: 'People' }, icon: 'users' },
  { id: 'questions', label: { kk: 'Сұрақтар', ru: 'Вопросы', en: 'Questions' }, icon: 'quiz' },
  { id: 'needs', label: { kk: 'Қажеттілік', ru: 'Нужды', en: 'Needs' }, icon: 'lifebuoy' },
  { id: 'actions', label: { kk: 'Әрекеттер', ru: 'Действия', en: 'Actions' }, icon: 'zap' },
  { id: 'feelings', label: { kk: 'Сезімдер', ru: 'Чувства', en: 'Feelings' }, icon: 'heart' },
  { id: 'time', label: { kk: 'Уақыт', ru: 'Время', en: 'Time' }, icon: 'clock' },
  { id: 'places', label: { kk: 'Орындар', ru: 'Места', en: 'Places' }, icon: 'home' },
  { id: 'food', label: { kk: 'Тамақ', ru: 'Еда', en: 'Food' }, icon: 'utensils' },
  { id: 'describe', label: { kk: 'Сипаттау', ru: 'Описание', en: 'Describing' }, icon: 'ruler' },
  { id: 'things', label: { kk: 'Заттар', ru: 'Вещи', en: 'Things' }, icon: 'box' },
  { id: 'animals', label: { kk: 'Жануарлар', ru: 'Животные', en: 'Animals' }, icon: 'paw' },
  { id: 'colors', label: { kk: 'Түстер', ru: 'Цвета', en: 'Colours' }, icon: 'palette' },
  { id: 'numbers', label: { kk: 'Сандар', ru: 'Числа', en: 'Numbers' }, icon: 'hash' },
];

/** One-handed gesture. */
const one = (shape: HandShape, location: SpecLocation, motion: Motion = 'still', dir?: Direction): GestureSpec => ({
  shape,
  location,
  motion,
  ...(dir ? { dir } : {}),
});

/** Two-handed gesture: dominant shape, second-hand shape, how close they are. */
const two = (
  shape: HandShape,
  second: HandShape,
  relation: Relation,
  motion: Motion = 'still',
  location?: SpecLocation,
): GestureSpec => ({
  shape,
  motion,
  second: { shape: second, relation },
  ...(location ? { location } : {}),
});

const hint = (kk: string, ru: string, en: string): Localized => ({ kk, ru, en });

/**
 * 121 everyday Kazakh words. The `gesture`s are Qoldau's own simplified
 * system, designed to be reliably recognisable by a webcam — not official
 * Kazakh Sign Language. The 50 signs of the video lessons (data/signs.ts) are
 * recognised from the videos themselves; 21 words exist only as such a sign.
 */
const ENTRIES: readonly WordEntry[] = [
  // ── Greetings & courtesy ──────────────────────────────────────────────
  { id: 'salemetsiz', kk: 'сәлеметсіз бе', ru: 'здравствуйте', en: 'hello', category: 'greetings', gesture: one('open', 'head', 'wave'), hint: hint('Қолды жоғары көтеріп бұлғаңыз', 'Поднимите руку и помашите', 'Raise your hand and wave') },
  { id: 'salem', kk: 'сәлем', ru: 'привет', en: 'hi', category: 'greetings', gesture: one('open', 'chest', 'wave') },
  { id: 'sau_bol', kk: 'сау болыңыз', ru: 'до свидания', en: 'goodbye', category: 'greetings', gesture: one('four', 'head', 'wave'), hint: hint('Саусақтар жабық, бас деңгейінде қоштасу', 'Пальцы вместе, прощальный взмах', 'Fingers together, a goodbye wave at head level') },
  { id: 'rakhmet', kk: 'рақмет', ru: 'спасибо', en: 'thank you', category: 'greetings', gesture: one('four', 'face', 'still'), hint: hint('Жазық алақан иекте — алғыс белгісі', 'Ровная ладонь у подбородка — благодарность', 'Flat hand at the chin — a sign of thanks') },
  { id: 'keshiriniz', kk: 'кешіріңіз', ru: 'извините', en: 'excuse me, sorry', category: 'greetings', gesture: one('fist', 'chest', 'circle'), hint: hint('Жұдырықпен кеудеде шеңбер', 'Кулаком круг на груди', 'Draw a circle on the chest with a fist') },
  { id: 'otinemin', kk: 'өтінемін', ru: 'пожалуйста', en: 'please', category: 'greetings', gesture: one('open', 'chest', 'circle'), hint: hint('Алақанмен кеудеде шеңбер', 'Ладонью круг на груди', 'Draw a circle on the chest with the palm') },
  { id: 'ia', kk: 'иә', ru: 'да', en: 'yes', category: 'greetings', gesture: one('fist', 'chest', 'nod'), hint: hint('Жұдырық басты изегендей қағылады', 'Кулак «кивает», как голова', 'The fist “nods” like a head') },
  { id: 'zhok', kk: 'жоқ', ru: 'нет', en: 'no', category: 'greetings', gesture: one('point', 'face', 'wave'), hint: hint('Саусақпен «жоқ» деп шайқаңыз', 'Покачайте пальцем «нет»', 'Wag your finger “no”') },
  { id: 'zharaidy', kk: 'жарайды', ru: 'хорошо, ладно', en: 'okay', category: 'greetings', gesture: one('ok', 'chest'), hint: hint('«ОК» белгісі', 'Знак «ОК»', '“OK” sign') },
  { id: 'kosh_keldiniz', kk: 'қош келдіңіз', ru: 'добро пожаловать', en: 'welcome', category: 'greetings', gesture: two('open', 'open', 'apart', 'still', 'chest'), hint: hint('Құшақ жайғандай', 'Как будто раскрываете объятия', 'As if opening your arms for a hug') },
  { id: 'tanyskanyma', kk: 'танысқаныма қуаныштымын', ru: 'рад знакомству', en: 'nice to meet you', category: 'greetings', gesture: two('four', 'four', 'together', 'still', 'chest'), hint: hint('Қол алысқандай', 'Как рукопожатие', 'Like a handshake') },
  { id: 'kuttyktaimyn', kk: 'құттықтаймын', ru: 'поздравляю', en: 'congratulations', category: 'greetings', gesture: two('thumb', 'thumb', 'apart'), hint: hint('Екі бас бармақ жоғары', 'Два больших пальца вверх', 'Two thumbs up') },

  // ── People & pronouns ─────────────────────────────────────────────────
  { id: 'men', kk: 'мен', ru: 'я', en: 'I', category: 'people', gesture: one('four', 'chest', 'still', 'side'), hint: hint('Алақанды кеудеге басыңыз', 'Прижмите ладонь к груди', 'Press your palm to your chest') },
  { id: 'sen', kk: 'сен', ru: 'ты', en: 'you (informal)', category: 'people', gesture: one('point', 'chest', 'still', 'forward'), hint: hint('Камераға (әңгімелесушіге) нұсқаңыз', 'Укажите на камеру (собеседника)', 'Point at the camera (the other person)') },
  { id: 'siz', kk: 'сіз', ru: 'вы', en: 'you (polite)', category: 'people', gesture: one('open', 'chest', 'still', 'forward'), hint: hint('Алақанды жоғары қаратып ұсыныңыз', 'Протяните ладонь вверх', 'Hold out your palm, facing up') },
  { id: 'ol', kk: 'ол', ru: 'он / она', en: 'he / she', category: 'people', gesture: one('point', 'chest', 'still', 'side'), hint: hint('Бүйірге нұсқаңыз', 'Укажите в сторону', 'Point to the side') },
  { id: 'biz', kk: 'біз', ru: 'мы', en: 'we', category: 'people', gesture: one('point', 'chest', 'circle'), hint: hint('Айналаны шеңбермен көрсетіңіз', 'Обведите круг вокруг себя', 'Draw a circle around yourself') },
  { id: 'olar', kk: 'олар', ru: 'они', en: 'they', category: 'people', gesture: one('point', 'chest', 'wave'), hint: hint('Бірнеше адамды нұсқағандай', 'Как будто указываете на нескольких людей', 'As if pointing at several people') },
  { id: 'adam', kk: 'адам', ru: 'человек', en: 'person', category: 'people', gesture: one('k', 'chest') },
  { id: 'dos', kk: 'дос', ru: 'друг', en: 'friend', category: 'people', gesture: two('point', 'point', 'together'), hint: hint('Екі сұқ саусақты ілестіріңіз', 'Сцепите указательные пальцы', 'Hook your index fingers together') },
  { id: 'ana', kk: 'ана', ru: 'мама', en: 'mother', category: 'people', gesture: one('thumb', 'face', 'still', 'up'), hint: hint('Бас бармақ иекте', 'Большой палец у подбородка', 'Thumb at the chin') },
  { id: 'ake', kk: 'әке', ru: 'папа', en: 'father', category: 'people', gesture: one('thumb', 'head'), hint: hint('Бас бармақ маңдайда', 'Большой палец у лба', 'Thumb at the forehead') },
  { id: 'bala', kk: 'бала', ru: 'ребёнок', en: 'child', category: 'people', gesture: one('open', 'chest', 'nod'), hint: hint('Баланың басынан сипағандай', 'Как будто гладите ребёнка по голове', 'As if patting a child on the head') },
  { id: 'esim', kk: 'есім', ru: 'имя', en: 'name', category: 'people' },
  { id: 'erkek', kk: 'еркек', ru: 'мужчина', en: 'man', category: 'people' },
  { id: 'aiel', kk: 'әйел', ru: 'женщина', en: 'woman', category: 'people' },
  { id: 'otbasy', kk: 'отбасы', ru: 'семья', en: 'family', category: 'people', gesture: one('ok', 'chest', 'circle'), hint: hint('Бәрін бір шеңберге жинағандай', 'Все в одном круге', 'Everyone in one circle') },

  // ── Questions ─────────────────────────────────────────────────────────
  { id: 'kim', kk: 'кім', ru: 'кто', en: 'who', category: 'questions', question: true, gesture: one('point', 'face', 'nod'), hint: hint('Иек алдында саусақ қағу', 'Постукивание пальцем у подбородка', 'Tap a finger in front of the chin') },
  { id: 'ne', kk: 'не', ru: 'что', en: 'what', category: 'questions', question: true, gesture: two('open', 'open', 'apart', 'nod'), hint: hint('Екі алақан жоғары — «не?»', 'Обе ладони вверх — «что?»', 'Both palms up — “what?”') },
  { id: 'kaida', kk: 'қайда', ru: 'где / куда', en: 'where', category: 'questions', question: true, gesture: one('point', 'head', 'wave'), hint: hint('Жоғарыда саусақ шайқау', 'Покачать пальцем над головой', 'Wag a finger above your head') },
  { id: 'kashan', kk: 'қашан', ru: 'когда', en: 'when', category: 'questions', question: true, gesture: one('l', 'chest', 'circle'), hint: hint('Сағат тілі сияқты айналдыру', 'Круг, как стрелка часов', 'A circle, like a clock hand') },
  { id: 'kalai', kk: 'қалай', ru: 'как', en: 'how', category: 'questions', question: true, gesture: two('four', 'four', 'together', 'nod', 'face') },
  { id: 'kansha', kk: 'қанша', ru: 'сколько', en: 'how many / how much', category: 'questions', question: true, gesture: two('open', 'open', 'apart', 'wave') },
  { id: 'nege', kk: 'неге', ru: 'почему', en: 'why', category: 'questions', question: true, gesture: one('point', 'head', 'circle'), hint: hint('Маңдай тұсында ойланғандай шеңбер', 'Круг у лба, как будто размышляете', 'A circle at the forehead, as if thinking') },
  { id: 'kandai', kk: 'қандай', ru: 'какой', en: 'which / what kind', category: 'questions', question: true, gesture: one('call', 'chest', 'wave') },

  // ── Needs & help ──────────────────────────────────────────────────────
  { id: 'komek', kk: 'көмек', ru: 'помощь', en: 'help', category: 'needs', gesture: two('thumb', 'open', 'together'), hint: hint('Бас бармақты алақанға қойыңыз', 'Поставьте большой палец на ладонь', 'Put your thumb on your palm') },
  { id: 'kerek', kk: 'керек', ru: 'нужно', en: 'need', category: 'needs', gesture: one('l', 'chest', 'nod') },
  { id: 'su', kk: 'су', ru: 'вода', en: 'water', category: 'needs', gesture: one('three', 'face'), hint: hint('Үш саусақ ерінге', 'Три пальца у губ', 'Three fingers at the lips') },
  { id: 'tamak', kk: 'тамақ', ru: 'еда', en: 'food', category: 'needs', gesture: one('pinch', 'face'), hint: hint('Тамақты аузыңызға апарғандай', 'Как будто подносите еду ко рту', 'As if bringing food to your mouth') },
  { id: 'darethana', kk: 'дәретхана', ru: 'туалет', en: 'toilet', category: 'needs', gesture: one('pinky', 'chest', 'wave') },
  { id: 'dariger', kk: 'дәрігер', ru: 'врач', en: 'doctor', category: 'needs', gesture: two('pinch', 'open', 'together'), hint: hint('Тамыр ұстағандай — білекке', 'Как будто щупаете пульс на запястье', 'As if taking a pulse at the wrist') },
  { id: 'dari', kk: 'дәрі', ru: 'лекарство', en: 'medicine', category: 'needs', gesture: two('point', 'open', 'together', 'circle'), hint: hint('Алақанда дәрі араластырғандай', 'Как будто размешиваете лекарство на ладони', 'As if stirring medicine on your palm') },
  { id: 'auyrady', kk: 'ауырады', ru: 'болит', en: 'it hurts', category: 'needs', gesture: two('point', 'point', 'together', 'nod'), hint: hint('Сұқ саусақтарды бір-біріне қағыңыз', 'Указательные пальцы навстречу друг другу', 'Index fingers tapping towards each other') },
  { id: 'zhedel', kk: 'жедел жәрдем', ru: 'скорая помощь', en: 'ambulance', category: 'needs', gesture: one('open', 'head', 'circle'), hint: hint('Жарқыл шамы сияқты айналдыру', 'Вращение, как мигалка скорой', 'Spinning like an ambulance light') },
  { id: 'toktanyz', kk: 'тоқтаңыз', ru: 'стойте, стоп', en: 'stop, wait', category: 'needs', gesture: one('open', 'head'), hint: hint('Алақанды жоғары көтеріп ұстаңыз', 'Поднятая ладонь — стоп', 'A raised palm — stop') },

  // ── Actions ───────────────────────────────────────────────────────────
  { id: 'baru', kk: 'бару', ru: 'идти', en: 'go', category: 'actions', gesture: one('v', 'chest', 'still', 'down'), hint: hint('Екі саусақ төмен — адамның аяғы', 'Два пальца вниз — ноги', 'Two fingers down — legs') },
  { id: 'kelu', kk: 'келу', ru: 'приходить', en: 'come', category: 'actions', gesture: one('four', 'chest', 'nod'), hint: hint('Өзіңізге шақырғандай', 'Жест «иди сюда»', '“Come here” gesture') },
  { id: 'ishu', kk: 'ішу', ru: 'пить', en: 'drink', category: 'actions', gesture: one('thumb', 'face', 'nod'), hint: hint('Бас бармақ ауызға — ішкендей', 'Большой палец ко рту, как будто пьёте', 'Thumb to the mouth, as if drinking') },
  { id: 'zheu', kk: 'жеу', ru: 'есть, кушать', en: 'eat', category: 'actions', gesture: one('pinch', 'face', 'nod'), hint: hint('Ауызға бірнеше рет апарыңыз', 'Несколько раз ко рту', 'To the mouth several times') },
  { id: 'uiyktau', kk: 'ұйықтау', ru: 'спать', en: 'sleep', category: 'actions', gesture: two('four', 'four', 'together', 'still', 'face'), hint: hint('Алақандар жастық сияқты бетте', 'Ладони как подушка у щеки', 'Palms like a pillow at the cheek') },
  { id: 'soileu', kk: 'сөйлеу', ru: 'говорить', en: 'speak', category: 'actions', gesture: one('point', 'face', 'circle'), hint: hint('Ауыз алдында шеңбер', 'Круг перед ртом', 'A circle in front of the mouth') },
  { id: 'tyndau', kk: 'тыңдау', ru: 'слушать', en: 'listen', category: 'actions', gesture: one('point', 'face'), hint: hint('Құлаққа нұсқаңыз', 'Укажите на ухо', 'Point at your ear') },
  { id: 'koru', kk: 'көру', ru: 'видеть', en: 'see', category: 'actions', gesture: one('v', 'face'), hint: hint('Екі саусақ — екі көз', 'Два пальца — два глаза', 'Two fingers — two eyes') },
  { id: 'karau', kk: 'қарау', ru: 'смотреть', en: 'look, watch', category: 'actions' },
  { id: 'ushu', kk: 'ұшу', ru: 'летать', en: 'fly', category: 'actions' },
  { id: 'bilu', kk: 'білу', ru: 'знать', en: 'know', category: 'actions', gesture: one('point', 'head'), hint: hint('Маңдайға нұсқаңыз', 'Укажите на лоб', 'Point at your forehead') },
  { id: 'tusinu', kk: 'түсіну', ru: 'понимать', en: 'understand', category: 'actions', gesture: one('point', 'head', 'nod'), hint: hint('Маңдайды қағыңыз', 'Постучите по лбу', 'Tap your forehead') },
  { id: 'zhazu', kk: 'жазу', ru: 'писать', en: 'write', category: 'actions', gesture: two('pinch', 'open', 'together', 'wave'), hint: hint('Алақанға жазғандай', 'Как будто пишете на ладони', 'As if writing on your palm') },
  { id: 'oku', kk: 'оқу', ru: 'читать, учиться', en: 'read, study', category: 'actions', gesture: two('v', 'open', 'together', 'nod'), hint: hint('Алақаннан (кітаптан) оқығандай', 'Как будто читаете с ладони', 'As if reading from your palm') },
  { id: 'zhumys', kk: 'жұмыс', ru: 'работа', en: 'work', category: 'actions', gesture: two('fist', 'fist', 'together', 'nod', 'chest'), hint: hint('Жұдырықты жұдырыққа соғыңыз', 'Кулак по кулаку', 'Fist on fist') },
  { id: 'kutu', kk: 'күту', ru: 'ждать', en: 'wait', category: 'actions', gesture: one('l', 'chest'), hint: hint('«Бір сәт» белгісі', 'Знак «одну минуту»', '“One moment” sign') },
  { id: 'konyrau', kk: 'қоңырау шалу', ru: 'звонить', en: 'call (phone)', category: 'actions', gesture: one('call', 'face'), hint: hint('Телефон тұтқасы сияқты', 'Как телефонная трубка', 'Like a phone handset') },
  { id: 'oinau', kk: 'ойнау', ru: 'играть', en: 'play', category: 'actions', gesture: two('call', 'call', 'apart', 'wave') },

  // ── Feelings & states ─────────────────────────────────────────────────
  { id: 'zhaksy', kk: 'жақсы', ru: 'хорошо', en: 'good', category: 'feelings', gesture: one('thumb', 'chest', 'still', 'up'), hint: hint('Бас бармақ жоғары — «жақсы»', 'Большой палец вверх — «хорошо»', 'Thumbs up — “good”') },
  { id: 'zhaman', kk: 'жаман', ru: 'плохо', en: 'bad', category: 'feelings', gesture: one('thumb', 'chest', 'still', 'down'), hint: hint('Бас бармақ төмен — «жаман»', 'Большой палец вниз — «плохо»', 'Thumbs down — “bad”') },
  { id: 'kuanyshtymyn', kk: 'қуаныштымын', ru: 'я рад(а)', en: 'I am happy', category: 'feelings', gesture: one('four', 'chest', 'circle'), hint: hint('Жүрек тұсында шеңбер', 'Круг у сердца', 'A circle over the heart') },
  { id: 'kaigyly', kk: 'қайғылы', ru: 'грустно', en: 'sad', category: 'feelings', gesture: one('pinky', 'chest') },
  { id: 'sharshadym', kk: 'шаршадым', ru: 'я устал(а)', en: 'I am tired', category: 'feelings', gesture: two('four', 'four', 'together', 'nod', 'chest'), hint: hint('Кеудеде екі алақан салбырайды', 'Обе ладони «опускаются» на груди', 'Both palms “drop” on the chest') },
  { id: 'ashyktym', kk: 'ашықтым', ru: 'я голоден', en: 'I am hungry', category: 'feelings', gesture: one('pinch', 'chest', 'circle'), hint: hint('Асқазан тұсында шеңбер', 'Круг у живота', 'A circle at the stomach') },
  { id: 'sholdedim', kk: 'шөлдедім', ru: 'хочу пить', en: 'I am thirsty', category: 'feelings', gesture: one('three', 'face', 'circle'), hint: hint('«Су» белгісі шеңбермен', 'Знак «вода» с кругом', 'The “water” sign with a circle') },
  { id: 'suyk', kk: 'суық', ru: 'холодно', en: 'cold', category: 'feelings', gesture: two('fist', 'fist', 'apart', 'wave'), hint: hint('Тоңғандай дірілдеу', 'Дрожать, как от холода', 'Shiver as if from the cold') },
  { id: 'ystyk', kk: 'ыстық', ru: 'жарко', en: 'hot', category: 'feelings', gesture: one('open', 'face', 'wave'), hint: hint('Бетті желпігендей', 'Как будто обмахиваете лицо', 'As if fanning your face') },
  { id: 'korkamyn', kk: 'қорқамын', ru: 'мне страшно', en: 'I am scared', category: 'feelings', gesture: two('fist', 'fist', 'together', 'still', 'face'), hint: hint('Жұдырықтармен бетті жабу', 'Закрыть лицо кулаками', 'Cover your face with your fists') },
  { id: 'zhaksy_koremin', kk: 'жақсы көремін', ru: 'люблю', en: 'I love', category: 'feelings', gesture: one('ily', 'chest'), hint: hint('Халықаралық «сүйемін» белгісі', 'Международный знак «люблю»', 'The international “I love you” sign') },

  // ── Time ──────────────────────────────────────────────────────────────
  { id: 'bugin', kk: 'бүгін', ru: 'сегодня', en: 'today', category: 'time', gesture: one('call', 'chest', 'nod') },
  { id: 'erten', kk: 'ертең', ru: 'завтра', en: 'tomorrow', category: 'time', gesture: one('thumb', 'face', 'still', 'side'), hint: hint('Бас бармақ бетте, алға қарай', 'Большой палец у щеки, вперёд', 'Thumb at the cheek, forward') },
  { id: 'keshe', kk: 'кеше', ru: 'вчера', en: 'yesterday', category: 'time', gesture: one('l', 'face') },
  { id: 'kazir', kk: 'қазір', ru: 'сейчас', en: 'now', category: 'time', gesture: one('point', 'chest', 'nod'), hint: hint('«Дәл осы жерде» деп қағу', 'Постукивание «прямо сейчас»', 'A tap for “right now”') },
  { id: 'keiin', kk: 'кейін', ru: 'потом', en: 'later', category: 'time', gesture: one('thumb', 'chest', 'still', 'side'), hint: hint('Бас бармақ бүйірге — «кейінге»', 'Большой палец в сторону — «на потом»', 'Thumb to the side — “for later”') },
  { id: 'uakyt', kk: 'уақыт', ru: 'время', en: 'time', category: 'time', gesture: two('point', 'fist', 'together', 'nod'), hint: hint('Білектегі сағатты қағыңыз', 'Постучите по запястью, где часы', 'Tap your wrist where a watch would be') },
  { id: 'kun', kk: 'күн', ru: 'день', en: 'day', category: 'time', gesture: two('open', 'open', 'apart', 'still', 'head'), hint: hint('Күн сәулелері сияқты', 'Как лучи солнца', 'Like the rays of the sun') },
  { id: 'tun', kk: 'түн', ru: 'ночь', en: 'night', category: 'time', gesture: one('horns', 'head'), hint: hint('Ай орағы сияқты', 'Как серп луны', 'Like a crescent moon') },
  { id: 'tan', kk: 'таң', ru: 'утро, рассвет', en: 'dawn, morning', category: 'time' },
  { id: 'kesh', kk: 'кеш', ru: 'вечер', en: 'evening', category: 'time' },
  { id: 'apta', kk: 'апта', ru: 'неделя', en: 'week', category: 'time' },
  { id: 'ai', kk: 'ай', ru: 'месяц, луна', en: 'month, moon', category: 'time' },
  { id: 'zhyl', kk: 'жыл', ru: 'год', en: 'year', category: 'time' },

  // ── Places ────────────────────────────────────────────────────────────
  { id: 'ui', kk: 'үй', ru: 'дом', en: 'home', category: 'places', gesture: two('four', 'four', 'together', 'still', 'head'), hint: hint('Алақандармен шатыр жасаңыз', 'Сложите ладони крышей', 'Make a roof with your palms') },
  { id: 'mektep', kk: 'мектеп', ru: 'школа', en: 'school', category: 'places', gesture: two('open', 'open', 'together', 'nod'), hint: hint('Шапалақтағандай', 'Как хлопки в ладоши', 'Like clapping') },
  { id: 'aurukhana', kk: 'аурухана', ru: 'больница', en: 'hospital', category: 'places', gesture: two('v', 'open', 'together'), hint: hint('Төсекте жатқан адам', 'Человек лежит на кровати', 'A person lying in bed') },
  { id: 'duken', kk: 'дүкен', ru: 'магазин', en: 'shop', category: 'places', gesture: two('pinch', 'pinch', 'apart', 'nod') },
  { id: 'koshe', kk: 'көше', ru: 'улица', en: 'street', category: 'places', gesture: two('four', 'four', 'apart'), hint: hint('Екі алақан — жолдың екі жиегі', 'Две ладони — края дороги', 'Two palms — the edges of a road') },
  { id: 'avtobus', kk: 'автобус', ru: 'автобус', en: 'bus', category: 'places', gesture: two('fist', 'fist', 'apart', 'circle'), hint: hint('Рөлді бұрағандай', 'Как будто крутите руль', 'As if turning a steering wheel') },
  { id: 'kala', kk: 'қала', ru: 'город', en: 'city', category: 'places', gesture: two('four', 'four', 'together', 'wave'), hint: hint('Көп шатыр — көп үй', 'Много крыш — много домов', 'Many roofs — many houses') },
  { id: 'munda', kk: 'мұнда', ru: 'здесь', en: 'here', category: 'places', gesture: one('point', 'chest', 'still', 'down'), hint: hint('Төмен нұсқаңыз', 'Укажите вниз', 'Point down') },

  // ── Food ──────────────────────────────────────────────────────────────
  { id: 'nan', kk: 'нан', ru: 'хлеб', en: 'bread', category: 'food', gesture: two('four', 'open', 'together', 'wave'), hint: hint('Нан кескендей', 'Как будто режете хлеб', 'As if cutting bread') },
  { id: 'shai', kk: 'шай', ru: 'чай', en: 'tea', category: 'food', gesture: one('three', 'face', 'nod') },
  { id: 'sut', kk: 'сүт', ru: 'молоко', en: 'milk', category: 'food', gesture: one('fist', 'chest', 'wave') },
  { id: 'et', kk: 'ет', ru: 'мясо', en: 'meat', category: 'food', gesture: two('pinch', 'open', 'together', 'nod') },

  // ── Describing ────────────────────────────────────────────────────────
  { id: 'ulken', kk: 'үлкен', ru: 'большой', en: 'big', category: 'describe', gesture: two('l', 'l', 'apart'), hint: hint('Екі қолмен көлемді көрсету', 'Показать размер двумя руками', 'Show the size with both hands') },
  { id: 'kishkentai', kk: 'кішкентай', ru: 'маленький', en: 'small', category: 'describe', gesture: one('pinch', 'chest'), hint: hint('Кішкентай нәрсені шымшығандай', 'Щепотка — что-то маленькое', 'A pinch — something small') },
  { id: 'kop', kk: 'көп', ru: 'много', en: 'many, a lot', category: 'describe', gesture: two('open', 'open', 'together') },
  { id: 'az', kk: 'аз', ru: 'мало', en: 'few, a little', category: 'describe', gesture: one('ok', 'face') },
  { id: 'tagy', kk: 'тағы', ru: 'ещё', en: 'more, again', category: 'describe', gesture: two('pinch', 'pinch', 'together', 'nod'), hint: hint('Саусақ ұштарын түйістіріңіз', 'Соедините кончики пальцев', 'Touch your fingertips together') },

  // ── Things ────────────────────────────────────────────────────────────
  { id: 'aksha', kk: 'ақша', ru: 'деньги', en: 'money', category: 'things', gesture: one('pinch', 'chest', 'wave'), hint: hint('Саусақпен ақша санағандай', 'Как будто пересчитываете деньги', 'As if counting money') },
  { id: 'kitap', kk: 'кітап', ru: 'книга', en: 'book', category: 'things' },

  // ── Animals ───────────────────────────────────────────────────────────
  { id: 'it', kk: 'ит', ru: 'собака', en: 'dog', category: 'animals' },
  { id: 'mysyk', kk: 'мысық', ru: 'кошка', en: 'cat', category: 'animals' },
  { id: 'balyk', kk: 'балық', ru: 'рыба', en: 'fish', category: 'animals' },
  { id: 'kus', kk: 'құс', ru: 'птица', en: 'bird', category: 'animals' },

  // ── Colours ───────────────────────────────────────────────────────────
  { id: 'kyzyl', kk: 'қызыл', ru: 'красный', en: 'red', category: 'colors' },
  { id: 'kok', kk: 'көк', ru: 'синий, голубой', en: 'blue', category: 'colors' },
  { id: 'zhasyl', kk: 'жасыл', ru: 'зелёный', en: 'green', category: 'colors' },
  { id: 'ak', kk: 'ақ', ru: 'белый', en: 'white', category: 'colors' },
  { id: 'kara', kk: 'қара', ru: 'чёрный', en: 'black', category: 'colors' },
  { id: 'sary', kk: 'сары', ru: 'жёлтый', en: 'yellow', category: 'colors' },

  // ── Numbers ───────────────────────────────────────────────────────────
  { id: 'bir', kk: 'бір', ru: 'один', en: 'one', category: 'numbers', gesture: one('point', 'chest', 'still', 'up') },
  { id: 'eki', kk: 'екі', ru: 'два', en: 'two', category: 'numbers', gesture: one('v', 'chest', 'still', 'up') },
  { id: 'ush', kk: 'үш', ru: 'три', en: 'three', category: 'numbers', gesture: one('three', 'chest', 'still', 'up') },
  { id: 'tort', kk: 'төрт', ru: 'четыре', en: 'four', category: 'numbers', gesture: one('four', 'chest', 'still', 'up') },
  { id: 'bes', kk: 'бес', ru: 'пять', en: 'five', category: 'numbers', gesture: one('open', 'chest', 'still', 'up') },
];

export const VOCABULARY: readonly WordEntry[] = ENTRIES.map((w) => ({ ...w, ...GRAMMAR[w.id] }));

export const WORDS_BY_ID: ReadonlyMap<string, WordEntry> = new Map(VOCABULARY.map((w) => [w.id, w]));

/** Words that have one of Qoldau's own gestures, for the template matcher. */
export const TEMPLATE_WORDS = VOCABULARY.filter((w): w is WordEntry & { gesture: GestureSpec } => Boolean(w.gesture));
