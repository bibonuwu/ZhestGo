import type { Lang } from './gestureText';

/**
 * Terms of Use and Privacy Policy, shown from the cookie banner, the sign-up
 * form and the privacy page (components/TermsDialog.tsx). It describes what
 * the site actually does: keep it in step with the code when that changes.
 * `**text**` is bold; {telegram} and {authors} are filled in when shown.
 */
export interface TermsSection {
  title: string;
  /** Paragraphs. */
  text?: string[];
  /** A bulleted list after the paragraphs. */
  items?: string[];
}

export interface Terms {
  title: string;
  updated: string;
  intro: string;
  sections: TermsSection[];
}

export const TERMS: Record<Lang, Terms> = {
  kk: {
    title: 'Пайдалану шарттары және Құпиялылық саясаты',
    updated: 'Жаңартылған күні: 2026 жылғы 17 қазан',
    intro:
      'Qoldau — тегін оқу сайты: қазақ ым тілінің бейнесабақтары және жестерді қазақша сөзге айналдыратын камера. Мұнда сайтты қандай шарттармен пайдаланатыныңыз, қандай деректеріңізді және не үшін өңдейтініміз қарапайым тілмен жазылған.',
    sections: [
      {
        title: 'Қандай деректерді не үшін өңдейміз',
        items: [
          '**Камерадағы бейне** — тек жестерді тану үшін. Ол браузердің ішінде өңделеді: ешқайда жіберілмейді және өзіңіз жазба жасамайынша сақталмайды.',
          '**«Үйрету» бетіндегі жазбалар** — камера сіздің жест нұсқаңызды тануы үшін және жазбаны қайта көре алуыңыз үшін. Осы браузердің жадында сақталады: қол нүктелерінің координаттары, бір кадр және қысқа бейне (2,5 с). Серверге жіберілмейді. Бейнені құрылғыңызға сақтай немесе өшіре аласыз.',
          '**Сабақтардағы прогресс және тексеру нәтижелері** — үйренген сөздерді белгілеу және нәтижеңізді рейтингке қосу үшін. Браузерде, ал аккаунтқа кірсеңіз, Firebase-тегі профиліңізде де сақталады.',
          '**Аккаунт** (есім, электрондық пошта, құпиясөз) — кез келген құрылғыдан кіру және рейтингке қатысу үшін. Құпиясөзді Firebase Authentication сақтайды, біз оны көрмейміз. Рейтингте барлығына тек есіміңіз бен үйренген жест саны көрінеді.',
          '**Ортақ чаттағы хабарламалар** — басқа үйренушілермен сөйлесу үшін. Есіміңізбен бірге сақталады және барлық тіркелген қолданушыларға көрінеді.',
          '**Хабарламалар мен пікірлер** («Қате туралы хабарлау» және «Кері байланыс» батырмалары) — қателерді түзету және сайтты жақсарту үшін. Мәтін, таңдалған себеп, қай сабақ не фраза туралы екені, интерфейс тілі, уақыт және, аккаунтқа кірсеңіз, аккаунт идентификаторы сақталады; байланыс деректері — тек өзіңіз жазсаңыз. Оларды тек Qoldau командасы көреді.',
          '**Баптаулар, фразалар тарихы, офлайн дауыс** — сайт сіз баптағандай, интернетсіз де жұмыс істеуі үшін. Тек браузерде сақталады.',
        ],
      },
      {
        title: 'Cookie файлдары және браузер жады',
        text: [
          'Жарнамалық және бақылау cookie файлдары, келушілер санағыштары жоқ. Браузер жады аккаунтқа кіру үшін және жоғарыдағы деректерді сақтау үшін керек.',
          '«Рұқсат беру» — браузерді жапқаннан кейін де аккаунтта қаласыз; «Тек қажеттілері» — браузер жабылғанда аккаунттан шығасыз. Таңдауды «Құпиялылық және cookie» бетінде кез келген уақытта өзгертуге болады.',
        ],
      },
      {
        title: 'Деректер қайда сақталады және оларды кім алады',
        items: [
          'Құрылғыңызда — төменде аталмаған деректердің бәрі.',
          'Google Firebase (серверлер Германияда, europe-west3 өңірі): аккаунт, рейтингтегі профиль, чат, хабарламалар мен пікірлер. Сайттың өзі де Firebase Hosting-те орналасқан.',
          'Жестерді тану модельдері Google серверлерінен, қазақ дауысы Hugging Face-тен жүктеледі: оларға тек файлды жүктеу сұрауы жіберіледі.',
          'Біз деректеріңізді сатпаймыз, үшінші тұлғаларға бермейміз және жарнама көрсетпейміз.',
        ],
      },
      {
        title: 'Деректер қанша сақталады және оларды қалай өшіруге болады',
        items: [
          'Браузердегі деректер — өзіңіз өшіргенше: «Үйрету» бетіндегі «Жазбаны өшіру» мен «Барлығын өшіру», баптаулардағы дауыстың «Өшіру» батырмасы немесе браузерде сайт деректерін тазалау.',
          'Аккаунт, профиль және чат хабарламалары — аккаунтты өшіргенше («Құпиялылық және cookie» беті).',
          'Хабарламалар мен пікірлер — сайтты жақсартуға керек болғанша. Telegram арқылы сұрасаңыз, өшіреміз.',
        ],
      },
      {
        title: 'Сайтты пайдалану ережелері',
        items: [
          'Сайт тегін, оқу мен қарым-қатынасқа арналған. Тану қателесуі мүмкін: шұғыл жағдайда оған сүйенбеңіз, маңызды әңгімеге ым тілі аудармашысы керек.',
          'Бейнесабақтарды Qoldau командасы түсірді. Оларды көріп, оқуға пайдалана аласыз; авторлардың рұқсатынсыз коммерциялық мақсатта көшіруге және таратуға болмайды.',
          'Чатқа, хабарламалар мен пікірлерге балағат сөз, жарнама және басқа адамдардың жеке деректерін жазбаңыз — ондай хабарламалар өшіріледі.',
          'Балаларға ата-анасымен бірге тіркелген дұрыс.',
          'Біз сайтты және осы шарттарды жаңартып отыруымыз мүмкін; соңғы өзгеріс күні жоғарыда көрсетілген.',
        ],
      },
      {
        title: 'Бізбен байланыс',
        text: [
          'Деректер туралы сұрақтар мен өшіру өтініштері — Telegram: {telegram} немесе сайттың төменгі жағындағы «Кері байланыс» батырмасы. Авторлары: {authors}.',
        ],
      },
    ],
  },
  ru: {
    title: 'Условия использования и Политика конфиденциальности',
    updated: 'Обновлено 17 октября 2026 года',
    intro:
      'Qoldau — бесплатный учебный сайт: видеоуроки казахского жестового языка и камера, которая превращает жесты в казахскую речь. Здесь простыми словами написано, на каких условиях вы пользуетесь сайтом, какие ваши данные мы обрабатываем и для чего.',
    sections: [
      {
        title: 'Какие данные и для чего мы обрабатываем',
        items: [
          '**Видео с камеры** — только чтобы распознавать жесты. Оно обрабатывается прямо в браузере: никуда не отправляется и не сохраняется, пока вы сами не запишете дубль.',
          '**Дубли на странице «Обучение»** — чтобы камера узнавала именно ваш вариант жеста и вы могли пересмотреть запись. Хранятся в памяти этого браузера: координаты точек руки, один кадр и короткое видео (2,5 с). На сервер не отправляются. Видео можно сохранить на своё устройство или удалить.',
          '**Прогресс в уроках и результаты проверки** — чтобы отмечать выученные слова и добавлять ваш результат в рейтинг. Хранятся в браузере, а если вы вошли в аккаунт, — ещё и в вашем профиле в Firebase.',
          '**Аккаунт** (имя, электронная почта, пароль) — чтобы входить с любого устройства и участвовать в рейтинге. Пароль хранит Firebase Authentication, мы его не видим. В рейтинге всем видны только ваше имя и число выученных жестов.',
          '**Сообщения в общем чате** — чтобы общаться с другими учениками. Хранятся вместе с вашим именем и видны всем зарегистрированным пользователям.',
          '**Жалобы и отзывы** (кнопки «Сообщить о проблеме» и «Обратная связь») — чтобы исправлять ошибки и улучшать сайт. Сохраняются текст, выбранная причина, о каком уроке или фразе речь, язык интерфейса, время и, если вы вошли, идентификатор аккаунта; контакт — только если вы его оставите. Их видит только команда Qoldau.',
          '**Настройки, история фраз, офлайн-голос** — чтобы сайт работал так, как вы его настроили, в том числе без интернета. Хранятся только в браузере.',
        ],
      },
      {
        title: 'Файлы cookie и память браузера',
        text: [
          'Рекламных и следящих cookie и счётчиков посещений нет. Память браузера нужна, чтобы сохранять вход в аккаунт и данные, перечисленные выше.',
          '«Разрешить» — вы остаётесь в аккаунте и после закрытия браузера; «Только необходимые» — выходите из аккаунта при его закрытии. Выбор можно изменить в любой момент на странице «Конфиденциальность и cookie».',
        ],
      },
      {
        title: 'Где хранятся данные и кто их получает',
        items: [
          'На вашем устройстве — всё, что не перечислено ниже.',
          'Google Firebase (серверы в Германии, регион europe-west3): аккаунт, профиль в рейтинге, чат, жалобы и отзывы. Сам сайт тоже размещён на Firebase Hosting.',
          'Модели распознавания жестов загружаются с серверов Google, казахский голос — с Hugging Face: им передаётся только обычный запрос на скачивание файла.',
          'Мы не продаём ваши данные, не передаём их третьим лицам и не показываем рекламу.',
        ],
      },
      {
        title: 'Сколько хранятся данные и как их удалить',
        items: [
          'Данные в браузере — пока вы их не удалите: кнопки «Удалить дубль» и «Удалить всё» на странице «Обучение», «Удалить» у голоса в настройках или очистка данных сайта в браузере.',
          'Аккаунт, профиль и сообщения чата — пока вы не удалите аккаунт (страница «Конфиденциальность и cookie»).',
          'Жалобы и отзывы — пока они нужны для улучшения сайта. Удалим по вашей просьбе в Telegram.',
        ],
      },
      {
        title: 'Правила пользования сайтом',
        items: [
          'Сайт бесплатный и предназначен для обучения и общения. Распознавание может ошибаться: не полагайтесь на него в экстренных ситуациях, для важного разговора нужен переводчик жестового языка.',
          'Видеоуроки сняла команда Qoldau. Их можно смотреть и использовать для учёбы; копировать и распространять их в коммерческих целях без разрешения авторов нельзя.',
          'Не пишите в чат, жалобы и отзывы оскорбления, рекламу и чужие личные данные — такие сообщения удаляются.',
          'Детям лучше регистрироваться вместе с родителями.',
          'Мы можем обновлять сайт и эти условия; дата последнего изменения указана вверху.',
        ],
      },
      {
        title: 'Связь с нами',
        text: [
          'Вопросы о данных и просьбы об удалении — в Telegram: {telegram} или через кнопку «Обратная связь» внизу сайта. Авторы: {authors}.',
        ],
      },
    ],
  },
  en: {
    title: 'Terms of Use and Privacy Policy',
    updated: 'Updated 17 October 2026',
    intro:
      'Qoldau is a free learning website: video lessons of Kazakh Sign Language and a camera that turns signs into spoken Kazakh. This page explains in plain words the terms of using the site, which of your data we process and why.',
    sections: [
      {
        title: 'What data we process and why',
        items: [
          '**Camera video** — only to recognise signs. It is processed right in your browser: never sent anywhere and not stored unless you record a take yourself.',
          '**Takes on the Train page** — so the camera recognises your own way of signing and you can watch a take again. Stored in this browser: hand landmark coordinates, one frame and a short video (2.5 s). Never sent to a server. You can save the video to your device or delete it.',
          '**Lesson progress and check results** — to mark the words you have learned and add your result to the leaderboard. Stored in the browser and, if you are signed in, in your Firebase profile.',
          '**Account** (name, e-mail, password) — to sign in from any device and take part in the leaderboard. The password is kept by Firebase Authentication; we never see it. On the leaderboard everyone sees only your name and the number of signs you have learned.',
          '**Community chat messages** — to talk to other learners. Stored with your name and visible to all registered users.',
          '**Reports and feedback** (the “Report a problem” and “Feedback” buttons) — to fix mistakes and improve the site. We store the text, the chosen reason, which lesson or phrase it is about, the interface language, the time and, if you are signed in, your account ID; contact details only if you leave them. Only the Qoldau team sees them.',
          '**Settings, phrase history, offline voice** — so the site works the way you set it up, offline too. Stored only in the browser.',
        ],
      },
      {
        title: 'Cookies and browser storage',
        text: [
          'There are no advertising or tracking cookies and no visitor counters. Browser storage keeps you signed in and holds the data listed above.',
          '“Allow” keeps you signed in after the browser closes; “Necessary only” signs you out when it closes. You can change your choice at any time on the “Privacy & cookies” page.',
        ],
      },
      {
        title: 'Where data is stored and who receives it',
        items: [
          'On your device: everything not listed below.',
          'Google Firebase (servers in Germany, region europe-west3): account, leaderboard profile, chat, reports and feedback. The site itself is hosted on Firebase Hosting.',
          'Sign recognition models are downloaded from Google servers and the Kazakh voice from Hugging Face; they receive only an ordinary file download request.',
          'We do not sell your data, do not share it with third parties and show no ads.',
        ],
      },
      {
        title: 'How long data is kept and how to delete it',
        items: [
          'Data in your browser — until you delete it: “Delete take” and “Delete everything” on the Train page, “Remove” next to a voice in Settings, or clearing the site data in your browser.',
          'Account, profile and chat messages — until you delete your account (the “Privacy & cookies” page).',
          'Reports and feedback — as long as they help improve the site. We delete them on request via Telegram.',
        ],
      },
      {
        title: 'Rules of use',
        items: [
          'The site is free and meant for learning and communication. Recognition can make mistakes: do not rely on it in an emergency; an important conversation needs a sign language interpreter.',
          'The video lessons were filmed by the Qoldau team. You may watch them and use them for learning; copying or distributing them for commercial purposes without the authors’ permission is not allowed.',
          'Do not post insults, advertising or other people’s personal data in the chat, reports or feedback — such messages are deleted.',
          'Children should sign up together with a parent.',
          'We may update the site and these terms; the date of the last change is shown at the top.',
        ],
      },
      {
        title: 'Contact us',
        text: ['Questions about your data and deletion requests: Telegram {telegram}, or the “Feedback” button at the bottom of the site. Authors: {authors}.'],
      },
    ],
  },
};
