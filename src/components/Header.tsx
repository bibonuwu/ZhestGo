import { LANGS } from '../data/gestureText';
import { LANG_NAMES, LANG_SHORT, useT, type MessageKey } from '../i18n';
import { useSettings } from '../store/settings';
import { useServerStatus } from '../store/status';
import { useUi } from '../store/ui';
import { Icon, type IconName } from './Icon';

export type Page = 'translate' | 'dictionary' | 'train' | 'settings';

const TABS: Array<{ id: Page; label: MessageKey; icon: IconName }> = [
  { id: 'translate', label: 'nav.translate', icon: 'hand' },
  { id: 'dictionary', label: 'nav.dictionary', icon: 'book' },
  { id: 'train', label: 'nav.train', icon: 'graduate' },
  { id: 'settings', label: 'nav.settings', icon: 'sliders' },
];

function Logo() {
  return (
    <svg className="logo" width="38" height="38" viewBox="0 0 40 40" aria-hidden="true">
      <defs>
        <linearGradient id="logo-sky" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#22c3e6" />
          <stop offset="1" stopColor="#0284c7" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="12" fill="url(#logo-sky)" />
      <circle cx="29" cy="11" r="5" fill="#fcd34d" />
      <path d="M9 17.5a7.5 7.5 0 0 1 7.5-7.5h3a7.5 7.5 0 0 1 0 15H16l-4.5 4v-4.6A7.5 7.5 0 0 1 9 17.5z" fill="#fff" />
      <circle cx="14.5" cy="17.5" r="1.6" fill="#0284c7" />
      <circle cx="18.5" cy="17.5" r="1.6" fill="#0284c7" />
      <circle cx="22.5" cy="17.5" r="1.6" fill="#0284c7" />
    </svg>
  );
}

export function Header({ page }: { page: Page }) {
  const t = useT();
  const lang = useSettings((s) => s.lang);
  const update = useSettings((s) => s.update);
  const server = useServerStatus((s) => s.server);
  const cameraOn = useUi((s) => s.cameraOn);
  const online = useUi((s) => s.online);
  const updateReady = useUi((s) => s.updateReady);
  const applyUpdate = useUi((s) => s.applyUpdate);

  return (
    <header className="header">
      <a className="brand" href="#/translate">
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
        <div className="lang-switch" role="group" aria-label={t('settings.language')}>
          {LANGS.map((l) => (
            <button key={l} lang={l} aria-pressed={lang === l} onClick={() => update({ lang: l })} title={LANG_NAMES[l]}>
              {LANG_SHORT[l]}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
}
