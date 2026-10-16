import { useId, useState, type FormEvent } from 'react';
import { SIGNS } from '../data/signs';
import { useT, type MessageKey } from '../i18n';
import { CloudError } from '../lib/cloud';
import { useAuth } from '../store/auth';
import { useConsent } from '../store/consent';
import { useLearn } from '../store/learn';
import { useUi } from '../store/ui';
import { Icon } from './Icon';
import { Landscape } from './Landscape';
import { Modal, ModalClose } from './Modal';

type Mode = 'login' | 'register';

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

export function AuthDialog({ mode, onClose }: { mode: Mode; onClose: () => void }) {
  const t = useT();
  const id = useId();
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
  const isRegister = mode === 'register';

  const switchTo = (next: Mode) => {
    setError(null);
    useUi.getState().openDialog(next);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (isRegister && !agree) {
      setError('auth.err.agree');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const auth = useAuth.getState();
      const user = isRegister
        ? await auth.register({ name, email, password, remember })
        : await auth.login({ email, password, remember });
      // Signing in is the visitor's answer to the cookie question too.
      if (remember) useConsent.getState().choose('all');
      else if (!useConsent.getState().choice) useConsent.getState().choose('necessary');
      useUi.getState().showToast(t('auth.welcome', { name: user.name }));
      onClose();
    } catch (err) {
      setError(errorKey(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal onClose={onClose} labelledBy={`${id}-title`} className="auth">
      <ModalClose onClose={onClose} />
      <div className="auth__side" aria-hidden="true">
        <Landscape />
        <span className="auth__mark">
          <Icon name={isRegister ? 'trophy' : 'hand'} size={30} />
        </span>
        <strong>Qoldau</strong>
        <small>{t('account.progress', { n: localLearned, total: SIGNS.length })}</small>
      </div>
      <form className="auth__form" onSubmit={(e) => void submit(e)} noValidate>
        <h2 id={`${id}-title`}>{t(isRegister ? 'auth.register.title' : 'auth.login.title')}</h2>
        <p className="auth__sub">{t(isRegister ? 'auth.register.sub' : 'auth.login.sub')}</p>

        {!available && <p className="notice notice--warn">{t('auth.err.server')}</p>}

        {isRegister && (
          <label className="field">
            <span className="field__label">{t('auth.name')}</span>
            <input
              name="name"
              autoComplete="nickname"
              required
              minLength={2}
              maxLength={40}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <small className="field__hint">{t('auth.name.hint')}</small>
          </label>
        )}

        <label className="field">
          <span className="field__label">{t('auth.email')}</span>
          <input
            type="email"
            name="email"
            autoComplete="email"
            inputMode="email"
            required
            maxLength={120}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>

        <label className="field">
          <span className="field__label">{t('auth.password')}</span>
          <span className="field__password">
            <input
              type={showPassword ? 'text' : 'password'}
              name="password"
              autoComplete={isRegister ? 'new-password' : 'current-password'}
              required
              minLength={6}
              maxLength={200}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              className="field__eye"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={t('auth.showPassword')}
              aria-pressed={showPassword}
            >
              <Icon name={showPassword ? 'eyeOff' : 'eye'} size={18} />
            </button>
          </span>
          {isRegister && <small className="field__hint">{t('auth.password.hint')}</small>}
        </label>

        {isRegister && (
          <label className="tick">
            <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
            <span>
              {t('auth.agree.before')}
              <a href="#/privacy" onClick={onClose}>
                {t('auth.agree.link')}
              </a>
              {t('auth.agree.after')}
            </span>
          </label>
        )}
        <label className="tick">
          <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
          <span>{t('auth.remember')}</span>
        </label>

        {isRegister && localLearned > 0 && <p className="auth__local">{t('auth.local', { n: localLearned })}</p>}
        {error && (
          <p className="auth__error" role="alert">
            {t(error)}
          </p>
        )}

        <button type="submit" className="btn btn--primary btn--lg auth__submit" disabled={busy}>
          {busy ? t('auth.wait') : t(isRegister ? 'auth.submit.register' : 'auth.submit.login')}
          {!busy && <Icon name="arrowRight" size={18} />}
        </button>

        <p className="auth__switch">
          {t(isRegister ? 'auth.haveAccount' : 'auth.noAccount')}{' '}
          <button type="button" onClick={() => switchTo(isRegister ? 'login' : 'register')}>
            {t(isRegister ? 'account.login' : 'account.register')}
          </button>
        </p>
      </form>
    </Modal>
  );
}
