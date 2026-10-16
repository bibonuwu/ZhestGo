import { useT } from '../i18n';
import { useConsent, type ConsentChoice } from '../store/consent';
import { useUi } from '../store/ui';
import { Icon } from './Icon';

export function CookieBanner() {
  const t = useT();
  const choice = useConsent((s) => s.choice);
  if (choice) return null;

  const choose = (c: ConsentChoice) => {
    useConsent.getState().choose(c);
    useUi.getState().showToast(t(c === 'all' ? 'cookie.saved.all' : 'cookie.saved.necessary'));
  };

  return (
    <section className="cookie-banner" role="region" aria-labelledby="cookie-title">
      <span className="cookie-banner__icon" aria-hidden="true">
        <Icon name="cookie" size={22} />
      </span>
      <div className="cookie-banner__text">
        <h2 id="cookie-title">{t('cookie.title')}</h2>
        <p>
          {t('cookie.text')} <a href="#/privacy">{t('cookie.more')}</a>
        </p>
      </div>
      <div className="cookie-banner__actions">
        <button type="button" className="btn" onClick={() => choose('necessary')}>
          {t('cookie.necessary')}
        </button>
        <button type="button" className="btn btn--primary" onClick={() => choose('all')}>
          {t('cookie.accept')}
        </button>
      </div>
    </section>
  );
}
