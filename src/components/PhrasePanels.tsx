import { useEffect, useMemo, useState } from 'react';
import { capitalize, glossOf, lookupWord, type AnyWord } from '../data/words';
import { LOCALES, useT } from '../i18n';
import { QUICK_PHRASES, buildPredictor, frequentPhrases } from '../lang/predict';
import { composeLocal } from '../lib/compose';
import { finalizeSentence, repeatPhrase, sayPhrase, speakText } from '../lib/phrase';
import { usableKazakhBrowserVoice } from '../lib/speech';
import { useSession } from '../store/session';
import { useSettings } from '../store/settings';
import { useServerStatus } from '../store/status';
import { useTraining } from '../store/training';
import { useUi } from '../store/ui';
import { useVoice } from '../store/voice';
import { Icon } from './Icon';

function Suggestions({ context }: { context: string[] }) {
  const t = useT();
  const history = useSession((s) => s.history);
  const addWord = useSession((s) => s.addWord);
  const userWords = useTraining((s) => s.userWords);
  const predictor = useMemo(() => buildPredictor(history), [history]);
  const ids = predictor.suggest(context, 6, (id) => Boolean(lookupWord(id, userWords)));
  if (ids.length === 0) return null;
  return (
    <div className="suggest" aria-label={t('suggest.title')}>
      <span className="suggest__label">{t('suggest.title')}</span>
      {ids.map((id) => (
        <button key={id} className="suggest__chip" lang="kk" onClick={() => addWord(id, 'tap')}>
          <Icon name="plus" size={12} />
          {lookupWord(id, userWords)!.kk}
        </button>
      ))}
    </div>
  );
}

export function SentencePanel() {
  const t = useT();
  const tokens = useSession((s) => s.tokens);
  const composing = useSession((s) => s.composing);
  const removeToken = useSession((s) => s.removeToken);
  const undo = useSession((s) => s.undo);
  const clear = useSession((s) => s.clear);
  const userWords = useTraining((s) => s.userWords);
  const autoSpeak = useSettings((s) => s.autoSpeak);
  const pauseMs = useSettings((s) => s.pauseMs);
  const suggestions = useSettings((s) => s.suggestions);

  const items = tokens.flatMap((token) => {
    const word = lookupWord(token.wordId, userWords);
    return word ? [{ token, word }] : [];
  });
  const preview = composeLocal(items.map((i) => i.word));

  return (
    <section className="card sentence" aria-labelledby="sentence-title">
      <header className="card__header">
        <h2 id="sentence-title" className="card__heading">
          <span className="card__icon" aria-hidden="true">
            <Icon name="message" size={16} />
          </span>
          {t('sentence.title')}
        </h2>
        {items.length > 0 && <span className="count">{items.length}</span>}
      </header>

      <div className="sentence__chips" aria-live="polite">
        {items.length === 0 ? (
          <p className="empty">{t('sentence.empty')}</p>
        ) : (
          items.map(({ token, word }) => (
            <span key={token.key} className={`word-chip word-chip--${token.source}`} lang="kk">
              {word.kk}
              <button onClick={() => removeToken(token.key)} aria-label={`${t('sentence.remove')}: ${word.kk}`}>
                <Icon name="x" size={12} />
              </button>
            </span>
          ))
        )}
      </div>
      {items.length > 0 && (
        <p className="sentence__preview" lang="kk">
          {preview}
        </p>
      )}
      {suggestions && <Suggestions context={items.map((i) => i.word.id)} />}

      <div className="sentence__actions">
        <button className="btn btn--primary btn--lg btn--grow" disabled={!items.length || composing} onClick={() => void finalizeSentence()}>
          <Icon name="speaker" size={20} /> {t('sentence.speak')}
        </button>
        <button className="btn btn--icon" disabled={!items.length} onClick={undo} title={t('sentence.undo')} aria-label={t('sentence.undo')}>
          <Icon name="backspace" />
        </button>
        <button className="btn btn--icon" disabled={!items.length} onClick={clear} title={t('sentence.clear')} aria-label={t('sentence.clear')}>
          <Icon name="x" />
        </button>
      </div>
      <p className="hint">
        {autoSpeak && <>{t('sentence.auto', { s: (pauseMs / 1000).toFixed(1) })} · </>}
        {t('sentence.keys')}
      </p>
    </section>
  );
}

/** Offers the free offline Kazakh voice when nothing else can speak Kazakh. */
export function VoiceBanner() {
  const t = useT();
  const engine = useSettings((s) => s.engine);
  const voiceId = useSettings((s) => s.voiceId);
  const status = useVoice((s) => s.status[voiceId]);
  const progress = useVoice((s) => s.progress);
  const error = useVoice((s) => s.error);
  const download = useVoice((s) => s.download);
  const online = useUi((s) => s.online);
  const serverTts = useServerStatus((s) => Boolean(s.server?.tts));
  const [browserKazakh, setBrowserKazakh] = useState<boolean | null>(null);

  useEffect(() => {
    void usableKazakhBrowserVoice(online).then((v) => setBrowserKazakh(Boolean(v)));
  }, [online]);

  const covered = status === 'ready' || (engine !== 'offline' && ((serverTts && online) || browserKazakh));
  if (browserKazakh === null || status === 'unknown' || engine === 'browser' || covered) return null;

  return (
    <div className="voice-banner" role="status">
      <p>{status === 'error' ? t('voice.failed', { e: error ?? '' }) : t('voice.missing')}</p>
      {status === 'downloading' ? (
        <div className="progress" aria-label={t('voice.downloading', { p: Math.round(progress * 100) })}>
          <span style={{ width: `${Math.round(progress * 100)}%` }} />
          <small>{t('voice.downloading', { p: Math.round(progress * 100) })}</small>
        </div>
      ) : (
        <button className="btn btn--sm" disabled={!online} onClick={() => void download(voiceId)}>
          <Icon name="download" size={15} /> {status === 'error' ? t('voice.retry') : t('voice.download')}
        </button>
      )}
    </div>
  );
}

export function OutputPanel() {
  const t = useT();
  const output = useSession((s) => s.output);
  const composing = useSession((s) => s.composing);
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    if (!output) return;
    try {
      await navigator.clipboard.writeText(output.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked — nothing to do */
    }
  };

  return (
    <section className="card output" aria-labelledby="output-title">
      <header className="card__header">
        <h2 id="output-title" className="card__heading">
          <span className="card__icon card__icon--warm" aria-hidden="true">
            <Icon name="speaker" size={16} />
          </span>
          {t('output.title')}
        </h2>
        {output && !composing && (
          <span className={`badge${output.via === 'ai' ? ' badge--ai' : ''}`}>
            {output.via === 'ai' && <Icon name="sparkles" size={13} />}
            {output.via === 'ai' ? t('output.viaAi') : t('output.viaLocal')}
          </span>
        )}
      </header>
      <div aria-live="assertive">
        {composing ? (
          <p className="output__text output__text--busy">{t('output.composing')}</p>
        ) : output ? (
          <p className="output__text" lang="kk">
            {output.text}
          </p>
        ) : (
          <p className="empty">{t('output.empty')}</p>
        )}
      </div>
      {output && !composing && (
        <div className="output__actions">
          <button className="btn" onClick={() => void speakText(output.text)}>
            <Icon name="replay" /> {t('output.replay')}
          </button>
          <button className="btn btn--ghost" onClick={() => void copy()}>
            <Icon name={copied ? 'check' : 'copy'} /> {copied ? t('output.copied') : t('output.copy')}
          </button>
        </div>
      )}
      <VoiceBanner />
    </section>
  );
}

const wordsOf = (ids: readonly string[]): AnyWord[] => ids.flatMap((id) => lookupWord(id) ?? []);

export function QuickPhrasesPanel() {
  const t = useT();
  const lang = useSettings((s) => s.lang);
  const history = useSession((s) => s.history);

  const frequent = useMemo(() => frequentPhrases(history, 4), [history]);
  const quick = useMemo(() => {
    const seen = new Set(frequent.map((p) => p.text));
    return QUICK_PHRASES.map((ids) => {
      const words = wordsOf(ids);
      return { ids, text: composeLocal(words), gloss: words.map((w) => (lang === 'kk' ? w.kk : glossOf(w, lang))).join(' · ') };
    }).filter((p) => !seen.has(p.text));
  }, [frequent, lang]);

  return (
    <section className="card quick" aria-labelledby="quick-title">
      <header className="card__header">
        <h2 id="quick-title" className="card__heading">
          <span className="card__icon card__icon--violet" aria-hidden="true">
            <Icon name="sparkles" size={16} />
          </span>
          {t('quick.title')}
        </h2>
      </header>
      <div className="quick__grid">
        {frequent.map((p) => (
          <button key={p.id} className="quick__item quick__item--frequent" lang="kk" onClick={() => void repeatPhrase(p.text, p.words)} title={t('quick.frequent')}>
            <Icon name="star" size={13} /> {p.text}
          </button>
        ))}
        {quick.map((p) => (
          <button key={p.text} className="quick__item" lang="kk" onClick={() => void sayPhrase(p.ids)} title={p.gloss}>
            {p.text}
          </button>
        ))}
      </div>
    </section>
  );
}

export function HistoryPanel() {
  const t = useT();
  const lang = useSettings((s) => s.lang);
  const history = useSession((s) => s.history);
  const clearHistory = useSession((s) => s.clearHistory);
  const time = new Intl.DateTimeFormat(LOCALES[lang], { hour: '2-digit', minute: '2-digit' });

  return (
    <section className="card history" aria-labelledby="history-title">
      <header className="card__header">
        <h2 id="history-title" className="card__heading">
          <span className="card__icon card__icon--muted" aria-hidden="true">
            <Icon name="replay" size={16} />
          </span>
          {t('history.title')}
        </h2>
        {history.length > 0 && (
          <button className="btn btn--ghost btn--sm" onClick={clearHistory}>
            {t('history.clear')}
          </button>
        )}
      </header>
      {history.length === 0 ? (
        <p className="empty">{t('history.empty')}</p>
      ) : (
        <ul className="history__list">
          {history.slice(0, 30).map((p) => (
            <li key={p.id}>
              <button className="history__item" onClick={() => void speakText(p.text)}>
                <Icon name="speaker" size={15} />
                <span lang="kk">{capitalize(p.text)}</span>
                <time dateTime={new Date(p.at).toISOString()}>{time.format(p.at)}</time>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
