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

const ALL_IDS = SIGNS.map((s) => s.id);

/** Plays one sign's video lesson, with “Learned”, slow motion and previous/next. */
export function LessonDialog({ id, onClose }: { id: string; onClose: () => void }) {
  const t = useT();
  const lang = useSettings((s) => s.lang);
  const list = useUi((s) => (s.lessonList.length ? s.lessonList : ALL_IDS));
  const learned = useLearn((s) => s.learned.includes(id));
  const [slow, setSlow] = useState(false);
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
    const wasLearned = learned;
    useLearn.getState().toggle(sign.id);
    if (!wasLearned) useUi.getState().showToast(t('learn.marked', { w: sign.kk }));
  };

  const listen = async () => {
    const { speakText } = await import('../lib/phrase');
    void speakText(capitalize(sign.kk));
  };

  return (
    <Modal onClose={onClose} labelledBy="lesson-title" className="lesson">
      <ModalClose onClose={onClose} />
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
      </div>

      <div className="lesson__info">
        {topic && (
          <p className="eyebrow">
            {topic.icon} {topic.label[lang]}
          </p>
        )}
        <h2 id="lesson-title" lang="kk">
          {capitalize(sign.kk)}
        </h2>
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
          {sign.wordId && (
            <a className="btn btn--sm btn--ghost" href={`#/train?word=${encodeURIComponent(sign.wordId)}`} onClick={onClose}>
              <Icon name="video" size={16} /> {t('nav.train')}
            </a>
          )}
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
          {learned ? t('learn.learned') : t('learn.mark')}
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
    </Modal>
  );
}
