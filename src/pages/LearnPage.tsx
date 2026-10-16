import { useMemo, useState, type CSSProperties } from 'react';
import { Icon } from '../components/Icon';
import { SIGN_TOPICS, SIGNS, type Sign, type SignTopicId } from '../data/signs';
import { capitalize } from '../data/words';
import { useT } from '../i18n';
import { signPoster, signVideo } from '../lib/media';
import { useAuth } from '../store/auth';
import { useLearn } from '../store/learn';
import { useSettings } from '../store/settings';
import { useUi } from '../store/ui';

type Status = 'all' | 'todo' | 'done';

const glossOf = (s: Sign, lang: string) => (lang === 'en' ? s.en : s.ru);

function shuffle<T>(items: readonly T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

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

function makeRound(learned: readonly string[]) {
  const fresh = SIGNS.filter((s) => !learned.includes(s.id));
  const pool = fresh.length ? fresh : SIGNS;
  const answer = pool[Math.floor(Math.random() * pool.length)];
  const others = shuffle(SIGNS.filter((s) => s.id !== answer.id)).slice(0, 3);
  return { answer, options: shuffle([answer, ...others]) };
}

function Quiz({ onClose }: { onClose: () => void }) {
  const t = useT();
  const lang = useSettings((s) => s.lang);
  const [round, setRound] = useState(() => makeRound(useLearn.getState().learned));
  const [picked, setPicked] = useState<string | null>(null);
  const [score, setScore] = useState({ right: 0, total: 0 });
  const correct = picked === round.answer.id;

  const pick = (id: string) => {
    if (picked) return;
    setPicked(id);
    const right = id === round.answer.id;
    setScore((s) => ({ right: s.right + (right ? 1 : 0), total: s.total + 1 }));
    if (right) useLearn.getState().mark(round.answer.id);
  };

  const next = () => {
    setRound(makeRound(useLearn.getState().learned));
    setPicked(null);
  };

  return (
    <section className="quiz" aria-labelledby="quiz-title">
      <div className="quiz__media">
        <video key={round.answer.id} src={signVideo(round.answer.id)} poster={signPoster(round.answer.id)} autoPlay muted loop playsInline />
      </div>
      <div className="quiz__body">
        <header className="quiz__head">
          <h2 id="quiz-title">{t('learn.quiz.title')}</h2>
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
              {t(correct ? 'learn.quiz.correct' : 'learn.quiz.wrong', { w: round.answer.kk })}
            </p>
          )}
          <span className="quiz__score">{t('learn.quiz.score', { n: score.right, total: score.total })}</span>
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

  return (
    <div className="page learn">
      <header className="page-hero">
        <div>
          <p className="eyebrow">{t('home.eyebrow')}</p>
          <h1>{t('learn.title')}</h1>
          <p>{t('learn.sub')}</p>
        </div>
        <div className="learn__progress">
          <div className="progress-ring" style={{ '--p': percent } as CSSProperties} role="img" aria-label={t('learn.progress', { n: learned.length, total: SIGNS.length })}>
            <strong>{learned.length}</strong>
            <small>/ {SIGNS.length}</small>
          </div>
          <div>
            <strong>{learned.length === SIGNS.length ? t('learn.allDone') : t('learn.progress', { n: learned.length, total: SIGNS.length })}</strong>
            <button type="button" className="btn btn--primary" onClick={() => setQuiz((q) => !q)} aria-expanded={quiz}>
              <Icon name="quiz" size={17} /> {t('learn.quiz')}
            </button>
          </div>
        </div>
      </header>

      {!user && available && (
        <div className="learn__guest">
          <Icon name="trophy" size={18} />
          <p>{t('learn.guest')}</p>
          <button type="button" className="btn btn--sm btn--primary" onClick={() => useUi.getState().openDialog('register')}>
            {t('account.register')}
          </button>
        </div>
      )}

      {quiz && <Quiz onClose={() => setQuiz(false)} />}

      <div className="learn__filters">
        <div className="segmented" role="group">
          {(['all', 'todo', 'done'] as const).map((s) => (
            <button key={s} type="button" className={status === s ? 'is-active' : ''} aria-pressed={status === s} onClick={() => setStatus(s)}>
              {t(s === 'all' ? 'learn.all' : s === 'todo' ? 'learn.todo' : 'learn.done')}
            </button>
          ))}
        </div>
        <div className="filters" role="group">
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
              <span aria-hidden="true">{tp.icon}</span>
              {tp.label[lang]}
              <span className="filter__count">{SIGNS.filter((s) => s.topic === tp.id).length}</span>
            </button>
          ))}
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="empty empty--large">{t('learn.empty')}</p>
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
