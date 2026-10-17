import { Icon, type IconName } from '../components/Icon';
import { PageHead } from '../components/PageHead';
import { TermsLink } from '../components/TermsLink';
import { useT, type MessageKey } from '../i18n';
import { CloudError } from '../lib/cloud';
import { useAuth } from '../store/auth';
import { useConsent, type ConsentChoice } from '../store/consent';
import { useUi } from '../store/ui';

const SECTIONS: Array<{ icon: IconName; title: MessageKey; text: MessageKey }> = [
  { icon: 'user', title: 'privacy.account.title', text: 'privacy.account.text' },
  { icon: 'chat', title: 'privacy.chat.title', text: 'privacy.chat.text' },
  { icon: 'cookie', title: 'privacy.cookie.title', text: 'privacy.cookie.text' },
  { icon: 'server', title: 'privacy.local.title', text: 'privacy.local.text' },
  { icon: 'video', title: 'privacy.camera.title', text: 'privacy.camera.text' },
  { icon: 'flag', title: 'privacy.feedback.title', text: 'privacy.feedback.text' },
];

export function PrivacyPage() {
  const t = useT();
  const choice = useConsent((s) => s.choice);
  const user = useAuth((s) => s.user);

  const choose = (c: ConsentChoice) => {
    useConsent.getState().choose(c);
    useUi.getState().showToast(t(c === 'all' ? 'cookie.saved.all' : 'cookie.saved.necessary'));
  };

  const remove = async () => {
    if (!window.confirm(t('account.delete.confirm'))) return;
    try {
      await useAuth.getState().deleteAccount();
      useUi.getState().showToast(t('account.deleted'));
    } catch (err) {
      const relogin = err instanceof CloudError && err.code === 'relogin';
      useUi.getState().showToast(t(relogin ? 'auth.err.relogin' : 'auth.err.generic'));
      if (relogin) useUi.getState().goAuth('login');
    }
  };

  const current = choice === 'all' ? t('cookie.accept') : choice === 'necessary' ? t('cookie.necessary') : t('privacy.choice.none');

  return (
    <div className="page privacy">
      <PageHead icon="shield" eyebrow="Qoldau" title={t('privacy.title')} sub={t('privacy.intro')} />

      <p className="notice notice--info privacy__terms">
        <Icon name="info" size={17} />
        <span>
          {t('privacy.terms')} <TermsLink />
        </span>
      </p>

      <div className="privacy__grid">
        {SECTIONS.map((s) => (
          <section key={s.title} className="card privacy__item">
            <span className="privacy__icon">
              <Icon name={s.icon} size={20} />
            </span>
            <h2>{t(s.title)}</h2>
            <p>{t(s.text)}</p>
          </section>
        ))}
      </div>

      <section className="card privacy__choice">
        <div>
          <h2>{t('privacy.choice.title')}</h2>
          <p>{t('privacy.choice.current', { c: current })}</p>
        </div>
        <div className="privacy__actions">
          <button type="button" className={`btn${choice === 'necessary' ? ' is-on' : ''}`} onClick={() => choose('necessary')}>
            {t('cookie.necessary')}
          </button>
          <button type="button" className="btn btn--primary" onClick={() => choose('all')}>
            <Icon name="cookie" size={16} /> {t('cookie.accept')}
          </button>
        </div>
      </section>

      {user && (
        <section className="card privacy__choice">
          <div>
            <h2>{t('privacy.delete.title')}</h2>
            <p>{t('privacy.delete.text')}</p>
          </div>
          <button type="button" className="btn btn--danger" onClick={() => void remove()}>
            <Icon name="trash" size={16} /> {t('account.delete')}
          </button>
        </section>
      )}
    </div>
  );
}
