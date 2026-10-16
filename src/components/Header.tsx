import { useEffect, useId, useRef } from 'react';
import { LANGS } from '../data/gestureText';
import { SIGNS } from '../data/signs';
import { LANG_NAMES, LANG_SHORT, useT, type MessageKey } from '../i18n';
import { CloudError } from '../lib/cloud';
import { useAuth } from '../store/auth';
import { useSettings } from '../store/settings';
import { useServerStatus } from '../store/status';
import { useUi } from '../store/ui';
import { Icon, type IconName } from './Icon';
import { Avatar } from './Leaderboard';

export type Page = 'home' | 'translate' | 'dictionary' | 'learn' | 'leaderboard' | 'train' | 'settings' | 'privacy';

const TABS: Array<{ id: Page; label: MessageKey; icon: IconName }> = [
  { id: 'translate', label: 'nav.translate', icon: 'hand' },
  { id: 'dictionary', label: 'nav.dictionary', icon: 'book' },
  { id: 'learn', label: 'nav.learn', icon: 'film' },
  { id: 'leaderboard', label: 'nav.leaderboard', icon: 'trophy' },
  { id: 'train', label: 'nav.train', icon: 'graduate' },
  { id: 'settings', label: 'nav.settings', icon: 'sliders' },
];

export function Logo({ size = 38 }: { size?: number }) {
  // useId contains characters that url(#…) does not accept.
  const gradient = `logo${useId().replace(/[^\w-]/g, '')}`;
  return (
    <svg className="logo" width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
      <defs>
        <linearGradient id={gradient} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#61d4ff" />
          <stop offset="1" stopColor="#1f6fff" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="12" fill={`url(#${gradient})`} />
      <circle cx="29" cy="11" r="5" fill="#ffb547" />
      <path d="M9 17.5a7.5 7.5 0 0 1 7.5-7.5h3a7.5 7.5 0 0 1 0 15H16l-4.5 4v-4.6A7.5 7.5 0 0 1 9 17.5z" fill="#fff" />
      <circle cx="14.5" cy="17.5" r="1.6" fill="#1f6fff" />
      <circle cx="18.5" cy="17.5" r="1.6" fill="#1f6fff" />
      <circle cx="22.5" cy="17.5" r="1.6" fill="#1f6fff" />
    </svg>
  );
}

export function LangSwitch({ className = '' }: { className?: string }) {
  const t = useT();
  const lang = useSettings((s) => s.lang);
  const update = useSettings((s) => s.update);
  return (
    <div className={`lang-switch ${className}`} role="group" aria-label={t('settings.language')}>
      {LANGS.map((l) => (
        <button key={l} lang={l} aria-pressed={lang === l} onClick={() => update({ lang: l })} title={LANG_NAMES[l]}>
          {LANG_SHORT[l]}
        </button>
      ))}
    </div>
  );
}

/** “Sign in” for guests; the account menu (progress, sign out, delete) for users. */
export function AccountButton({ variant = 'app' }: { variant?: 'app' | 'hero' }) {
  const t = useT();
  const user = useAuth((s) => s.user);
  const menu = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      if (menu.current?.open && !menu.current.contains(e.target as Node)) menu.current.open = false;
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, []);

  if (!user) {
    return (
      <div className={`account account--${variant}`}>
        <button type="button" className="account__login" onClick={() => useUi.getState().openDialog('login')}>
          <Icon name="user" size={16} />
          <span>{t('account.login')}</span>
        </button>
        <button type="button" className="account__register" onClick={() => useUi.getState().openDialog('register')}>
          {t('account.register')}
        </button>
      </div>
    );
  }

  const close = () => {
    if (menu.current) menu.current.open = false;
  };
  const logout = async () => {
    close();
    await useAuth.getState().logout();
    useUi.getState().showToast(t('account.loggedOut'));
  };
  const remove = async () => {
    close();
    if (!window.confirm(t('account.delete.confirm'))) return;
    try {
      await useAuth.getState().deleteAccount();
      useUi.getState().showToast(t('account.deleted'));
    } catch (err) {
      const relogin = err instanceof CloudError && err.code === 'relogin';
      useUi.getState().showToast(t(relogin ? 'auth.err.relogin' : 'auth.err.generic'));
      if (relogin) useUi.getState().openDialog('login');
    }
  };

  return (
    <details ref={menu} className={`account account--${variant} account-menu`}>
      <summary aria-label={t('account.menu')}>
        <Avatar name={user.name} size={30} />
        <span className="account-menu__name">{user.name}</span>
        <Icon name="chevronDown" size={15} />
      </summary>
      <div className="account-menu__panel">
        <div className="account-menu__who">
          <Avatar name={user.name} size={44} />
          <span>
            <strong>{user.name}</strong>
            <small>{user.email}</small>
          </span>
        </div>
        <a className="account-menu__progress" href="#/learn" onClick={close}>
          <span>
            <Icon name="film" size={16} /> {t('account.progress', { n: user.learned.length, total: SIGNS.length })}
          </span>
          <span className="account-menu__bar">
            <i style={{ width: `${(user.learned.length / SIGNS.length) * 100}%` }} />
          </span>
        </a>
        <a href="#/leaderboard" onClick={close}>
          <Icon name="trophy" size={16} /> {t('nav.leaderboard')}
        </a>
        <button type="button" onClick={() => void logout()}>
          <Icon name="logout" size={16} /> {t('account.logout')}
        </button>
        <button type="button" className="account-menu__danger" onClick={() => void remove()}>
          <Icon name="trash" size={16} /> {t('account.delete')}
        </button>
      </div>
    </details>
  );
}

export function Header({ page }: { page: Page }) {
  const t = useT();
  const server = useServerStatus((s) => s.server);
  const cameraOn = useUi((s) => s.cameraOn);
  const online = useUi((s) => s.online);
  const updateReady = useUi((s) => s.updateReady);
  const applyUpdate = useUi((s) => s.applyUpdate);

  return (
    <header className="header">
      <a className="brand" href="#/">
        <Logo />
        <span className="brand__text">
          <strong>Qoldau</strong>
          <small>{t('app.tagline')}</small>
        </span>
      </a>

      <nav className="nav" aria-label="Qoldau">
        {TABS.map((tab) => (
          <a key={tab.id} href={`#/${tab.id}`} className={`nav__link${page === tab.id ? ' is-active' : ''}`} aria-current={page === tab.id ? 'page' : undefined}>
            <Icon name={tab.icon} size={19} />
            <span>{t(tab.label)}</span>
            {tab.id === 'translate' && cameraOn && <span className="nav__live" aria-hidden="true" />}
          </a>
        ))}
      </nav>

      <div className="header__end">
        {server?.compose && (
          <span className="pill pill--ai" title={server.model ?? undefined}>
            <Icon name="sparkles" size={14} /> {t('status.ai')}
          </span>
        )}
        {server?.tts && (
          <span className="pill" title={server.ttsVoice ?? undefined}>
            <Icon name="speaker" size={14} /> {t('status.voice')}
          </span>
        )}
        {!online && (
          <span className="pill pill--offline" role="status">
            <span className="dot" aria-hidden="true" /> {t('status.offline.mode')}
          </span>
        )}
        {updateReady && applyUpdate && (
          <button className="pill pill--update" onClick={applyUpdate}>
            <Icon name="replay" size={14} /> {t('status.update')}
          </button>
        )}
        <button type="button" className="donate-pill" onClick={() => useUi.getState().openDialog('donate')} title={t('donate.button')}>
          <Icon name="heart" size={15} />
          <span>{t('donate.short')}</span>
        </button>
        <LangSwitch />
        <AccountButton />
      </div>
    </header>
  );
}
