import { useState } from 'react';
import { DONATE, hasCard, hasKaspi, telegramUrl } from '../data/donate';
import { LOCALES, useT } from '../i18n';
import { publicUrl } from '../lib/media';
import { useSettings } from '../store/settings';
import { useUi } from '../store/ui';
import { Icon, type IconName } from './Icon';
import { Modal, ModalClose } from './Modal';

type Method = 'kaspi' | 'card';

async function copy(text: string, done: string) {
  try {
    await navigator.clipboard.writeText(text);
    useUi.getState().showToast(done);
  } catch {
    // Clipboard blocked: the text is still on screen to copy by hand.
  }
}

function CopyRow({ icon, label, value }: { icon: IconName; label: string; value: string }) {
  const t = useT();
  return (
    <div className="donate-row">
      <span className="donate-row__icon">
        <Icon name={icon} size={18} />
      </span>
      <span className="donate-row__text">
        <small>{label}</small>
        <strong>{value}</strong>
      </span>
      <button type="button" className="btn btn--sm" onClick={() => void copy(value.replace(/\s/g, ''), t('donate.copied'))}>
        <Icon name="copy" size={15} /> <span className="donate-row__copy">{t('donate.copy')}</span>
      </button>
    </div>
  );
}

export function TelegramLink({ username }: { username: string }) {
  return (
    <a className="tg-link" href={telegramUrl(username)} target="_blank" rel="noreferrer">
      <span className="tg-link__icon" aria-hidden="true">
        <Icon name="send" size={16} />
      </span>
      @{username}
    </a>
  );
}

export function DonateDialog({ onClose }: { onClose: () => void }) {
  const t = useT();
  const lang = useSettings((s) => s.lang);
  const [amount, setAmount] = useState<number>(DONATE.amounts[1] ?? DONATE.amounts[0] ?? 1000);
  const [custom, setCustom] = useState('');
  const [method, setMethod] = useState<Method>(hasKaspi ? 'kaspi' : 'card');
  const configured = hasKaspi || hasCard;

  const customValue = Number(custom.replace(/\D/g, ''));
  const sum = custom ? customValue : amount;
  // Tenge amounts are grouped with spaces (1 000 ₸) in Kazakh and Russian.
  const money = (n: number) => `${new Intl.NumberFormat(lang === 'en' ? LOCALES.en : LOCALES.ru).format(n)} ₸`;

  const share = async () => {
    const url = window.location.origin + window.location.pathname;
    try {
      if (navigator.share) await navigator.share({ title: 'Qoldau', url });
      else await copy(url, t('donate.shared'));
    } catch {
      // The share sheet was dismissed.
    }
  };

  const goals: Array<{ icon: IconName; text: string }> = [
    { icon: 'sparkles', text: t('donate.goal.site') },
    { icon: 'video', text: t('donate.goal.videos') },
    { icon: 'book', text: t('donate.goal.free') },
  ];

  return (
    <Modal onClose={onClose} labelledBy="donate-title" className="donate">
      <ModalClose onClose={onClose} />
      <header className="donate__head">
        <span className="donate__badge" aria-hidden="true">
          <Icon name="heart" size={26} />
        </span>
        <p className="eyebrow">{t('donate.eyebrow')}</p>
        <h2 id="donate-title">{t('donate.button')}</h2>
        <p>{t('donate.text')}</p>
        <ul className="donate__goals">
          {goals.map((g) => (
            <li key={g.icon}>
              <Icon name={g.icon} size={16} /> {g.text}
            </li>
          ))}
        </ul>
      </header>

      <div className="donate__body">
        {configured ? (
          <>
            {hasKaspi && !hasCard && <p className="donate__title">{t('support.money.title')}</p>}
            <p className="donate__label">{t('donate.amount')}</p>
            <div className="donate__amounts" role="group" aria-label={t('donate.amount')}>
              {DONATE.amounts.map((a) => (
                <button
                  key={a}
                  type="button"
                  className={!custom && amount === a ? 'is-active' : ''}
                  aria-pressed={!custom && amount === a}
                  onClick={() => {
                    setAmount(a);
                    setCustom('');
                  }}
                >
                  {money(a)}
                </button>
              ))}
              <label className={`donate__custom${custom ? ' is-active' : ''}`}>
                <span className="sr-only">{t('donate.custom')}</span>
                <input
                  inputMode="numeric"
                  placeholder={t('donate.custom')}
                  value={custom}
                  onChange={(e) => setCustom(e.target.value.replace(/\D/g, '').slice(0, 7))}
                />
                <span aria-hidden="true">₸</span>
              </label>
            </div>

            {hasKaspi && hasCard && (
              <>
                <p className="donate__label">{t('donate.method')}</p>
                <div className="segmented segmented--fill" role="tablist">
                  {(['kaspi', 'card'] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      role="tab"
                      aria-selected={method === m}
                      className={method === m ? 'is-active' : ''}
                      onClick={() => setMethod(m)}
                    >
                      {m === 'kaspi' ? 'Kaspi' : t('donate.card')}
                    </button>
                  ))}
                </div>
              </>
            )}

            <div className="donate__method">
              {method === 'kaspi' ? (
                <>
                  {DONATE.kaspiQr && (
                    <figure className="donate__qr">
                      <img src={publicUrl(DONATE.kaspiQr)} alt="Kaspi QR" width={180} height={180} />
                      <figcaption>{t('donate.kaspi.scan')}</figcaption>
                    </figure>
                  )}
                  {DONATE.kaspiLink && (
                    <a className="btn btn--primary btn--lg donate__kaspi" href={DONATE.kaspiLink} target="_blank" rel="noreferrer">
                      {t('donate.kaspi.open')} <Icon name="external" size={16} />
                    </a>
                  )}
                  {DONATE.kaspiPhone && <CopyRow icon="phone" label={t('donate.kaspi.phone')} value={DONATE.kaspiPhone} />}
                </>
              ) : (
                <CopyRow icon="card" label={t('donate.card.number')} value={DONATE.cardNumber} />
              )}
              {DONATE.recipient && (
                <p className="donate__recipient">
                  {t('donate.recipient')}: <strong>{DONATE.recipient}</strong>
                </p>
              )}
            </div>

            {sum > 0 && <p className="donate__sum">{t('donate.sum', { sum: money(sum) })}</p>}
            <p className="donate__note">
              <Icon name="heart" size={15} /> {t('donate.note')}
            </p>
            <p className="donate__private">
              <Icon name="shield" size={15} /> {t('donate.private')}
            </p>
          </>
        ) : (
          <div className="donate__soon">
            <p>{t('donate.soon')}</p>
            <button type="button" className="btn btn--primary btn--lg" onClick={() => void share()}>
              <Icon name="share" size={18} /> {t('donate.share')}
            </button>
          </div>
        )}

        {DONATE.telegram.length > 0 && (
          <section className="donate__contact" aria-labelledby="donate-contact">
            <div>
              <h3 id="donate-contact">{t('support.contact.title')}</h3>
              <p>{t('support.contact.text')}</p>
            </div>
            <div className="donate__telegram">
              {DONATE.telegram.map((name) => (
                <TelegramLink key={name} username={name} />
              ))}
            </div>
          </section>
        )}
      </div>
    </Modal>
  );
}
