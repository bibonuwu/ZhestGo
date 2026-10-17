import { useState, type FormEvent } from 'react';
import { DONATE, telegramUrl } from '../data/donate';
import { capitalize } from '../data/words';
import { useT, type MessageKey } from '../i18n';
import { sendFeedback } from '../lib/cloud';
import { useSettings } from '../store/settings';
import type { FeedbackTarget } from '../store/ui';
import { Icon } from './Icon';
import { Modal, ModalClose } from './Modal';
import { TermsLink } from './TermsLink';

/** Reasons offered for each kind of message (ids are stored with the message). */
const TOPICS: Record<FeedbackTarget['kind'], ReadonlyArray<{ id: string; label: MessageKey }>> = {
  lesson: [
    { id: 'wrong-sign', label: 'report.r.wrongSign' },
    { id: 'translation', label: 'report.r.translation' },
    { id: 'unclear', label: 'report.r.unclear' },
    { id: 'video', label: 'report.r.video' },
    { id: 'camera', label: 'report.r.camera' },
    { id: 'other', label: 'report.r.other' },
  ],
  phrase: [
    { id: 'grammar', label: 'report.r.grammar' },
    { id: 'wrong-word', label: 'report.r.wrongWord' },
    { id: 'voice', label: 'report.r.voice' },
    { id: 'other', label: 'report.r.other' },
  ],
  site: [
    { id: 'idea', label: 'feedback.topic.idea' },
    { id: 'bug', label: 'feedback.topic.bug' },
    { id: 'praise', label: 'feedback.topic.praise' },
    { id: 'other', label: 'feedback.topic.other' },
  ],
};

const MAX_TEXT = 1000;

/**
 * "Report a problem" with a video lesson or a phrase, and feedback about the
 * whole site. Messages go to Firestore; only the Qoldau team reads them.
 */
export function FeedbackDialog({ target, onClose }: { target: FeedbackTarget; onClose: () => void }) {
  const t = useT();
  const lang = useSettings((s) => s.lang);
  const [topic, setTopic] = useState('');
  const [text, setText] = useState('');
  const [contact, setContact] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [missing, setMissing] = useState(false);

  const report = target.kind !== 'site';
  const title =
    target.kind === 'lesson'
      ? t('report.title.lesson', { w: capitalize(target.word) })
      : target.kind === 'phrase'
        ? t('report.title.phrase')
        : t('feedback.title');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    // A report needs a reason or a word of explanation; feedback needs a message.
    if (!text.trim() && (!report || !topic)) {
      setMissing(true);
      return;
    }
    setStatus('sending');
    try {
      await sendFeedback({
        kind: report ? 'report' : 'feedback',
        topic,
        subject: target.kind === 'lesson' ? `lesson:${target.id}` : target.kind === 'phrase' ? `phrase:${target.text}` : '',
        text,
        contact,
        page: window.location.hash.replace(/^#\/?/, '').split('?')[0] || 'home',
        lang,
      });
      setStatus('sent');
    } catch {
      setStatus('error');
    }
  };

  if (status === 'sent') {
    return (
      <Modal onClose={onClose} labelledBy="feedback-title" className="feedback">
        <ModalClose onClose={onClose} />
        <div className="feedback__done" role="status">
          <span className="feedback__icon feedback__icon--ok" aria-hidden="true">
            <Icon name="check" size={26} />
          </span>
          <h2 id="feedback-title">{t('feedback.thanks.title')}</h2>
          <p>{t('feedback.thanks.text')}</p>
          <button type="button" className="btn btn--primary" onClick={onClose}>
            {t('common.close')}
          </button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal onClose={onClose} labelledBy="feedback-title" className="feedback">
      <ModalClose onClose={onClose} />
      <form className="feedback__form" onSubmit={(e) => void submit(e)} noValidate>
        <header className="feedback__head">
          <span className="feedback__icon" aria-hidden="true">
            <Icon name={report ? 'flag' : 'message'} size={22} />
          </span>
          <h2 id="feedback-title">{title}</h2>
          <p className="muted">{t(report ? 'report.lead' : 'feedback.lead')}</p>
          {target.kind === 'phrase' && (
            <blockquote className="feedback__quote" lang="kk">
              {target.text}
            </blockquote>
          )}
        </header>

        <fieldset className="feedback__topics">
          <legend className="label">{t(report ? 'report.reason' : 'feedback.topic')}</legend>
          <div className="filters">
            {TOPICS[target.kind].map((o) => (
              <button
                key={o.id}
                type="button"
                className={`filter${topic === o.id ? ' is-active' : ''}`}
                aria-pressed={topic === o.id}
                onClick={() => {
                  setTopic(topic === o.id ? '' : o.id);
                  setMissing(false);
                }}
              >
                {t(o.label)}
              </button>
            ))}
          </div>
        </fieldset>

        <label className="feedback__field">
          <span className="label">{t(report ? 'report.text' : 'feedback.text')}</span>
          <textarea
            rows={4}
            maxLength={MAX_TEXT}
            value={text}
            placeholder={t(report ? 'report.text.placeholder' : 'feedback.text.placeholder')}
            onChange={(e) => {
              setText(e.target.value);
              setMissing(false);
            }}
            aria-invalid={missing}
          />
          <small className="feedback__count">
            {text.length} / {MAX_TEXT}
          </small>
        </label>

        <label className="feedback__field">
          <span className="label">{t('feedback.contact')}</span>
          <input type="text" maxLength={120} value={contact} placeholder={t('feedback.contact.placeholder')} onChange={(e) => setContact(e.target.value)} autoComplete="email" />
        </label>

        {missing && <p className="notice notice--warn">{t(report ? 'feedback.empty.report' : 'feedback.empty')}</p>}
        {status === 'error' && (
          <p className="notice notice--warn" role="alert">
            {t('feedback.failed')}{' '}
            {DONATE.telegram.map((name, i) => (
              <span key={name}>
                {i > 0 && ', '}
                <a href={telegramUrl(name)} target="_blank" rel="noreferrer">
                  @{name}
                </a>
              </span>
            ))}
          </p>
        )}

        <footer className="feedback__foot">
          <p className="hint">
            <Icon name="shield" size={14} /> {t('feedback.privacy')} <TermsLink />
          </p>
          <button type="submit" className="btn btn--primary" disabled={status === 'sending'}>
            <Icon name="send" size={16} /> {status === 'sending' ? t('feedback.sending') : t('feedback.send')}
          </button>
        </footer>
      </form>
    </Modal>
  );
}
