import { useEffect, useState, type CSSProperties } from 'react';
import { AccountButton, LangSwitch, Logo } from '../components/Header';
import { Icon, type IconName } from '../components/Icon';
import { Landscape } from '../components/Landscape';
import { LeaderboardCard, useLiveLeaderboard } from '../components/Leaderboard';
import { TelegramLink } from '../components/DonateDialog';
import { AUTHORS } from '../data/authors';
import { DONATE, telegramUrl } from '../data/donate';
import { SIGN_BY_WORD, SIGNS, SIGNS_BY_ID } from '../data/signs';
import { capitalize } from '../data/words';
import { LOCALES, useT, type MessageKey } from '../i18n';
import { signPoster, signVideo } from '../lib/media';
import { useLearn } from '../store/learn';
import { useSettings } from '../store/settings';
import { useUi } from '../store/ui';

/** Words typed in the headline, each with the sign shown next to it. */
const HERO_SIGNS = ['salem', 'otbasy', 'dos', 'zhaksy', 'ana', 'kitap'];
const CAROUSEL = ['salem', 'ana', 'dos', 'mysyk', 'kun', 'otbasy', 'kitap', 'zhaksy', 'ui', 'kus'];
const RAIL = SIGNS.filter((_, i) => i % 3 === 0).map((s) => s.id);

const reducedMotion = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const gloss = (id: string, lang: string) => {
  const s = SIGNS_BY_ID.get(id);
  return s ? (lang === 'en' ? s.en : s.ru) : '';
};
const openLesson = (id: string) => useUi.getState().openLesson(id, SIGNS.map((s) => s.id));

/** Types a word, waits, erases it and moves on to the next one. */
function useTypewriter(words: readonly string[]) {
  const [index, setIndex] = useState(0);
  const [length, setLength] = useState(0);
  const [erasing, setErasing] = useState(false);

  useEffect(() => {
    const word = words[index];
    if (reducedMotion()) {
      setLength(word.length);
      const timer = setTimeout(() => setIndex((i) => (i + 1) % words.length), 2600);
      return () => clearTimeout(timer);
    }
    const full = length === word.length;
    const delay = !erasing && full ? 2200 : erasing && length === 0 ? 260 : erasing ? 45 : 110;
    const timer = setTimeout(() => {
      if (!erasing && full) setErasing(true);
      else if (erasing && length === 0) {
        setErasing(false);
        setIndex((i) => (i + 1) % words.length);
      } else setLength((n) => n + (erasing ? -1 : 1));
    }, delay);
    return () => clearTimeout(timer);
  }, [words, index, length, erasing]);

  return { index, text: words[index].slice(0, length) };
}

function HeroNav() {
  const t = useT();
  const links: Array<{ href: string; label: MessageKey }> = [
    { href: '#/learn', label: 'nav.learn' },
    { href: '#/leaderboard', label: 'nav.leaderboard' },
    { href: '#/translate', label: 'nav.translate' },
    { href: '#/dictionary', label: 'nav.dictionary' },
  ];
  return (
    <nav className="hero-nav" aria-label="Qoldau">
      <a className="hero-nav__brand" href="#/">
        <Logo />
        <span>Qoldau</span>
      </a>
      <div className="hero-nav__links">
        {links.map((l) => (
          <a key={l.href} href={l.href}>
            {t(l.label)}
          </a>
        ))}
      </div>
      <div className="hero-nav__end">
        <LangSwitch className="lang-switch--glass" />
        <AccountButton variant="hero" />
      </div>
    </nav>
  );
}

function HeroSignCard({ id }: { id: string }) {
  const lang = useSettings((s) => s.lang);
  const sign = SIGNS_BY_ID.get(id);
  if (!sign) return null;
  return (
    <button type="button" className="hero-sign" onClick={() => openLesson(id)} aria-label={capitalize(sign.kk)}>
      <video key={id} src={signVideo(id)} poster={signPoster(id)} autoPlay muted loop playsInline preload="none" />
      <span className="hero-sign__caption">
        <strong lang="kk">{capitalize(sign.kk)}</strong>
        <small>{gloss(id, lang)}</small>
      </span>
    </button>
  );
}

function HeroTopChip() {
  const t = useT();
  const top = useLiveLeaderboard().data?.top[0];
  return (
    <a className="hero-chip" href="#/leaderboard">
      <span className="hero-chip__icon">
        <Icon name="trophy" size={18} />
      </span>
      {top ? (
        <span>
          <small>{t('nav.leaderboard')} · #1</small>
          <strong>
            {top.name} · {top.learned}
          </strong>
        </span>
      ) : (
        <span>
          <small>{t('home.stat.videos')}</small>
          <strong>{SIGNS.length}</strong>
        </span>
      )}
    </a>
  );
}

function Hero() {
  const t = useT();
  const lang = useSettings((s) => s.lang);
  const [open, close] = lang === 'en' ? ['“', '”'] : ['«', '»'];
  const words = HERO_SIGNS.map((id) => SIGNS_BY_ID.get(id)?.kk ?? id);
  const { index, text } = useTypewriter(words);

  return (
    <section className="hero">
      <Landscape />
      <div className="hero__shade" />
      <HeroNav />
      <HeroTopChip />
      <HeroSignCard id={HERO_SIGNS[index]} />
      <div className="hero__content">
        <p className="eyebrow">{t('home.eyebrow')}</p>
        <h1>
          {t('home.title')}
          <span className="hero__word" lang="kk">
            <span className="sr-only">{words[index]}</span>
            <span aria-hidden="true">
              {open}
              {text}
              <i className="hero__caret" />
              {close}
            </span>
          </span>
        </h1>
        <p className="hero__lead">{t('home.lead')}</p>
        <div className="hero__actions">
          <a className="btn-glow btn-glow--xl" href="#/learn">
            {t('home.cta.learn')} <Icon name="arrowRight" size={18} />
          </a>
          <a className="btn-glass" href="#/translate">
            <Icon name="hand" size={18} /> {t('home.cta.translate')}
          </a>
        </div>
        <button type="button" className="support-gift" onClick={() => useUi.getState().openDialog('donate')}>
          <span className="support-gift__icon">
            <Icon name="heart" size={24} />
          </span>
          <span className="support-gift__copy">
            <span>{t('donate.button')}</span>
            <strong>{t('donate.hero.title')}</strong>
            <small>
              <b>{t('donate.goal.videos')}</b>
              <em>{t('donate.goal.server')}</em>
              <em>{t('donate.goal.free')}</em>
            </small>
          </span>
          <span className="support-gift__via">{t('donate.hero.via')}</span>
          <span className="support-gift__arrow">
            <Icon name="arrowRight" size={19} />
          </span>
        </button>
      </div>
    </section>
  );
}

function Stats() {
  const t = useT();
  const lang = useSettings((s) => s.lang);
  const { data, status } = useLiveLeaderboard();
  const fmt = (n: number) => new Intl.NumberFormat(LOCALES[lang]).format(n);
  const items: Array<{ icon: IconName; value: string; label: MessageKey }> = [
    { icon: 'film', value: String(SIGNS.length), label: 'home.stat.videos' },
    { icon: 'book', value: String(SIGN_BY_WORD.size), label: 'home.stat.words' },
    ...(data && status === 'ready'
      ? [
          { icon: 'users' as const, value: fmt(data.users), label: 'home.stat.users' as const },
          { icon: 'trophy' as const, value: fmt(data.totalLearned), label: 'home.stat.learned' as const },
        ]
      : [{ icon: 'wifiOff' as const, value: '100%', label: 'home.stat.offline' as const }]),
  ];
  return (
    <section className="landing-stats" aria-label="Qoldau">
      {items.map((s) => (
        <div key={s.label} className="stat-tile">
          <span className="stat-tile__icon">
            <Icon name={s.icon} size={20} />
          </span>
          <strong>{s.value}</strong>
          <small>{t(s.label)}</small>
        </div>
      ))}
    </section>
  );
}

function LessonsShowcase() {
  const t = useT();
  const lang = useSettings((s) => s.lang);
  const learned = useLearn((s) => s.learned);
  const rail = [...RAIL, ...RAIL];
  return (
    <section className="showcase showcase--lessons" aria-labelledby="home-lessons">
      <div className="showcase__copy">
        <p className="eyebrow">{t('home.lessons.eyebrow')}</p>
        <h2 id="home-lessons">
          {t('home.lessons.title1')}
          <em>{t('home.lessons.title2')}</em>
        </h2>
        <p>{t('home.lessons.text')}</p>
        <a className="btn-glow" href="#/learn">
          {t('home.lessons.cta')} <Icon name="arrowRight" size={17} />
        </a>
      </div>

      <div className="carousel" aria-hidden="true">
        <div className="carousel__ring" style={{ '--quantity': CAROUSEL.length } as CSSProperties}>
          {CAROUSEL.map((id, i) => (
            <figure key={id} className="carousel__card" style={{ '--index': i, '--tone': i % 2 ? '233 65 150' : '84 226 192' } as CSSProperties}>
              <img src={signPoster(id)} alt="" loading="lazy" width={450} height={640} />
              <figcaption lang="kk">{SIGNS_BY_ID.get(id)?.kk}</figcaption>
            </figure>
          ))}
        </div>
      </div>

      <div className="sign-rail">
        <div>
          {rail.map((id, i) => {
            const sign = SIGNS_BY_ID.get(id)!;
            return (
              <button
                key={`${id}-${i}`}
                type="button"
                className="sign-rail__item"
                onClick={() => openLesson(id)}
                tabIndex={i < RAIL.length ? 0 : -1}
                aria-hidden={i >= RAIL.length || undefined}
              >
                <img src={signPoster(id)} alt="" loading="lazy" width={52} height={74} />
                <span>
                  <strong lang="kk">{capitalize(sign.kk)}</strong>
                  <small>{gloss(id, lang)}</small>
                </span>
                {learned.includes(id) ? <Icon name="check" size={16} /> : <Icon name="play" size={14} />}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function LeaderShowcase() {
  const t = useT();
  return (
    <section className="showcase showcase--leader" aria-labelledby="home-leader">
      <div className="showcase__copy">
        <p className="eyebrow">{t('home.leader.eyebrow')}</p>
        <h2 id="home-leader">
          {t('home.leader.title1')}
          <span>
            <em>{t('home.leader.title2')}</em>
          </span>
        </h2>
        <p>{t('home.leader.text')}</p>
        <div className="showcase__actions">
          <a className="btn-glow" href="#/leaderboard">
            {t('home.leader.cta')} <Icon name="arrowRight" size={17} />
          </a>
          <a className="btn-soft" href="#/learn">
            {t('nav.learn')}
          </a>
        </div>
      </div>
      <LeaderboardCard limit={3} />
    </section>
  );
}

function Features() {
  const t = useT();
  const cards: Array<{ href: string; icon: IconName; title: MessageKey; text: MessageKey; tone?: 'plus' }> = [
    { href: '#/learn', icon: 'film', title: 'nav.learn', text: 'home.f.learn', tone: 'plus' },
    { href: '#/translate', icon: 'hand', title: 'nav.translate', text: 'home.f.translate' },
    { href: '#/dictionary', icon: 'book', title: 'nav.dictionary', text: 'home.f.dictionary' },
    { href: '#/train', icon: 'graduate', title: 'nav.train', text: 'home.f.train' },
  ];
  return (
    <section className="showcase showcase--features" aria-labelledby="home-features">
      <div className="showcase__head">
        <p className="eyebrow">{t('home.features.eyebrow')}</p>
        <h2 id="home-features">
          {t('home.features.title1')}
          <em>{t('home.features.title2')}</em>
        </h2>
        <p>{t('home.features.text')}</p>
      </div>
      <div className="feature-grid">
        {cards.map((c) => (
          <a key={c.href} href={c.href} className={`feature-card${c.tone ? ` feature-card--${c.tone}` : ''}`}>
            <span className="feature-card__icon">
              <Icon name={c.icon} size={22} />
            </span>
            <h3>{t(c.title)}</h3>
            <p>{t(c.text)}</p>
            <span className="feature-card__go">
              {t('home.f.open')} <Icon name="arrowRight" size={16} />
            </span>
          </a>
        ))}
      </div>
    </section>
  );
}

function SupportCta() {
  const t = useT();
  return (
    <section className="support-cta" aria-labelledby="home-support">
      <span className="support-cta__badge" aria-hidden="true">
        <Icon name="heart" size={30} />
      </span>
      <div>
        <p className="eyebrow">{t('home.support.eyebrow')}</p>
        <h2 id="home-support">
          {t('home.support.title1')} <em>{t('home.support.title2')}</em>
        </h2>
        <p>{t('donate.text')}</p>
        <div className="support-cta__contacts">
          <span>{t('support.contact.title')}:</span>
          {DONATE.telegram.map((name) => (
            <TelegramLink key={name} username={name} />
          ))}
        </div>
      </div>
      <button type="button" className="btn-glow btn-glow--xl" onClick={() => useUi.getState().openDialog('donate')}>
        <Icon name="heart" size={18} /> {t('donate.button')}
      </button>
    </section>
  );
}

export function SiteFooter() {
  const t = useT();
  const links: Array<{ href: string; label: MessageKey }> = [
    { href: '#/learn', label: 'nav.learn' },
    { href: '#/leaderboard', label: 'nav.leaderboard' },
    { href: '#/translate', label: 'nav.translate' },
    { href: '#/dictionary', label: 'nav.dictionary' },
    { href: '#/train', label: 'nav.train' },
    { href: '#/privacy', label: 'footer.privacy' },
  ];
  return (
    <footer className="site-footer">
      <div>
        <a className="site-footer__brand" href="#/">
          <Logo /> Qoldau
        </a>
        <p>{t('footer.note')}</p>
        <p>
          {t('footer.authors')}: <strong>{AUTHORS.join(', ')}</strong>
        </p>
        <p className="site-footer__tg">
          <Icon name="send" size={14} /> Telegram:{' '}
          {DONATE.telegram.map((name, i) => (
            <span key={name}>
              {i > 0 && ', '}
              <a href={telegramUrl(name)} target="_blank" rel="noreferrer">
                @{name}
              </a>
            </span>
          ))}
        </p>
      </div>
      <nav aria-label={t('nav.home')}>
        {links.map((l) => (
          <a key={l.href} href={l.href}>
            {t(l.label)}
          </a>
        ))}
        <button type="button" onClick={() => useUi.getState().openDialog('donate')}>
          <Icon name="heart" size={13} /> {t('donate.short')}
        </button>
      </nav>
      <div className="site-footer__bottom">
        <small>© {new Date().getFullYear()} Qoldau</small>
        <LangSwitch />
      </div>
    </footer>
  );
}

export function HomePage() {
  return (
    <div className="landing">
      <Hero />
      <main className="landing__body" id="main">
        <Stats />
        <LessonsShowcase />
        <LeaderShowcase />
        <Features />
        <SupportCta />
        <SiteFooter />
      </main>
    </div>
  );
}
