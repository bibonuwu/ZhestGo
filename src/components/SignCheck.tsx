import { useEffect, useState } from 'react';
import type { Sign } from '../data/signs';
import { capitalize } from '../data/words';
import { useT } from '../i18n';
import { signPoster, signVideo } from '../lib/media';
import { quizOptions } from '../lib/quiz';
import { Icon } from './Icon';

/**
 * A sign only counts as learned after this check: “Which video means the
 * word?”. The other videos are mostly from the same topic, so the meaning
 * alone does not give the answer away. Keys 1–4 pick a video.
 */
export function SignCheck({
  sign,
  onPass,
  onBack,
  onNext,
}: {
  sign: Sign;
  onPass: () => void;
  onBack: () => void;
  onNext?: () => void;
}) {
  const t = useT();
  const [options] = useState(() => quizOptions(sign));
  const [picked, setPicked] = useState<string | null>(null);
  const passed = picked === sign.id;
  const word = capitalize(sign.kk);

  const pick = (id: string) => {
    if (picked) return;
    setPicked(id);
    if (id === sign.id) onPass();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const option = options[Number(e.key) - 1];
      if (option) pick(option.id);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <section className="sign-check" aria-labelledby="check-title">
      <header className="sign-check__head">
        <p className="eyebrow">
          <Icon name="quiz" size={14} /> {t('learn.check.eyebrow')}
        </p>
        <h2 id="check-title">{t('learn.check.title', { w: word })}</h2>
        <p>{t('learn.check.hint')}</p>
      </header>

      <div className="sign-check__grid">
        {options.map((o, i) => {
          const state = !picked ? '' : o.id === sign.id ? ' is-right' : o.id === picked ? ' is-wrong' : ' is-dim';
          return (
            <button
              key={o.id}
              type="button"
              className={`sign-check__option${state}`}
              onClick={() => pick(o.id)}
              disabled={Boolean(picked)}
              aria-label={picked ? capitalize(o.kk) : t('learn.check.option', { n: i + 1 })}
            >
              <video src={signVideo(o.id)} poster={signPoster(o.id)} autoPlay muted loop playsInline />
              <span className="sign-check__num" aria-hidden="true">
                {i + 1}
              </span>
              {picked && (
                <span className="sign-check__label" lang="kk" aria-hidden="true">
                  {capitalize(o.kk)}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <footer className="sign-check__foot" aria-live="polite">
        {!picked && (
          <button type="button" className="btn btn--ghost" onClick={onBack}>
            <Icon name="chevronLeft" size={18} /> {t('learn.check.back')}
          </button>
        )}
        {picked && (
          <p className={`quiz__result${passed ? ' is-right' : ' is-wrong'}`}>
            <Icon name={passed ? 'check' : 'x'} size={18} />
            {passed ? t('learn.check.pass', { w: word }) : t('learn.check.fail')}
          </p>
        )}
        {picked && passed && (
          <>
            <button type="button" className="btn" onClick={onBack}>
              <Icon name="chevronLeft" size={18} /> {t('learn.check.back')}
            </button>
            {onNext && (
              <button type="button" className="btn btn--primary" onClick={onNext}>
                {t('learn.next')} <Icon name="chevronRight" size={18} />
              </button>
            )}
          </>
        )}
        {picked && !passed && (
          <button type="button" className="btn btn--primary" onClick={onBack}>
            <Icon name="replay" size={16} /> {t('learn.check.again')}
          </button>
        )}
      </footer>
    </section>
  );
}
