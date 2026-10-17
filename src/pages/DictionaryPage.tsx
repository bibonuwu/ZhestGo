import { useDeferredValue, useMemo, useState } from 'react';
import { GestureVisual } from '../components/GestureVisual';
import { Icon } from '../components/Icon';
import { PageHead } from '../components/PageHead';
import { describeGesture } from '../data/gestureText';
import { SIGN_BY_WORD, SIGNS } from '../data/signs';
import { CATEGORIES, type CategoryId, type TopicIcon } from '../data/vocabulary';
import type { WordEntry } from '../data/vocabulary';
import { capitalize, glossOf, LESSON_WORDS, matchesQuery } from '../data/words';
import { useT } from '../i18n';
import { signPoster } from '../lib/media';
import { speakText } from '../lib/phrase';
import { useSession } from '../store/session';
import { useSettings } from '../store/settings';
import { useTraining } from '../store/training';
import { useUi } from '../store/ui';

type Filter = CategoryId | 'all';

function WordCard({ word, sampleCount }: { word: WordEntry; sampleCount: number }) {
  const t = useT();
  const lang = useSettings((s) => s.lang);
  const templates = useSettings((s) => s.mode === 'all' || s.mode === 'templates');
  const title = capitalize(word.kk) + (word.question ? '?' : '');
  const sign = SIGN_BY_WORD.get(word.id);
  // The camera reads the sign from the video unless Qoldau's templates are switched on.
  const gesture = word.gesture && (templates || !sign) ? word.gesture : null;
  const category = CATEGORIES.find((c) => c.id === word.category);

  const add = () => {
    useSession.getState().addWord(word.id, 'tap');
    useUi.getState().showToast(t('dict.added', { w: word.kk }));
  };
  const watch = () => sign && useUi.getState().openLesson(sign.id, SIGNS.map((s) => s.id));

  return (
    <article className="word-card">
      <div className="word-card__top">
        {sign && (
          <button type="button" className="word-card__poster" onClick={watch} aria-label={`${t('learn.watch')}: ${word.kk}`}>
            <img src={signPoster(sign.id)} alt="" loading="lazy" width={450} height={640} />
            <span className="word-card__play" aria-hidden="true">
              <Icon name="play" size={14} />
            </span>
          </button>
        )}
        <div className="word-card__title">
          <h3 lang="kk">{title}</h3>
          <p className="word-card__gloss">{glossOf(word, lang)}</p>
          <div className="word-card__tags">
            {category && (
              <span className="tag">
                <Icon name={category.icon} size={12} /> {category.label[lang]}
              </span>
            )}
            {sampleCount > 0 && (
              <span className="tag tag--ok" title={t('dict.trained', { n: sampleCount })}>
                <Icon name="check" size={12} /> {sampleCount}
              </span>
            )}
          </div>
          {sign && (
            <button type="button" className="word-card__watch" onClick={watch}>
              <Icon name="play" size={13} /> {t('learn.watch')}
            </button>
          )}
        </div>
        <button
          type="button"
          className="round-btn"
          onClick={() => void speakText(title)}
          title={t('dict.listen')}
          aria-label={`${t('dict.listen')}: ${word.kk}`}
        >
          <Icon name="speaker" size={17} />
        </button>
      </div>

      {gesture ? (
        <div className="word-card__how">
          <span className="label">{t('dict.how')}</span>
          <GestureVisual spec={gesture} lang={lang} />
          <p className="word-card__desc">{describeGesture(gesture, lang)}</p>
        </div>
      ) : (
        <p className="word-card__desc">{t('dict.fromVideo')}</p>
      )}
      {gesture && word.hint && (
        <p className="word-card__hint">
          <Icon name="info" size={14} />
          {word.hint[lang]}
        </p>
      )}

      <footer className="word-card__actions">
        <button type="button" className="btn btn--sm btn--soft" onClick={add}>
          <Icon name="plus" size={15} /> {t('dict.add')}
        </button>
        <a className="btn btn--sm btn--ghost" href={`#/train?word=${encodeURIComponent(word.id)}`} aria-label={`${t('dict.train')}: ${word.kk}`}>
          <Icon name="graduate" size={16} /> {t('dict.train')}
        </a>
      </footer>
    </article>
  );
}

export function DictionaryPage() {
  const t = useT();
  const lang = useSettings((s) => s.lang);
  // Only the words that have a video lesson.
  const words = LESSON_WORDS;
  const samples = useTraining((s) => s.samples);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const deferredQuery = useDeferredValue(query);

  const counts = useMemo(() => {
    const c = new Map<Filter, number>([['all', words.length]]);
    for (const w of words) c.set(w.category, (c.get(w.category) ?? 0) + 1);
    return c;
  }, [words]);

  const q = deferredQuery.trim().toLocaleLowerCase();
  const visible = useMemo(() => words.filter((w) => (filter === 'all' || w.category === filter) && (!q || matchesQuery(w, q))), [words, filter, q]);
  // A searched word that is not among the lessons at all (not just outside the chosen category).
  const unknownWord = q !== '' && !words.some((w) => matchesQuery(w, q));

  const filters: Array<{ id: Filter; label: string; icon?: TopicIcon }> = [
    { id: 'all', label: t('dict.all') },
    ...CATEGORIES.filter((c) => counts.has(c.id)).map((c) => ({ id: c.id as Filter, label: c.label[lang], icon: c.icon })),
  ];

  return (
    <div className="page dictionary">
      <PageHead icon="book" eyebrow={t('page.dict.eyebrow', { n: words.length })} title={t('nav.dictionary')} sub={t('page.dict.sub')} />

      <div className="toolbar">
        <label className="search">
          <Icon name="search" />
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('dict.search')} aria-label={t('dict.search')} />
          {query && (
            <button type="button" className="search__clear" onClick={() => setQuery('')} aria-label={t('sentence.clear')}>
              <Icon name="x" size={15} />
            </button>
          )}
        </label>
        <div className="filters" role="group" aria-label={t('nav.dictionary')}>
          {filters.map((f) => (
            <button key={f.id} className={`filter${filter === f.id ? ' is-active' : ''}`} aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}>
              {f.icon && <Icon name={f.icon} size={14} />}
              {f.label}
              <span className="filter__count">{counts.get(f.id) ?? 0}</span>
            </button>
          ))}
        </div>
      </div>

      <p className="notice notice--info">
        <Icon name="info" size={17} />
        <span>{t('dict.notice')}</span>
      </p>

      {visible.length === 0 ? (
        <div className="empty-state">
          <span className="empty-state__icon">
            <Icon name="search" size={22} />
          </span>
          {unknownWord ? (
            <>
              <p className="empty-state__title">{t('dict.notYet', { w: deferredQuery.trim() })}</p>
              <p>{t('dict.notYet.sub')}</p>
            </>
          ) : (
            <p>{t('dict.nothing')}</p>
          )}
          <button
            type="button"
            className="btn btn--sm"
            onClick={() => {
              setQuery('');
              setFilter('all');
            }}
          >
            <Icon name="replay" size={15} /> {t('dict.all')}
          </button>
        </div>
      ) : (
        <div className="word-grid">
          {visible.map((w) => (
            <WordCard key={w.id} word={w} sampleCount={samples[w.id]?.length ?? 0} />
          ))}
        </div>
      )}
    </div>
  );
}
