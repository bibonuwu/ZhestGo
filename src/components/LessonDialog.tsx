import { useEffect, useRef, useState } from 'react';
import { SIGN_TOPICS, SIGNS, SIGNS_BY_ID } from '../data/signs';
import { capitalize } from '../data/words';
import { useT } from '../i18n';
import { signPoster, signVideo } from '../lib/media';
import { useLearn } from '../store/learn';
import { useSettings } from '../store/settings';
import { useUi } from '../store/ui';
import { Icon } from './Icon';
import { Modal, ModalClose } from './Modal';
import { SignCheck } from './SignCheck';
import { Syllables } from './Syllables';

const ALL_IDS = SIGNS.map((s) => s.id);

/**
 * Plays one sign's video lesson, with slow motion and previous/next.
 * “I learned it” opens a short check first (see SignCheck).
 */
export function LessonDialog({ id, onClose }: { id: string; onClose: () => void }) {
  const t = useT();
  const lang = useSettings((s) => s.lang);
  const list = useUi((s) => (s.lessonList.length ? s.lessonList : ALL_IDS));
  const learned = useLearn((s) => s.learned.includes(id));
  const [slow, setSlow] = useState(false);
  /** The sign whose check is open; going to another lesson closes it. */
  const [checkFor, setCheckFor] = useState<string | null>(null);
  const checking = checkFor === id;
  const video = useRef<HTMLVideoElement>(null);

  const sign = SIGNS_BY_ID.get(id);
  const index = list.indexOf(id);
  const prev = index > 0 ? list[index - 1] : undefined;
  const next = index >= 0 && index < list.length - 1 ? list[index + 1] : undefined;
  const go = (to: string | undefined) => to && useUi.getState().openLesson(to);

  useEffect(() => {
    if (video.current) video.current.playbackRate = slow ? 0.5 : 1;
  }, [slow, id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (checking) return;
      if (e.key === 'ArrowLeft') go(prev);
      if (e.key === 'ArrowRight') go(next);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (!sign) return null;
  const topic = SIGN_TOPICS.find((x) => x.id === sign.topic);
  const gloss = lang === 'en' ? sign.en : sign.ru;

  const toggle = () => {
    if (learned) useLearn.getState().unmark(sign.id);
    else setCheckFor(sign.id);
  };

  const listen = async () => {
    const { speakText } = await import('../lib/phrase');
    void speakText(capitalize(sign.kk));
  };

  return (
    <Modal onClose={onClose} labelledBy={checking ? 'check-title' : 'lesson-title'} className="lesson">
      <ModalClose onClose={onClose} />
      {checking ? (
        <SignCheck
          key={sign.id}
          sign={sign}
          onPass={() => useLearn.getState().mark(sign.id)}
          onBack={() => setCheckFor(null)}
          onNext={next ? () => go(next) : undefined}
        />
      ) : (
        <>
          <div className="lesson__media">
            <video
              ref={video}
              key={sign.id}
              src={signVideo(sign.id)}
              poster={signPoster(sign.id)}
              autoPlay
              muted
              loop
              playsInline
              onLoadedMetadata={(e) => (e.currentTarget.playbackRate = slow ? 0.5 : 1)}
            />
            {index >= 0 && (
              <span className="lesson__count">
                {index + 1} / {list.length}
              </span>
            )}
            <button
              type="button"
              className="lesson__report"
              onClick={() => useUi.getState().openFeedback({ kind: 'lesson', id: sign.id, word: sign.kk })}
              title={t('report.button')}
            >
              <Icon name="flag" size={14} /> {t('report.short')}
            </button>
          </div>

          <div className="lesson__info">
            {topic && (
              <p className="eyebrow">
                <Icon name={topic.icon} size={14} /> {topic.label[lang]}
              </p>
            )}
            <h2 id="lesson-title" lang="kk">
              {capitalize(sign.kk)}
            </h2>
            <Syllables key={sign.id} text={capitalize(sign.kk)} />
            <p className="lesson__gloss">{gloss}</p>

            <div className="lesson__tools">
              <button type="button" className="btn btn--sm" onClick={() => void listen()}>
                <Icon name="speaker" size={16} /> {t('dict.listen')}
              </button>
              <button type="button" className={`btn btn--sm${slow ? ' is-on' : ''}`} aria-pressed={slow} onClick={() => setSlow((v) => !v)}>
                <Icon name="turtle" size={16} /> {t('learn.slow')}
              </button>
              <button
                type="button"
                className="btn btn--sm"
                onClick={() => {
                  if (!video.current) return;
                  video.current.currentTime = 0;
                  void video.current.play();
                }}
                aria-label={t('output.replay')}
              >
                <Icon name="replay" size={16} />
              </button>
            </div>

            <button
              type="button"
              className={`lesson__mark${learned ? ' is-done' : ''}`}
              aria-pressed={learned}
              title={learned ? t('learn.unmark') : undefined}
              onClick={toggle}
            >
              <span className="lesson__mark-box">
                <Icon name="check" size={18} />
              </span>
              <span className="lesson__mark-text">
                {learned ? t('learn.learned') : t('learn.mark')}
                {!learned && <small>{t('learn.mark.hint')}</small>}
              </span>
            </button>

            <nav className="lesson__nav">
              <button type="button" className="btn" disabled={!prev} onClick={() => go(prev)}>
                <Icon name="chevronLeft" size={18} /> {t('learn.prev')}
              </button>
              <button type="button" className="btn btn--primary" disabled={!next} onClick={() => go(next)}>
                {t('learn.next')} <Icon name="chevronRight" size={18} />
              </button>
            </nav>
          </div>
        </>
      )}
    </Modal>
  );
}
