import { useMemo, useState, type CSSProperties } from 'react';
import { Icon } from '../components/Icon';
import { PageHead } from '../components/PageHead';
import { SIGN_TOPICS, SIGNS, type Sign, type SignTopicId } from '../data/signs';
import { capitalize } from '../data/words';
import { useT } from '../i18n';
import { signPoster, signVideo } from '../lib/media';
import { makeRound } from '../lib/quiz';
import { useAuth } from '../store/auth';
import { useLearn } from '../store/learn';
import { useSettings } from '../store/settings';
import { useUi } from '../store/ui';

type Status = 'all' | 'todo' | 'done';

const glossOf = (s: Sign, lang: string) => (lang === 'en' ? s.en : s.ru);

function SignCard({ sign, learned, onOpen }: { sign: Sign; learned: boolean; onOpen: () => void }) {
  const lang = useSettings((s) => s.lang);
  const [preview, setPreview] = useState(false);
  return (
    <button
      type="button"
      className={`sign-card${learned ? ' is-learned' : ''}`}
      onClick={onOpen}
      onPointerEnter={(e) => e.pointerType === 'mouse' && setPreview(true)}
      onPointerLeave={() => setPreview(false)}
    >
      <span className="sign-card__media">
        <img src={signPoster(sign.id)} alt="" loading="lazy" width={450} height={640} />
        {preview && <video src={signVideo(sign.id)} autoPlay muted loop playsInline />}
        <span className="sign-card__play" aria-hidden="true">
          <Icon name="play" size={16} />
        </span>
        {learned && (
          <span className="sign-card__check">
            <Icon name="check" size={14} />
          </span>
        )}
      </span>
      <span className="sign-card__text">
        <strong lang="kk">{capitalize(sign.kk)}</strong>
        <small>{glossOf(sign, lang)}</small>
      </span>
    </button>
  );
}

/**
 * “Check yourself”: a video and four words. New signs are learned with a
 * right answer; learned signs come back now and then, and a wrong answer
 * returns a forgotten one to the lessons.
 */
function Quiz({ onClose }: { onClose: () => void }) {
  const t = useT();
  const lang = useSettings((s) => s.lang);
  const [round, setRound] = useState(() => makeRound(useLearn.getState().learned));
  const [picked, setPicked] = useState<string | null>(null);
  const [score, setScore] = useState({ right: 0, total: 0 });
  const correct = picked === round.answer.id;
  const forgot = Boolean(picked) && !correct && round.review;

  const pick = (id: string) => {
    if (picked) return;
    setPicked(id);
    const right = id === round.answer.id;
    setScore((s) => ({ right: s.right + (right ? 1 : 0), total: s.total + 1 }));
    if (right) useLearn.getState().mark(round.answer.id);
    else if (round.review) useLearn.getState().unmark(round.answer.id);
  };

  const next = () => {
    setRound(makeRound(useLearn.getState().learned, round.answer.id));
    setPicked(null);
  };

  const result = correct
    ? t(round.review ? 'learn.quiz.remember' : 'learn.quiz.correct', { w: round.answer.kk })
    : t(round.review ? 'learn.quiz.forgot' : 'learn.quiz.wrong', { w: round.answer.kk });

  return (
    <section className="quiz" aria-labelledby="quiz-title">
      <div className="quiz__media">
        <video key={round.answer.id} src={signVideo(round.answer.id)} poster={signPoster(round.answer.id)} autoPlay muted loop playsInline />
      </div>
      <div className="quiz__body">
        <header className="quiz__head">
          <h2 id="quiz-title">
            {t('learn.quiz.title')}
            {round.review && <span className="quiz__tag">{t('learn.quiz.review')}</span>}
          </h2>
          <button type="button" className="btn btn--sm btn--ghost" onClick={onClose}>
            <Icon name="x" size={16} /> {t('learn.quiz.close')}
          </button>
        </header>
        <div className="quiz__options">
          {round.options.map((o) => {
            const state = !picked ? '' : o.id === round.answer.id ? ' is-right' : o.id === picked ? ' is-wrong' : ' is-dim';
            return (
              <button key={o.id} type="button" className={`quiz__option${state}`} onClick={() => pick(o.id)} disabled={Boolean(picked)}>
                <strong lang="kk">{capitalize(o.kk)}</strong>
                <small>{glossOf(o, lang)}</small>
              </button>
            );
          })}
        </div>
        <div className="quiz__foot" aria-live="polite">
          {picked && (
            <p className={`quiz__result${correct ? ' is-right' : ' is-wrong'}`}>
              <Icon name={correct ? 'check' : 'x'} size={18} />
              {result}
            </p>
          )}
          <span className="quiz__score">{t('learn.quiz.score', { n: score.right, total: score.total })}</span>
          {forgot && (
            <button type="button" className="btn" onClick={() => useUi.getState().openLesson(round.answer.id, [round.answer.id])}>
              <Icon name="play" size={15} /> {t('learn.quiz.watch')}
            </button>
          )}
          {picked && (
            <button type="button" className="btn btn--primary" onClick={next}>
              {t('learn.quiz.next')} <Icon name="arrowRight" size={16} />
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

export function LearnPage() {
  const t = useT();
  const lang = useSettings((s) => s.lang);
  const learned = useLearn((s) => s.learned);
  const user = useAuth((s) => s.user);
  const available = useAuth((s) => s.available);
  const [status, setStatus] = useState<Status>('all');
  const [topic, setTopic] = useState<SignTopicId | 'all'>('all');
  const [quiz, setQuiz] = useState(false);

  const visible = useMemo(
    () =>
      SIGNS.filter(
        (s) =>
          (topic === 'all' || s.topic === topic) &&
          (status === 'all' || (status === 'done') === learned.includes(s.id)),
      ),
    [learned, status, topic],
  );
  const percent = Math.round((learned.length / SIGNS.length) * 100);
  const open = (id: string) => useUi.getState().openLesson(id, visible.map((s) => s.id));
  const todo = SIGNS.filter((s) => !learned.includes(s.id));
  const next = todo[0];
  const allDone = todo.length === 0;

  return (
    <div className="page learn">
      <PageHead
        icon="film"
        eyebrow={t('home.eyebrow')}
        title={t('learn.title')}
        sub={t('learn.sub')}
        aside={
          <div className="learn-progress">
            <div className="progress-ring" style={{ '--p': percent } as CSSProperties} role="img" aria-label={t('learn.progress', { n: learned.length, total: SIGNS.length })}>
              <strong>{percent}%</strong>
            </div>
            <div className="learn-progress__body">
              <strong>{allDone ? t('learn.allDone') : t('learn.progress', { n: learned.length, total: SIGNS.length })}</strong>
              <div className="learn-progress__actions">
                {next && (
                  <button type="button" className="btn btn--primary btn--sm" onClick={() => useUi.getState().openLesson(next.id, todo.map((s) => s.id))}>
                    <Icon name="play" size={15} /> {t('learn.continue')}: <span lang="kk">{capitalize(next.kk)}</span>
                  </button>
                )}
                <button type="button" className={`btn btn--sm${quiz ? ' is-on' : ''}`} onClick={() => setQuiz((q) => !q)} aria-expanded={quiz}>
                  <Icon name="quiz" size={16} /> {t('learn.quiz')}
                </button>
              </div>
            </div>
          </div>
        }
      />

      {!user && available && (
        <div className="learn__guest">
          <Icon name="trophy" size={18} />
          <p>{t('learn.guest')}</p>
          <button type="button" className="btn btn--sm btn--primary" onClick={() => useUi.getState().goAuth('register')}>
            {t('account.register')}
          </button>
        </div>
      )}

      {quiz && <Quiz onClose={() => setQuiz(false)} />}

      <div className="toolbar toolbar--learn">
        <div className="segmented" role="group" aria-label={t('learn.title')}>
          {(['all', 'todo', 'done'] as const).map((s) => (
            <button key={s} type="button" className={status === s ? 'is-active' : ''} aria-pressed={status === s} onClick={() => setStatus(s)}>
              {t(s === 'all' ? 'learn.all' : s === 'todo' ? 'learn.todo' : 'learn.done')}
              <span className="segmented__count">{s === 'all' ? SIGNS.length : s === 'todo' ? todo.length : learned.length}</span>
            </button>
          ))}
        </div>
        <div className="filters" role="group" aria-label={t('nav.learn')}>
          <button type="button" className={`filter${topic === 'all' ? ' is-active' : ''}`} aria-pressed={topic === 'all'} onClick={() => setTopic('all')}>
            {t('learn.all')}
            <span className="filter__count">{SIGNS.length}</span>
          </button>
          {SIGN_TOPICS.map((tp) => (
            <button
              key={tp.id}
              type="button"
              className={`filter${topic === tp.id ? ' is-active' : ''}`}
              aria-pressed={topic === tp.id}
              onClick={() => setTopic(tp.id)}
            >
              <Icon name={tp.icon} size={14} />
              {tp.label[lang]}
              <span className="filter__count">{SIGNS.filter((s) => s.topic === tp.id).length}</span>
            </button>
          ))}
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="empty-state">
          <span className="empty-state__icon">
            <Icon name="film" size={22} />
          </span>
          <p>{t('learn.empty')}</p>
        </div>
      ) : (
        <div className="sign-grid">
          {visible.map((s) => (
            <SignCard key={s.id} sign={s} learned={learned.includes(s.id)} onOpen={() => open(s.id)} />
          ))}
        </div>
      )}
    </div>
  );
}
