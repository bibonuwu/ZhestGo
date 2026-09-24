import { useCallback, useDeferredValue, useEffect, useLayoutEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { CameraStage } from '../components/CameraStage';
import { GestureVisual } from '../components/GestureVisual';
import { Icon } from '../components/Icon';
import { describeGesture } from '../data/gestureText';
import { capitalize, lookupWord, useAllWords } from '../data/words';
import type { EngineFrame } from '../hooks/useGestureEngine';
import { useT } from '../i18n';
import { useSettings } from '../store/settings';
import { useTraining } from '../store/training';
import { useUi } from '../store/ui';

const RECORD_MS = 2500;
const SAMPLE_EVERY_MS = 70;
const MIN_FRAMES = 6;

type Phase = 'idle' | 'countdown' | 'recording';

export function TrainPage({ initialWord }: { initialWord?: string }) {
  const t = useT();
  const lang = useSettings((s) => s.lang);
  const mode = useSettings((s) => s.mode);
  const cameraOn = useUi((s) => s.cameraOn);
  const words = useAllWords();
  const { samples, userWords, addSamples, clearWord, addUserWord, deleteUserWord, exportData, importData, resetAll } = useTraining();

  const [selectedId, setSelectedId] = useState(() => (initialWord && lookupWord(initialWord) ? initialWord : words[0].id));
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const [phase, setPhase] = useState<Phase>('idle');
  const [countdown, setCountdown] = useState(3);
  const [message, setMessage] = useState<string | null>(null);
  const [newKk, setNewKk] = useState('');
  const [newRu, setNewRu] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);

  const buffer = useRef<number[][]>([]);
  const lastSampleAt = useRef(0);
  const phaseRef = useRef(phase);
  const selectedRef = useRef(selectedId);
  useLayoutEffect(() => {
    phaseRef.current = phase;
    selectedRef.current = selectedId;
  });

  useEffect(() => {
    if (initialWord && lookupWord(initialWord)) setSelectedId(initialWord);
  }, [initialWord]);

  const selected = lookupWord(selectedId, userWords) ?? words[0];
  const sampleCount = samples[selected.id]?.length ?? 0;

  const onFrame = useCallback((f: EngineFrame) => {
    if (phaseRef.current !== 'recording' || !f.features || f.t - lastSampleAt.current < SAMPLE_EVERY_MS) return;
    lastSampleAt.current = f.t;
    buffer.current.push(f.features);
  }, []);

  useEffect(() => {
    if (phase === 'countdown') {
      if (countdown === 0) {
        buffer.current = [];
        setPhase('recording');
        return;
      }
      const id = setTimeout(() => setCountdown((n) => n - 1), 800);
      return () => clearTimeout(id);
    }
    if (phase === 'recording') {
      const id = setTimeout(() => {
        const vectors = buffer.current;
        buffer.current = [];
        setPhase('idle');
        if (vectors.length < MIN_FRAMES) {
          setMessage(t('train.noHands'));
        } else {
          addSamples(selectedRef.current, vectors);
          setMessage(t('train.saved', { n: vectors.length }));
        }
      }, RECORD_MS);
      return () => clearTimeout(id);
    }
  }, [phase, countdown, addSamples, t]);

  const startRecording = () => {
    setMessage(null);
    setCountdown(3);
    setPhase('countdown');
  };
  const cancelRecording = () => {
    buffer.current = [];
    setPhase('idle');
  };

  const q = deferredQuery.trim().toLocaleLowerCase();
  const listed = words.filter((w) => !q || w.kk.toLocaleLowerCase().includes(q) || w.ru.toLocaleLowerCase().includes(q));
  const trainedWords = Object.keys(samples).length;
  const totalSamples = Object.values(samples).reduce((n, list) => n + list.length, 0);

  const submitNewWord = (e: FormEvent) => {
    e.preventDefault();
    if (!newKk.trim()) return;
    const id = addUserWord(newKk, newRu);
    setSelectedId(id);
    setNewKk('');
    setNewRu('');
  };

  const download = () => {
    const blob = new Blob([JSON.stringify(exportData())], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `qoldau-gestures-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const upload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const n = importData(JSON.parse(await file.text()));
      useUi.getState().showToast(t('train.imported', { n }));
    } catch {
      useUi.getState().showToast(t('train.importFailed'));
    }
  };

  return (
    <div className="page train">
      <div className="train__stage">
        <div className="train__camera">
          <CameraStage onFrame={onFrame} />
          {phase !== 'idle' && (
            <div className={`record-banner record-banner--${phase}`} role="status">
              {phase === 'countdown' ? (
                <span className="record-banner__count">{t('train.countdown', { n: countdown || 1 })}</span>
              ) : (
                <>
                  <span className="record-banner__dot" aria-hidden="true" />
                  <span>{t('train.recording')}</span>
                  <span className="record-banner__bar" style={{ animationDuration: `${RECORD_MS}ms` }} />
                </>
              )}
            </div>
          )}
        </div>
        <p className="notice">{t('train.intro')}</p>
        {mode === 'templates' && <p className="notice notice--warn">{t('train.modeWarning')}</p>}
      </div>

      <aside className="train__side">
        <section className="card train-word" aria-live="polite">
          <header className="card__header">
            <div>
              <h2 lang="kk">{capitalize(selected.kk)}</h2>
              <p className="muted">{selected.ru}</p>
            </div>
            <span className={`badge${sampleCount ? ' badge--trained' : ''}`}>{t('train.samples', { n: sampleCount })}</span>
          </header>

          {selected.gesture ? (
            <div className="train-word__template">
              <span className="label">{t('train.template')}</span>
              <GestureVisual spec={selected.gesture} lang={lang} />
              <p className="word-card__desc">{describeGesture(selected.gesture, lang)}</p>
            </div>
          ) : (
            <p className="muted">{t('train.noTemplate')}</p>
          )}

          <div className="train-word__actions">
            {phase === 'idle' ? (
              <button className="btn btn--record btn--lg btn--grow" onClick={startRecording} disabled={!cameraOn}>
                <Icon name="record" /> {t('train.record')}
              </button>
            ) : (
              <button className="btn btn--lg btn--grow" onClick={cancelRecording}>
                <Icon name="x" /> {t('train.cancel')}
              </button>
            )}
            {sampleCount > 0 && (
              <button className="btn btn--icon" onClick={() => clearWord(selected.id)} title={t('train.clearWord')} aria-label={t('train.clearWord')}>
                <Icon name="trash" />
              </button>
            )}
          </div>
          {message && <p className="hint hint--strong">{message}</p>}
          <p className="hint">{t('train.tip')}</p>
          {selected.category === 'custom' && (
            <button
              className="btn btn--ghost btn--sm btn--danger"
              onClick={() => {
                deleteUserWord(selected.id);
                setSelectedId(words[0].id);
              }}
            >
              <Icon name="trash" size={14} /> {t('train.deleteWord')}
            </button>
          )}
        </section>

        <section className="card">
          <label className="search search--compact">
            <Icon name="search" />
            <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('train.search')} aria-label={t('train.search')} />
          </label>
          <ul className="word-list" role="listbox" aria-label={t('train.search')}>
            {listed.map((w) => {
              const n = samples[w.id]?.length ?? 0;
              return (
                <li key={w.id}>
                  <button
                    role="option"
                    aria-selected={w.id === selected.id}
                    className={`word-list__item${w.id === selected.id ? ' is-active' : ''}`}
                    onClick={() => {
                      setSelectedId(w.id);
                      setMessage(null);
                    }}
                    disabled={phase !== 'idle'}
                  >
                    <span lang="kk">{capitalize(w.kk)}</span>
                    <small>{w.ru}</small>
                    {n > 0 && <span className="word-list__count">{n}</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="card">
          <h2 className="card__title">{t('train.newWord')}</h2>
          <form className="new-word" onSubmit={submitNewWord}>
            <input value={newKk} onChange={(e) => setNewKk(e.target.value)} placeholder={t('train.kk')} aria-label={t('train.kk')} lang="kk" maxLength={80} required />
            <input value={newRu} onChange={(e) => setNewRu(e.target.value)} placeholder={t('train.ru')} aria-label={t('train.ru')} maxLength={80} />
            <button className="btn" type="submit">
              <Icon name="plus" /> {t('train.add')}
            </button>
          </form>
        </section>

        <section className="card">
          <h2 className="card__title">{t('train.data')}</h2>
          <p className="muted">{t('train.stats', { w: trainedWords, n: totalSamples })}</p>
          <div className="data-actions">
            <button className="btn btn--sm" onClick={download} disabled={!totalSamples && !userWords.length}>
              <Icon name="download" size={15} /> {t('train.export')}
            </button>
            <button className="btn btn--sm" onClick={() => fileInput.current?.click()}>
              <Icon name="upload" size={15} /> {t('train.import')}
            </button>
            <input ref={fileInput} type="file" accept="application/json,.json" hidden onChange={(e) => void upload(e)} />
            <button
              className="btn btn--sm btn--ghost btn--danger"
              disabled={!totalSamples && !userWords.length}
              onClick={() => {
                if (window.confirm(t('train.confirmReset'))) resetAll();
              }}
            >
              <Icon name="trash" size={15} /> {t('train.reset')}
            </button>
          </div>
        </section>
      </aside>
    </div>
  );
}
