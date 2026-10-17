import { Fragment, type ReactNode } from 'react';
import { AUTHORS } from '../data/authors';
import { DONATE, telegramUrl } from '../data/donate';
import { TERMS } from '../data/terms';
import { useT } from '../i18n';
import { useSettings } from '../store/settings';
import { Icon } from './Icon';
import { Modal, ModalClose } from './Modal';

/** `**bold**`, {telegram} and {authors} of a line of the terms. */
function rich(line: string): ReactNode {
  return line.split(/(\*\*[^*]+\*\*|\{telegram\}|\{authors\})/).map((part, i) => {
    if (part.startsWith('**')) return <strong key={i}>{part.slice(2, -2)}</strong>;
    if (part === '{authors}') return <Fragment key={i}>{AUTHORS.join(', ')}</Fragment>;
    if (part === '{telegram}') {
      return (
        <Fragment key={i}>
          {DONATE.telegram.map((name, k) => (
            <Fragment key={name}>
              {k > 0 && ', '}
              <a href={telegramUrl(name)} target="_blank" rel="noreferrer">
                @{name}
              </a>
            </Fragment>
          ))}
        </Fragment>
      );
    }
    return part;
  });
}

/** The full Terms of Use and Privacy Policy (data/terms.ts). */
export function TermsDialog({ onClose }: { onClose: () => void }) {
  const t = useT();
  const lang = useSettings((s) => s.lang);
  const terms = TERMS[lang];
  return (
    <Modal onClose={onClose} labelledBy="terms-title" className="terms">
      <ModalClose onClose={onClose} />
      <article className="terms__body">
        <header className="terms__head">
          <span className="terms__icon" aria-hidden="true">
            <Icon name="shield" size={22} />
          </span>
          <h2 id="terms-title">{terms.title}</h2>
          <p className="muted">{terms.updated}</p>
        </header>
        <p className="terms__intro">{terms.intro}</p>
        {terms.sections.map((section, i) => (
          <section key={section.title}>
            <h3>
              <span className="terms__num">{i + 1}</span>
              {section.title}
            </h3>
            {section.text?.map((p) => (
              <p key={p}>{rich(p)}</p>
            ))}
            {section.items && (
              <ul>
                {section.items.map((item) => (
                  <li key={item}>{rich(item)}</li>
                ))}
              </ul>
            )}
          </section>
        ))}
        <footer className="terms__foot">
          <button type="button" className="btn btn--primary" onClick={onClose}>
            {t('common.close')}
          </button>
        </footer>
      </article>
    </Modal>
  );
}
