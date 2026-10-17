import { useEffect, useState, type FormEvent } from 'react';
import { LangSwitch, Logo } from '../components/Header';
import { Icon, type IconName } from '../components/Icon';
import { TermsLink } from '../components/TermsLink';
import { useT, type MessageKey } from '../i18n';
import { CloudError, resetPassword } from '../lib/cloud';
import { useAuth } from '../store/auth';
import { useConsent } from '../store/consent';
import { useLearn } from '../store/learn';
import { useSettings } from '../store/settings';
import { useUi } from '../store/ui';

export type AuthMode = 'login' | 'register';

const KNOWN_ERRORS = new Set([
  'invalid_name',
  'invalid_email',
  'invalid_password',
  'email_taken',
  'wrong_credentials',
  'rate_limited',
  'not_configured',
  'relogin',
]);

function errorKey(err: unknown): MessageKey {
  if (err instanceof CloudError) {
    if (KNOWN_ERRORS.has(err.code)) return `auth.err.${err.code}` as MessageKey;
    if (err.code === 'network') return 'auth.err.server';
  }
  return 'auth.err.generic';
}

const STEPS: Array<{ tone: string; icon: IconName; title: MessageKey; text: MessageKey }> = [
  { tone: 'mint', icon: 'film', title: 'auth.road.1.title', text: 'auth.road.1.text' },
  { tone: 'blue', icon: 'replay', title: 'auth.road.2.title', text: 'auth.road.2.text' },
  { tone: 'pink', icon: 'quiz', title: 'auth.road.3.title', text: 'auth.road.3.text' },
  { tone: 'yellow', icon: 'trophy', title: 'auth.road.4.title', text: 'auth.road.4.text' },
];

/** The learning path drawn on the picture side: four pinned cards on a moving thread. */
function Roadmap() {
  const t = useT();
  return (
    <section className="roadmap" aria-labelledby="roadmap-title">
      <header>
        <span>{t('auth.road.eyebrow')}</span>
        <h2 id="roadmap-title">{t('auth.road.title')}</h2>
        <p>{t('auth.road.text')}</p>
      </header>
      <div className="roadmap__grid">
        <svg className="roadmap__thread" viewBox="0 0 660 430" preserveAspectRatio="none" aria-hidden="true">
          <path d="M150 90C280 40 400 80 510 120C610 160 540 230 420 250C290 270 190 230 140 310C110 360 300 400 515 335" />
        </svg>
        {STEPS.map((s, i) => (
          <article key={s.title} className={`roadmap__step roadmap__step--${s.tone}`}>
            <svg className="roadmap__pin" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M16 3a1 1 0 0 1 .1 2H16v4.8l1.9 3.7.1.5v2a1 1 0 0 1-1 1h-4v4a1 1 0 0 1-2 0v-4H7a1 1 0 0 1-1-1v-2l.1-.5L8 9.8V5a1 1 0 0 1 0-2h8z" />
            </svg>
            <b>0{i + 1}</b>
            <span className="roadmap__icon" aria-hidden="true">
              <Icon name={s.icon} size={18} />
            </span>
            <h3>{t(s.title)}</h3>
            <p>{t(s.text)}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export function AuthPage({ mode }: { mode: AuthMode }) {
  const t = useT();
  const lang = useSettings((s) => s.lang);
  const user = useAuth((s) => s.user);
  const available = useAuth((s) => s.available);
  const consent = useConsent((s) => s.choice);
  const localLearned = useLearn((s) => s.learned.length);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agree, setAgree] = useState(false);
  // Persistent login is opt-in: only pre-ticked when cookies were already allowed.
  const [remember, setRemember] = useState(consent === 'all');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<MessageKey | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const isRegister = mode === 'register';

  // Signed in (now, or already when the page opened): go back where the visitor came from.
  useEffect(() => {
    if (user) window.location.replace(useUi.getState().authReturn || '#/learn');
  }, [user]);

  useEffect(() => {
    setError(null);
    setInfo(null);
  }, [mode]);

  const back = () => {
    const to = useUi.getState().authReturn;
    window.location.hash = to && to !== '#/' ? to : '#/';
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (isRegister && !agree) {
      setError('auth.err.agree');
      return;
    }
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      const auth = useAuth.getState();
      const signedIn = isRegister
        ? await auth.register({ name, email, password, remember })
        : await auth.login({ email, password, remember });
      // Signing in is the visitor's answer to the cookie question too.
      if (remember) useConsent.getState().choose('all');
      else if (!useConsent.getState().choice) useConsent.getState().choose('necessary');
      useUi.getState().showToast(t('auth.welcome', { name: signedIn.name }));
    } catch (err) {
      setError(errorKey(err));
    } finally {
      setBusy(false);
    }
  };

  const forgot = async () => {
    setError(null);
    setInfo(null);
    if (!email.trim()) {
      setError('auth.reset.needEmail');
      return;
    }
    try {
      await resetPassword(email, lang);
      setInfo(t('auth.reset.sent', { email: email.trim() }));
    } catch (err) {
      setError(errorKey(err));
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-media">
        <div className="auth-media__shade" />
        <a className="auth-media__brand" href="#/">
          <Logo size={34} />
          <span>Qoldau</span>
        </a>
        <Roadmap />
      </section>

      <section className="auth-panel" aria-labelledby="auth-title">
        <a className="auth-panel__brand" href="#/">
          <Logo size={30} />
          <span>Qoldau</span>
        </a>
        <LangSwitch className="auth-panel__lang" />
        <div className="auth-copy">
          <button type="button" className="auth-back" onClick={back}>
            <Icon name="chevronLeft" size={16} /> {t('auth.back')}
          </button>
          <p className="eyebrow">{t('auth.eyebrow')}</p>
          <h1 id="auth-title">{t(isRegister ? 'auth.submit.register' : 'auth.login.title')}</h1>
          <p>
            {t(isRegister ? 'auth.haveAccount' : 'auth.noAccount')}{' '}
            <a href={isRegister ? '#/login' : '#/register'}>{t(isRegister ? 'account.login' : 'account.register')}</a>
          </p>
        </div>

        <div className="auth-card">
          <form onSubmit={(e) => void submit(e)} noValidate>
            {!available && <p className="notice notice--warn">{t('auth.err.server')}</p>}

            {isRegister && (
              <label className="auth-field">
                <span className="sr-only">{t('auth.name')}</span>
                <Icon name="user" size={18} />
                <input
                  name="name"
                  placeholder={t('auth.name')}
                  autoComplete="nickname"
                  required
                  minLength={2}
                  maxLength={40}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </label>
            )}
            {isRegister && <small className="auth-hint">{t('auth.name.hint')}</small>}

            <label className="auth-field">
              <span className="sr-only">{t('auth.email')}</span>
              <Icon name="message" size={18} />
              <input
                type="email"
                name="email"
                placeholder="you@example.com"
                autoComplete="email"
                inputMode="email"
                required
                maxLength={120}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>

            <label className="auth-field">
              <span className="sr-only">{t('auth.password')}</span>
              <Icon name="shield" size={18} />
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                placeholder={isRegister ? `${t('auth.password')} · ${t('auth.password.hint').toLocaleLowerCase()}` : t('auth.password')}
                autoComplete={isRegister ? 'new-password' : 'current-password'}
                required
                minLength={6}
                maxLength={200}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                className="auth-field__eye"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={t('auth.showPassword')}
                aria-pressed={showPassword}
              >
                <Icon name={showPassword ? 'eyeOff' : 'eye'} size={18} />
              </button>
            </label>

            <div className="auth-row">
              <label className="tick">
                <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
                <span>{t('auth.remember')}</span>
              </label>
              {!isRegister && (
                <button type="button" className="auth-link" onClick={() => void forgot()}>
                  {t('auth.forgot')}
                </button>
              )}
            </div>

            {isRegister && (
              <label className="tick auth-consent">
                <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
                <span>
                  {t('auth.agree.before')}
                  <TermsLink>{t('auth.agree.link')}</TermsLink>
                  {t('auth.agree.after')}
                </span>
              </label>
            )}

            {isRegister && localLearned > 0 && <p className="auth-local">{t('auth.local', { n: localLearned })}</p>}
            {info && (
              <p className="auth-info" role="status">
                {info}
              </p>
            )}
            {error && (
              <p className="auth-error" role="alert">
                {t(error)}
              </p>
            )}

            <button type="submit" className="auth-submit" disabled={busy}>
              {busy ? t('auth.wait') : t(isRegister ? 'auth.submit.register' : 'auth.submit.login')}
              {!busy && <Icon name="arrowRight" size={18} />}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
