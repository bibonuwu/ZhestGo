import type { Direction, GestureSpec, HandShape, Motion, Relation, SpecLocation } from '../gesture/types';
import type { Gram } from '../lang/kk/lexicon';
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
  | 'numbers';

export interface Bilingual {
  kk: string;
  ru: string;
}

export interface WordEntry {
  id: string;
  /** Kazakh word or phrase in dictionary form, lower case. */
  kk: string;
  ru: string;
  category: CategoryId;
  gesture: GestureSpec;
  /** Question words end the sentence with "?". */
  question?: boolean;
  /** Mnemonic shown in the dictionary. */
  hint?: Bilingual;
  /** Grammar used by the offline sentence builder (see data/grammar.ts). */
  gram?: Gram;
  /** What to say when the word is signed on its own. */
  alone?: string;
}

export const CATEGORIES: ReadonlyArray<{ id: CategoryId; label: Bilingual; icon: string }> = [
  { id: 'greetings', label: { kk: 'Сәлемдесу', ru: 'Приветствие' }, icon: '👋' },
  { id: 'people', label: { kk: 'Адамдар', ru: 'Люди' }, icon: '🧑' },
  { id: 'questions', label: { kk: 'Сұрақтар', ru: 'Вопросы' }, icon: '❓' },
  { id: 'needs', label: { kk: 'Қажеттілік', ru: 'Нужды' }, icon: '🆘' },
  { id: 'actions', label: { kk: 'Әрекеттер', ru: 'Действия' }, icon: '🏃' },
  { id: 'feelings', label: { kk: 'Сезімдер', ru: 'Чувства' }, icon: '💛' },
  { id: 'time', label: { kk: 'Уақыт', ru: 'Время' }, icon: '🕒' },
  { id: 'places', label: { kk: 'Орындар', ru: 'Места' }, icon: '🏠' },
  { id: 'food', label: { kk: 'Тамақ', ru: 'Еда' }, icon: '🍞' },
  { id: 'describe', label: { kk: 'Сипаттау', ru: 'Описание' }, icon: '📏' },
  { id: 'numbers', label: { kk: 'Сандар', ru: 'Числа' }, icon: '🔢' },
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

const hint = (kk: string, ru: string): Bilingual => ({ kk, ru });

/**
 * 100 everyday Kazakh words. The gestures are Qoldau's own simplified system,
 * designed to be reliably recognisable by a webcam — not official Kazakh Sign
 * Language. Real KSL signs can be taught on the training page.
 */
const ENTRIES: readonly WordEntry[] = [
  // ── Greetings & courtesy ──────────────────────────────────────────────
  { id: 'salemetsiz', kk: 'сәлеметсіз бе', ru: 'здравствуйте', category: 'greetings', gesture: one('open', 'head', 'wave'), hint: hint('Қолды жоғары көтеріп бұлғаңыз', 'Поднимите руку и помашите') },
  { id: 'salem', kk: 'сәлем', ru: 'привет', category: 'greetings', gesture: one('open', 'chest', 'wave') },
  { id: 'sau_bol', kk: 'сау болыңыз', ru: 'до свидания', category: 'greetings', gesture: one('four', 'head', 'wave'), hint: hint('Саусақтар жабық, бас деңгейінде қоштасу', 'Пальцы вместе, прощальный взмах') },
  { id: 'rakhmet', kk: 'рақмет', ru: 'спасибо', category: 'greetings', gesture: one('four', 'face', 'still'), hint: hint('Жазық алақан иекте — алғыс белгісі', 'Ровная ладонь у подбородка — благодарность') },
  { id: 'keshiriniz', kk: 'кешіріңіз', ru: 'извините', category: 'greetings', gesture: one('fist', 'chest', 'circle'), hint: hint('Жұдырықпен кеудеде шеңбер', 'Кулаком круг на груди') },
  { id: 'otinemin', kk: 'өтінемін', ru: 'пожалуйста', category: 'greetings', gesture: one('open', 'chest', 'circle'), hint: hint('Алақанмен кеудеде шеңбер', 'Ладонью круг на груди') },
  { id: 'ia', kk: 'иә', ru: 'да', category: 'greetings', gesture: one('fist', 'chest', 'nod'), hint: hint('Жұдырық басты изегендей қағылады', 'Кулак «кивает», как голова') },
  { id: 'zhok', kk: 'жоқ', ru: 'нет', category: 'greetings', gesture: one('point', 'face', 'wave'), hint: hint('Саусақпен «жоқ» деп шайқаңыз', 'Покачайте пальцем «нет»') },
  { id: 'zharaidy', kk: 'жарайды', ru: 'хорошо, ладно', category: 'greetings', gesture: one('ok', 'chest'), hint: hint('«ОК» белгісі', 'Знак «ОК»') },
  { id: 'kosh_keldiniz', kk: 'қош келдіңіз', ru: 'добро пожаловать', category: 'greetings', gesture: two('open', 'open', 'apart', 'still', 'chest'), hint: hint('Құшақ жайғандай', 'Как будто раскрываете объятия') },
  { id: 'tanyskanyma', kk: 'танысқаныма қуаныштымын', ru: 'рад знакомству', category: 'greetings', gesture: two('four', 'four', 'together', 'still', 'chest'), hint: hint('Қол алысқандай', 'Как рукопожатие') },
  { id: 'kuttyktaimyn', kk: 'құттықтаймын', ru: 'поздравляю', category: 'greetings', gesture: two('thumb', 'thumb', 'apart'), hint: hint('Екі бас бармақ жоғары', 'Два больших пальца вверх') },

  // ── People & pronouns ─────────────────────────────────────────────────
  { id: 'men', kk: 'мен', ru: 'я', category: 'people', gesture: one('four', 'chest', 'still', 'side'), hint: hint('Алақанды кеудеге басыңыз', 'Прижмите ладонь к груди') },
  { id: 'sen', kk: 'сен', ru: 'ты', category: 'people', gesture: one('point', 'chest', 'still', 'forward'), hint: hint('Камераға (әңгімелесушіге) нұсқаңыз', 'Укажите на камеру (собеседника)') },
  { id: 'siz', kk: 'сіз', ru: 'вы', category: 'people', gesture: one('open', 'chest', 'still', 'forward'), hint: hint('Алақанды жоғары қаратып ұсыныңыз', 'Протяните ладонь вверх') },
  { id: 'ol', kk: 'ол', ru: 'он / она', category: 'people', gesture: one('point', 'chest', 'still', 'side'), hint: hint('Бүйірге нұсқаңыз', 'Укажите в сторону') },
  { id: 'biz', kk: 'біз', ru: 'мы', category: 'people', gesture: one('point', 'chest', 'circle'), hint: hint('Айналаны шеңбермен көрсетіңіз', 'Обведите круг вокруг себя') },
  { id: 'olar', kk: 'олар', ru: 'они', category: 'people', gesture: one('point', 'chest', 'wave'), hint: hint('Бірнеше адамды нұсқағандай', 'Как будто указываете на нескольких людей') },
  { id: 'adam', kk: 'адам', ru: 'человек', category: 'people', gesture: one('k', 'chest') },
  { id: 'dos', kk: 'дос', ru: 'друг', category: 'people', gesture: two('point', 'point', 'together'), hint: hint('Екі сұқ саусақты ілестіріңіз', 'Сцепите указательные пальцы') },
  { id: 'ana', kk: 'ана', ru: 'мама', category: 'people', gesture: one('thumb', 'face', 'still', 'up'), hint: hint('Бас бармақ иекте', 'Большой палец у подбородка') },
  { id: 'ake', kk: 'әке', ru: 'папа', category: 'people', gesture: one('thumb', 'head'), hint: hint('Бас бармақ маңдайда', 'Большой палец у лба') },
  { id: 'bala', kk: 'бала', ru: 'ребёнок', category: 'people', gesture: one('open', 'chest', 'nod'), hint: hint('Баланың басынан сипағандай', 'Как будто гладите ребёнка по голове') },
  { id: 'otbasy', kk: 'отбасы', ru: 'семья', category: 'people', gesture: one('ok', 'chest', 'circle'), hint: hint('Бәрін бір шеңберге жинағандай', 'Все в одном круге') },

  // ── Questions ─────────────────────────────────────────────────────────
  { id: 'kim', kk: 'кім', ru: 'кто', category: 'questions', question: true, gesture: one('point', 'face', 'nod'), hint: hint('Иек алдында саусақ қағу', 'Постукивание пальцем у подбородка') },
  { id: 'ne', kk: 'не', ru: 'что', category: 'questions', question: true, gesture: two('open', 'open', 'apart', 'nod'), hint: hint('Екі алақан жоғары — «не?»', 'Обе ладони вверх — «что?»') },
  { id: 'kaida', kk: 'қайда', ru: 'где / куда', category: 'questions', question: true, gesture: one('point', 'head', 'wave'), hint: hint('Жоғарыда саусақ шайқау', 'Покачать пальцем над головой') },
  { id: 'kashan', kk: 'қашан', ru: 'когда', category: 'questions', question: true, gesture: one('l', 'chest', 'circle'), hint: hint('Сағат тілі сияқты айналдыру', 'Круг, как стрелка часов') },
  { id: 'kalai', kk: 'қалай', ru: 'как', category: 'questions', question: true, gesture: two('four', 'four', 'together', 'nod', 'face') },
  { id: 'kansha', kk: 'қанша', ru: 'сколько', category: 'questions', question: true, gesture: two('open', 'open', 'apart', 'wave') },
  { id: 'nege', kk: 'неге', ru: 'почему', category: 'questions', question: true, gesture: one('point', 'head', 'circle'), hint: hint('Маңдай тұсында ойланғандай шеңбер', 'Круг у лба, как будто размышляете') },
  { id: 'kandai', kk: 'қандай', ru: 'какой', category: 'questions', question: true, gesture: one('call', 'chest', 'wave') },

  // ── Needs & help ──────────────────────────────────────────────────────
  { id: 'komek', kk: 'көмек', ru: 'помощь', category: 'needs', gesture: two('thumb', 'open', 'together'), hint: hint('Бас бармақты алақанға қойыңыз', 'Поставьте большой палец на ладонь') },
  { id: 'kerek', kk: 'керек', ru: 'нужно', category: 'needs', gesture: one('l', 'chest', 'nod') },
  { id: 'su', kk: 'су', ru: 'вода', category: 'needs', gesture: one('three', 'face'), hint: hint('Үш саусақ ерінге', 'Три пальца у губ') },
  { id: 'tamak', kk: 'тамақ', ru: 'еда', category: 'needs', gesture: one('pinch', 'face'), hint: hint('Тамақты аузыңызға апарғандай', 'Как будто подносите еду ко рту') },
  { id: 'darethana', kk: 'дәретхана', ru: 'туалет', category: 'needs', gesture: one('pinky', 'chest', 'wave') },
  { id: 'dariger', kk: 'дәрігер', ru: 'врач', category: 'needs', gesture: two('pinch', 'open', 'together'), hint: hint('Тамыр ұстағандай — білекке', 'Как будто щупаете пульс на запястье') },
  { id: 'dari', kk: 'дәрі', ru: 'лекарство', category: 'needs', gesture: two('point', 'open', 'together', 'circle'), hint: hint('Алақанда дәрі араластырғандай', 'Как будто размешиваете лекарство на ладони') },
  { id: 'auyrady', kk: 'ауырады', ru: 'болит', category: 'needs', gesture: two('point', 'point', 'together', 'nod'), hint: hint('Сұқ саусақтарды бір-біріне қағыңыз', 'Указательные пальцы навстречу друг другу') },
  { id: 'zhedel', kk: 'жедел жәрдем', ru: 'скорая помощь', category: 'needs', gesture: one('open', 'head', 'circle'), hint: hint('Жарқыл шамы сияқты айналдыру', 'Вращение, как мигалка скорой') },
  { id: 'toktanyz', kk: 'тоқтаңыз', ru: 'стойте, стоп', category: 'needs', gesture: one('open', 'head'), hint: hint('Алақанды жоғары көтеріп ұстаңыз', 'Поднятая ладонь — стоп') },
  { id: 'aksha', kk: 'ақша', ru: 'деньги', category: 'needs', gesture: one('pinch', 'chest', 'wave'), hint: hint('Саусақпен ақша санағандай', 'Как будто пересчитываете деньги') },

  // ── Actions ───────────────────────────────────────────────────────────
  { id: 'baru', kk: 'бару', ru: 'идти', category: 'actions', gesture: one('v', 'chest', 'still', 'down'), hint: hint('Екі саусақ төмен — адамның аяғы', 'Два пальца вниз — ноги') },
  { id: 'kelu', kk: 'келу', ru: 'приходить', category: 'actions', gesture: one('four', 'chest', 'nod'), hint: hint('Өзіңізге шақырғандай', 'Жест «иди сюда»') },
  { id: 'ishu', kk: 'ішу', ru: 'пить', category: 'actions', gesture: one('thumb', 'face', 'nod'), hint: hint('Бас бармақ ауызға — ішкендей', 'Большой палец ко рту, как будто пьёте') },
  { id: 'zheu', kk: 'жеу', ru: 'есть, кушать', category: 'actions', gesture: one('pinch', 'face', 'nod'), hint: hint('Ауызға бірнеше рет апарыңыз', 'Несколько раз ко рту') },
  { id: 'uiyktau', kk: 'ұйықтау', ru: 'спать', category: 'actions', gesture: two('four', 'four', 'together', 'still', 'face'), hint: hint('Алақандар жастық сияқты бетте', 'Ладони как подушка у щеки') },
  { id: 'soileu', kk: 'сөйлеу', ru: 'говорить', category: 'actions', gesture: one('point', 'face', 'circle'), hint: hint('Ауыз алдында шеңбер', 'Круг перед ртом') },
  { id: 'tyndau', kk: 'тыңдау', ru: 'слушать', category: 'actions', gesture: one('point', 'face'), hint: hint('Құлаққа нұсқаңыз', 'Укажите на ухо') },
  { id: 'koru', kk: 'көру', ru: 'видеть', category: 'actions', gesture: one('v', 'face'), hint: hint('Екі саусақ — екі көз', 'Два пальца — два глаза') },
  { id: 'bilu', kk: 'білу', ru: 'знать', category: 'actions', gesture: one('point', 'head'), hint: hint('Маңдайға нұсқаңыз', 'Укажите на лоб') },
  { id: 'tusinu', kk: 'түсіну', ru: 'понимать', category: 'actions', gesture: one('point', 'head', 'nod'), hint: hint('Маңдайды қағыңыз', 'Постучите по лбу') },
  { id: 'zhazu', kk: 'жазу', ru: 'писать', category: 'actions', gesture: two('pinch', 'open', 'together', 'wave'), hint: hint('Алақанға жазғандай', 'Как будто пишете на ладони') },
  { id: 'oku', kk: 'оқу', ru: 'читать, учиться', category: 'actions', gesture: two('v', 'open', 'together', 'nod'), hint: hint('Алақаннан (кітаптан) оқығандай', 'Как будто читаете с ладони') },
  { id: 'zhumys', kk: 'жұмыс', ru: 'работа', category: 'actions', gesture: two('fist', 'fist', 'together', 'nod', 'chest'), hint: hint('Жұдырықты жұдырыққа соғыңыз', 'Кулак по кулаку') },
  { id: 'kutu', kk: 'күту', ru: 'ждать', category: 'actions', gesture: one('l', 'chest'), hint: hint('«Бір сәт» белгісі', 'Знак «одну минуту»') },
  { id: 'konyrau', kk: 'қоңырау шалу', ru: 'звонить', category: 'actions', gesture: one('call', 'face'), hint: hint('Телефон тұтқасы сияқты', 'Как телефонная трубка') },
  { id: 'oinau', kk: 'ойнау', ru: 'играть', category: 'actions', gesture: two('call', 'call', 'apart', 'wave') },

  // ── Feelings & states ─────────────────────────────────────────────────
  { id: 'zhaksy', kk: 'жақсы', ru: 'хорошо', category: 'feelings', gesture: one('thumb', 'chest', 'still', 'up'), hint: hint('👍', '👍') },
  { id: 'zhaman', kk: 'жаман', ru: 'плохо', category: 'feelings', gesture: one('thumb', 'chest', 'still', 'down'), hint: hint('👎', '👎') },
  { id: 'kuanyshtymyn', kk: 'қуаныштымын', ru: 'я рад(а)', category: 'feelings', gesture: one('four', 'chest', 'circle'), hint: hint('Жүрек тұсында шеңбер', 'Круг у сердца') },
  { id: 'kaigyly', kk: 'қайғылы', ru: 'грустно', category: 'feelings', gesture: one('pinky', 'chest') },
  { id: 'sharshadym', kk: 'шаршадым', ru: 'я устал(а)', category: 'feelings', gesture: two('four', 'four', 'together', 'nod', 'chest'), hint: hint('Кеудеде екі алақан салбырайды', 'Обе ладони «опускаются» на груди') },
  { id: 'ashyktym', kk: 'ашықтым', ru: 'я голоден', category: 'feelings', gesture: one('pinch', 'chest', 'circle'), hint: hint('Асқазан тұсында шеңбер', 'Круг у живота') },
  { id: 'sholdedim', kk: 'шөлдедім', ru: 'хочу пить', category: 'feelings', gesture: one('three', 'face', 'circle'), hint: hint('«Су» белгісі шеңбермен', 'Знак «вода» с кругом') },
  { id: 'suyk', kk: 'суық', ru: 'холодно', category: 'feelings', gesture: two('fist', 'fist', 'apart', 'wave'), hint: hint('Тоңғандай дірілдеу', 'Дрожать, как от холода') },
  { id: 'ystyk', kk: 'ыстық', ru: 'жарко', category: 'feelings', gesture: one('open', 'face', 'wave'), hint: hint('Бетті желпігендей', 'Как будто обмахиваете лицо') },
  { id: 'korkamyn', kk: 'қорқамын', ru: 'мне страшно', category: 'feelings', gesture: two('fist', 'fist', 'together', 'still', 'face'), hint: hint('Жұдырықтармен бетті жабу', 'Закрыть лицо кулаками') },
  { id: 'zhaksy_koremin', kk: 'жақсы көремін', ru: 'люблю', category: 'feelings', gesture: one('ily', 'chest'), hint: hint('🤟 — халықаралық «сүйемін» белгісі', '🤟 — международный знак «люблю»') },

  // ── Time ──────────────────────────────────────────────────────────────
  { id: 'bugin', kk: 'бүгін', ru: 'сегодня', category: 'time', gesture: one('call', 'chest', 'nod') },
  { id: 'erten', kk: 'ертең', ru: 'завтра', category: 'time', gesture: one('thumb', 'face', 'still', 'side'), hint: hint('Бас бармақ бетте, алға қарай', 'Большой палец у щеки, вперёд') },
  { id: 'keshe', kk: 'кеше', ru: 'вчера', category: 'time', gesture: one('l', 'face') },
  { id: 'kazir', kk: 'қазір', ru: 'сейчас', category: 'time', gesture: one('point', 'chest', 'nod'), hint: hint('«Дәл осы жерде» деп қағу', 'Постукивание «прямо сейчас»') },
  { id: 'keiin', kk: 'кейін', ru: 'потом', category: 'time', gesture: one('thumb', 'chest', 'still', 'side'), hint: hint('Бас бармақ бүйірге — «кейінге»', 'Большой палец в сторону — «на потом»') },
  { id: 'uakyt', kk: 'уақыт', ru: 'время', category: 'time', gesture: two('point', 'fist', 'together', 'nod'), hint: hint('Білектегі сағатты қағыңыз', 'Постучите по запястью, где часы') },
  { id: 'kun', kk: 'күн', ru: 'день', category: 'time', gesture: two('open', 'open', 'apart', 'still', 'head'), hint: hint('Күн сәулелері сияқты', 'Как лучи солнца') },
  { id: 'tun', kk: 'түн', ru: 'ночь', category: 'time', gesture: one('horns', 'head'), hint: hint('Ай орағы сияқты', 'Как серп луны') },

  // ── Places ────────────────────────────────────────────────────────────
  { id: 'ui', kk: 'үй', ru: 'дом', category: 'places', gesture: two('four', 'four', 'together', 'still', 'head'), hint: hint('Алақандармен шатыр жасаңыз', 'Сложите ладони крышей') },
  { id: 'mektep', kk: 'мектеп', ru: 'школа', category: 'places', gesture: two('open', 'open', 'together', 'nod'), hint: hint('Шапалақтағандай', 'Как хлопки в ладоши') },
  { id: 'aurukhana', kk: 'аурухана', ru: 'больница', category: 'places', gesture: two('v', 'open', 'together'), hint: hint('Төсекте жатқан адам', 'Человек лежит на кровати') },
  { id: 'duken', kk: 'дүкен', ru: 'магазин', category: 'places', gesture: two('pinch', 'pinch', 'apart', 'nod') },
  { id: 'koshe', kk: 'көше', ru: 'улица', category: 'places', gesture: two('four', 'four', 'apart'), hint: hint('Екі алақан — жолдың екі жиегі', 'Две ладони — края дороги') },
  { id: 'avtobus', kk: 'автобус', ru: 'автобус', category: 'places', gesture: two('fist', 'fist', 'apart', 'circle'), hint: hint('Рөлді бұрағандай', 'Как будто крутите руль') },
  { id: 'kala', kk: 'қала', ru: 'город', category: 'places', gesture: two('four', 'four', 'together', 'wave'), hint: hint('Көп шатыр — көп үй', 'Много крыш — много домов') },
  { id: 'munda', kk: 'мұнда', ru: 'здесь', category: 'places', gesture: one('point', 'chest', 'still', 'down'), hint: hint('Төмен нұсқаңыз', 'Укажите вниз') },

  // ── Food ──────────────────────────────────────────────────────────────
  { id: 'nan', kk: 'нан', ru: 'хлеб', category: 'food', gesture: two('four', 'open', 'together', 'wave'), hint: hint('Нан кескендей', 'Как будто режете хлеб') },
  { id: 'shai', kk: 'шай', ru: 'чай', category: 'food', gesture: one('three', 'face', 'nod') },
  { id: 'sut', kk: 'сүт', ru: 'молоко', category: 'food', gesture: one('fist', 'chest', 'wave') },
  { id: 'et', kk: 'ет', ru: 'мясо', category: 'food', gesture: two('pinch', 'open', 'together', 'nod') },

  // ── Describing ────────────────────────────────────────────────────────
  { id: 'ulken', kk: 'үлкен', ru: 'большой', category: 'describe', gesture: two('l', 'l', 'apart'), hint: hint('Екі қолмен көлемді көрсету', 'Показать размер двумя руками') },
  { id: 'kishkentai', kk: 'кішкентай', ru: 'маленький', category: 'describe', gesture: one('pinch', 'chest'), hint: hint('Кішкентай нәрсені шымшығандай', 'Щепотка — что-то маленькое') },
  { id: 'kop', kk: 'көп', ru: 'много', category: 'describe', gesture: two('open', 'open', 'together') },
  { id: 'az', kk: 'аз', ru: 'мало', category: 'describe', gesture: one('ok', 'face') },
  { id: 'tagy', kk: 'тағы', ru: 'ещё', category: 'describe', gesture: two('pinch', 'pinch', 'together', 'nod'), hint: hint('Саусақ ұштарын түйістіріңіз', 'Соедините кончики пальцев') },

  // ── Numbers ───────────────────────────────────────────────────────────
  { id: 'bir', kk: 'бір', ru: 'один', category: 'numbers', gesture: one('point', 'chest', 'still', 'up') },
  { id: 'eki', kk: 'екі', ru: 'два', category: 'numbers', gesture: one('v', 'chest', 'still', 'up') },
  { id: 'ush', kk: 'үш', ru: 'три', category: 'numbers', gesture: one('three', 'chest', 'still', 'up') },
  { id: 'tort', kk: 'төрт', ru: 'четыре', category: 'numbers', gesture: one('four', 'chest', 'still', 'up') },
  { id: 'bes', kk: 'бес', ru: 'пять', category: 'numbers', gesture: one('open', 'chest', 'still', 'up') },
];

export const VOCABULARY: readonly WordEntry[] = ENTRIES.map((w) => ({ ...w, ...GRAMMAR[w.id] }));

export const WORDS_BY_ID: ReadonlyMap<string, WordEntry> = new Map(VOCABULARY.map((w) => [w.id, w]));
