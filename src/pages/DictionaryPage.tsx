import { useDeferredValue, useMemo, useState } from 'react';
import { GestureVisual } from '../components/GestureVisual';
import { Icon } from '../components/Icon';
import { describeGesture } from '../data/gestureText';
import { SIGN_BY_WORD, SIGNS } from '../data/signs';
import { CATEGORIES, type CategoryId } from '../data/vocabulary';
import { capitalize, glossOf, matchesQuery, useAllWords, type AnyWord } from '../data/words';
import { useT } from '../i18n';
import { signPoster } from '../lib/media';
import { speakText } from '../lib/phrase';
import { useSession } from '../store/session';
import { useSettings } from '../store/settings';
import { useTraining } from '../store/training';
import { useUi } from '../store/ui';

type Filter = CategoryId | 'custom' | 'all';

function WordCard({ word, sampleCount }: { word: AnyWord; sampleCount: number }) {
  const t = useT();
  const lang = useSettings((s) => s.lang);
  const title = capitalize(word.kk) + (word.question ? '?' : '');
  const sign = SIGN_BY_WORD.get(word.id);

  const add = () => {
    useSession.getState().addWord(word.id, 'tap');
    useUi.getState().showToast(t('dict.added', { w: word.kk }));
  };

  return (
    <article className="word-card">
      <header className="word-card__head">
        <div>
          <h3 lang="kk">{title}</h3>
          <p className="word-card__ru">{glossOf(word, lang)}</p>
        </div>
        {sampleCount > 0 && (
          <span className="badge badge--trained" title={t('dict.trained', { n: sampleCount })}>
            <Icon name="check" size={12} /> {sampleCount}
          </span>
        )}
      </header>
      {sign && (
        <button
          type="button"
          className="word-card__video"
          onClick={() => useUi.getState().openLesson(sign.id, SIGNS.map((s) => s.id))}
          aria-label={`${t('learn.watch')}: ${word.kk}`}
        >
          <img src={signPoster(sign.id)} alt="" loading="lazy" width={450} height={640} />
          <span>
            <Icon name="play" size={14} /> {t('learn.watch')}
          </span>
        </button>
      )}
      {word.gesture ? (
        <>
          <GestureVisual spec={word.gesture} lang={lang} />
          <p className="word-card__desc">{describeGesture(word.gesture, lang)}</p>
        </>
      ) : (
        <p className="word-card__desc">{t('dict.customWord')}</p>
      )}
      {word.hint && <p className="word-card__hint">{word.hint[lang]}</p>}
      <footer className="word-card__actions">
        <button className="btn btn--sm" onClick={() => void speakText(title)} aria-label={`${t('dict.listen')}: ${word.kk}`}>
          <Icon name="speaker" size={15} /> {t('dict.listen')}
        </button>
        <button className="btn btn--sm" onClick={add}>
          <Icon name="plus" size={15} /> {t('dict.add')}
        </button>
        <a
          className="btn btn--sm btn--ghost btn--icon"
          href={`#/train?word=${encodeURIComponent(word.id)}`}
          title={t('dict.train')}
          aria-label={`${t('dict.train')}: ${word.kk}`}
        >
          <Icon name="graduate" size={17} />
        </a>
      </footer>
    </article>
  );
}

export function DictionaryPage() {
  const t = useT();
  const lang = useSettings((s) => s.lang);
  // Only the words that have a video lesson are listed; recognition still knows all of them.
  const allWords = useAllWords();
  const words = useMemo(() => allWords.filter((w) => SIGN_BY_WORD.has(w.id)), [allWords]);
  const samples = useTraining((s) => s.samples);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const deferredQuery = useDeferredValue(query);

  const counts = useMemo(() => {
    const c = new Map<Filter, number>([['all', words.length]]);
    for (const w of words) c.set(w.category, (c.get(w.category) ?? 0) + 1);
    return c;
  }, [words]);

  const visible = useMemo(() => {
    const q = deferredQuery.trim().toLocaleLowerCase();
    return words.filter((w) => (filter === 'all' || w.category === filter) && (!q || matchesQuery(w, q)));
  }, [words, filter, deferredQuery]);

  const filters: Array<{ id: Filter; label: string; icon?: string }> = [
    { id: 'all', label: t('dict.all') },
    ...CATEGORIES.filter((c) => counts.has(c.id)).map((c) => ({ id: c.id as Filter, label: c.label[lang], icon: c.icon })),
  ];

  return (
    <div className="page dictionary">
      <div className="dictionary__toolbar">
        <label className="search">
          <Icon name="search" />
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('dict.search')} aria-label={t('dict.search')} />
        </label>
        <div className="filters" role="group" aria-label={t('nav.dictionary')}>
          {filters.map((f) => (
            <button key={f.id} className={`filter${filter === f.id ? ' is-active' : ''}`} aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}>
              {f.icon && <span aria-hidden="true">{f.icon}</span>}
              {f.label}
              <span className="filter__count">{counts.get(f.id) ?? 0}</span>
            </button>
          ))}
        </div>
      </div>

      <p className="notice">{t('dict.notice')}</p>

      {visible.length === 0 ? (
        <p className="empty empty--large">{t('dict.nothing')}</p>
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
