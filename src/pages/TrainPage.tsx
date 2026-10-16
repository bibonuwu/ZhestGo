import { useCallback, useDeferredValue, useEffect, useLayoutEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { CameraStage } from '../components/CameraStage';
import { GestureVisual } from '../components/GestureVisual';
import { Icon } from '../components/Icon';
import { PageHead, Steps } from '../components/PageHead';
import { describeGesture } from '../data/gestureText';
import { capitalize, glossOf, lookupWord, matchesQuery, useAllWords, type AnyWord } from '../data/words';
import { drawTrail } from '../gesture/draw';
import type { CandidateSource } from '../gesture/recognizer';
import type { EngineFrame } from '../hooks/useGestureEngine';
import { useT, type MessageKey, type Translate } from '../i18n';
import { beep, type Cue } from '../lib/beep';
import { RECORD_MS, TakeCapture } from '../lib/take';
import { useSettings } from '../store/settings';
import { useTraining, type Take, type UserWord } from '../store/training';
import { useUi } from '../store/ui';

const COUNT_MS = 800;
/** Countdown before the first take of a series, and between takes. */
const FIRST_COUNT = 3;
const NEXT_COUNT = 2;
const MIN_FRAMES = 6;
/** Frames per word that make a reliable recorded gesture — about three takes. */
const GOAL_FRAMES = 60;
const TAKE_FRAMES = GOAL_FRAMES / 3;
const SERIES_OPTIONS = [1, 3, 5];
/** How long a recognition result stays on screen after the hand moves on, ms. */
const CHECK_HOLD_MS = 2500;
const FLASH_MS = 1900;

type Phase = 'idle' | 'countdown' | 'recording';
type Level = 0 | 1 | 2 | 3;
type Filter = 'all' | 'todo' | 'done';

interface Flash {
  id: number;
  ok: boolean;
  frames: number;
  coverage: number;
}

interface Check {
  wordId: string;
  source: CandidateSource;
}

const LEVEL_KEYS = ['train.level.none', 'train.level.low', 'train.level.good', 'train.level.great'] as const;
const FILTER_KEYS = { all: 'train.filter.all', todo: 'train.filter.todo', done: 'train.filter.done' } as const;

function levelOf(frames: number): Level {
  if (frames <= 0) return 0;
  if (frames < TAKE_FRAMES * 2) return 1;
  if (frames < GOAL_FRAMES) return 2;
  return 3;
}

const qualityOf = (coverage: number) => (coverage >= 0.8 ? 'great' : coverage >= 0.5 ? 'ok' : 'poor');
const QUALITY_KEYS: Record<ReturnType<typeof qualityOf>, MessageKey> = {
  great: 'train.quality.great',
  ok: 'train.quality.ok',
  poor: 'train.quality.poor',
};

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

function Meter({ frames, t }: { frames: number; t: Translate }) {
  const level = levelOf(frames);
  return (
    <div className={`meter meter--${level}`}>
      <div className="meter__head">
        <span className="label">{t('train.level')}</span>
        <strong>{t(LEVEL_KEYS[level])}</strong>
      </div>
      <div
        className="meter__bar"
        role="meter"
        aria-label={t('train.level')}
        aria-valuemin={0}
        aria-valuemax={GOAL_FRAMES}
        aria-valuenow={Math.min(frames, GOAL_FRAMES)}
      >
        {[0, 1, 2].map((i) => (
          <span key={i}>
            <i style={{ width: `${clamp01((frames - i * TAKE_FRAMES) / TAKE_FRAMES) * 100}%` }} />
          </span>
        ))}
      </div>
      <div className="meter__foot">
        <span>{t('train.frames', { n: frames })}</span>
        <span>{t('train.goal', { n: GOAL_FRAMES })}</span>
      </div>
    </div>
  );
}

function Dots({ frames }: { frames: number }) {
  const filled = Math.min(3, Math.ceil(frames / TAKE_FRAMES));
  return (
    <span className={`dots dots--${levelOf(frames)}`} aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <i key={i} className={i < filled ? 'on' : undefined} />
      ))}
    </span>
  );
}

interface TakeStripProps {
  word: AnyWord;
  takes: Take[];
  earlier: number;
  phase: Phase;
  countdown: number;
  captured: number;
  slots: number;
  t: Translate;
  onRemove: (id: string) => void;
}

/** This visit's takes of the selected word, the take being recorded and the ones still planned. */
function TakeStrip({ word, takes, earlier, phase, countdown, captured, slots, t, onRemove }: TakeStripProps) {
  const listRef = useRef<HTMLOListElement>(null);
  useEffect(() => {
    const list = listRef.current;
    list?.scrollTo({ left: list.scrollWidth, behavior: 'smooth' });
  }, [takes.length, phase, word.id]);

  const live = phase !== 'idle';
  const firstSlot = takes.length + (live ? 2 : 1);
  return (
    <section className="card takes">
      <header className="takes__head">
        <span className="takes__icon">
          <Icon name="film" size={18} />
        </span>
        <div>
          <h2 className="card__title">
            {t('train.takes')} · <span lang="kk">{capitalize(word.kk)}</span>
          </h2>
          <p className="hint">{t('train.takesHint')}</p>
        </div>
      </header>
      <ol className="takes__list" ref={listRef}>
        {earlier > 0 && (
          <li className="take take--earlier">
            <div className="take__media">
              <Icon name="book" size={20} />
              <span>{t('train.frames', { n: earlier })}</span>
            </div>
            <div className="take__meta">{t('train.earlier')}</div>
          </li>
        )}
        {takes.map((take, i) => {
          const quality = qualityOf(take.coverage);
          return (
            <li key={take.id} className="take">
              <div className="take__media">
                {take.thumb ? <img src={take.thumb} alt={t('train.take', { n: i + 1 })} /> : <Icon name="hand" size={22} />}
                <span className="take__num">{i + 1}</span>
                <button className="take__remove" onClick={() => onRemove(take.id)} title={t('train.removeTake')} aria-label={t('train.removeTake')}>
                  <Icon name="x" size={14} />
                </button>
              </div>
              <div className="take__meta" title={t(QUALITY_KEYS[quality])}>
                <span className={`take__q take__q--${quality}`} />
                {t('train.frames', { n: take.vectors.length })}
              </div>
            </li>
          );
        })}
        {live && (
          <li className={`take take--live take--${phase}`}>
            <div className="take__media">
              {phase === 'countdown' ? (
                <strong className="take__big">{countdown || 1}</strong>
              ) : (
                <>
                  <span className="take__rec">REC</span>
                  <strong className="take__big">{captured}</strong>
                </>
              )}
            </div>
            <div className="take__meta">{t('train.take', { n: takes.length + 1 })}</div>
          </li>
        )}
        {Array.from({ length: slots }, (_, i) => (
          <li key={`slot-${i}`} className="take take--slot" aria-hidden="true">
            <div className="take__media">{firstSlot + i}</div>
            <div className="take__meta">{t('train.take', { n: firstSlot + i })}</div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function CheckRow({
  phase,
  ready,
  check,
  selectedId,
  userWords,
  t,
}: {
  phase: Phase;
  ready: boolean;
  check: Check | null;
  selectedId: string;
  userWords: readonly UserWord[];
  t: Translate;
}) {
  let body;
  let tone = '';
  if (phase !== 'idle') {
    tone = ' check--rec';
    body = (
      <>
        <span className="check__pulse" />
        {t('train.recording')}
      </>
    );
  } else if (!ready) {
    tone = ' check--off';
    body = (
      <>
        <Icon name="video" size={16} />
        {t('train.check.noCamera')}
      </>
    );
  } else if (!check) {
    body = (
      <>
        <span className="check__pulse" />
        {t('train.check.idle')}
      </>
    );
  } else if (check.wordId === selectedId) {
    tone = ' check--ok';
    body = (
      <>
        <Icon name="check" size={16} />
        <strong>{t('train.check.ok')}</strong>
        <span>{t(check.source === 'custom' ? 'train.check.viaCustom' : 'train.check.viaTemplate')}</span>
      </>
    );
  } else {
    const other = lookupWord(check.wordId, userWords);
    tone = ' check--other';
    body = (
      <>
        <Icon name="replay" size={16} />
        {t('train.check.other', { w: other ? capitalize(other.kk) : check.wordId })}
      </>
    );
  }
  return (
    <div className={`check${tone}`} role="status">
      <span className="label check__label">{t('train.check')}</span>
      <div className="check__body">{body}</div>
    </div>
  );
}

export function TrainPage({ initialWord }: { initialWord?: string }) {
  const t = useT();
  const lang = useSettings((s) => s.lang);
  const mode = useSettings((s) => s.mode);
  const mirror = useSettings((s) => s.mirror);
  const series = useSettings((s) => s.trainSeries);
  const beeps = useSettings((s) => s.trainBeeps);
  const updateSettings = useSettings((s) => s.update);
  const cameraOn = useUi((s) => s.cameraOn);
  const words = useAllWords();
  const { samples, userWords, takes, addTake, removeTake, clearWord, addUserWord, deleteUserWord, exportData, importData, resetAll } = useTraining();

  const [selectedId, setSelectedId] = useState(() => (initialWord && lookupWord(initialWord) ? initialWord : words[0].id));
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const [filter, setFilter] = useState<Filter>('all');
  const [phase, setPhase] = useState<Phase>('idle');
  const [countdown, setCountdown] = useState(FIRST_COUNT);
  const [run, setRun] = useState({ take: 0, total: 1 });
  const [captured, setCaptured] = useState(0);
  const [flash, setFlash] = useState<Flash | null>(null);
  const [check, setCheck] = useState<Check | null>(null);
  const [verifiedId, setVerifiedId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [newKk, setNewKk] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const trailRef = useRef<HTMLCanvasElement>(null);
  const cameraRef = useRef<HTMLDivElement>(null);

  const capture = useRef<TakeCapture | null>(null);
  const readyRef = useRef(false);
  const checkRef = useRef<{ check: Check | null; at: number }>({ check: null, at: 0 });
  const latest = useRef({ phase, selectedId, run, series, mirror, beeps });
  useLayoutEffect(() => {
    latest.current = { phase, selectedId, run, series, mirror, beeps };
  });

  const cue = (c: Cue) => {
    if (latest.current.beeps) beep(c);
  };

  const selected = lookupWord(selectedId, userWords) ?? words[0];
  const frames = samples[selected.id]?.length ?? 0;
  const level = levelOf(frames);
  const wordTakes = takes.filter((tk) => tk.wordId === selected.id);
  const earlier = Math.max(0, frames - wordTakes.reduce((n, tk) => n + tk.vectors.length, 0));

  const q = deferredQuery.trim().toLocaleLowerCase();
  const found = words.filter((w) => !q || matchesQuery(w, q));
  const counts = { all: found.length, todo: 0, done: 0 };
  for (const w of found) counts[samples[w.id]?.length ? 'done' : 'todo']++;
  const listed = filter === 'all' ? found : found.filter((w) => Boolean(samples[w.id]?.length) === (filter === 'done'));
  const trainedWords = words.filter((w) => samples[w.id]?.length).length;
  const totalSamples = Object.values(samples).reduce((n, list) => n + list.length, 0);

  const at = listed.findIndex((w) => w.id === selected.id);
  const rest = at === -1 ? listed : [...listed.slice(at + 1), ...listed.slice(0, at)];
  const nextWord = rest.find((w) => (samples[w.id]?.length ?? 0) < GOAL_FRAMES) ?? rest[0] ?? null;

  const selectWord = (id: string) => {
    setSelectedId(id);
    setFlash(null);
    setCheck(null);
    checkRef.current = { check: null, at: 0 };
  };

  const clearTrail = () => {
    const canvas = trailRef.current;
    canvas?.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
  };

  const startSeries = () => {
    if (latest.current.phase !== 'idle' || !readyRef.current) return;
    // On narrow screens the record button sits below the camera: bring the camera into view for the countdown.
    const box = cameraRef.current?.getBoundingClientRect();
    if (box && (box.top < 0 || box.bottom > window.innerHeight)) cameraRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    selectWord(latest.current.selectedId);
    setRun({ take: 0, total: latest.current.series });
    setCountdown(FIRST_COUNT);
    setPhase('countdown');
  };

  const cancelSeries = () => {
    capture.current = null;
    setPhase('idle');
  };

  const finishTake = () => {
    const cap = capture.current;
    capture.current = null;
    if (!cap) return;
    const { selectedId: wordId, run: current, mirror: mirrored } = latest.current;
    const ok = cap.vectors.length >= MIN_FRAMES;
    setFlash({ id: performance.now(), ok, frames: cap.vectors.length, coverage: cap.coverage });
    if (!ok) {
      cue('fail');
      setPhase('idle');
      return;
    }
    addTake(wordId, cap.vectors, { thumb: cap.thumbnail(mirrored), coverage: cap.coverage });
    if (current.take + 1 < current.total) {
      // The countdown tick right after is the cue for the next take.
      setRun({ ...current, take: current.take + 1 });
      setCountdown(NEXT_COUNT);
      setPhase('countdown');
    } else {
      cue('done');
      setPhase('idle');
    }
  };

  useEffect(() => {
    if (initialWord && lookupWord(initialWord)) setSelectedId(initialWord);
  }, [initialWord]);

  useEffect(() => {
    if (cameraOn) return;
    readyRef.current = false;
    capture.current = null;
    setReady(false);
    setPhase('idle');
  }, [cameraOn]);

  useEffect(() => {
    if (phase === 'countdown') {
      if (countdown === 0) {
        capture.current = new TakeCapture(performance.now());
        clearTrail();
        setCaptured(0);
        setPhase('recording');
        cue('start');
        return;
      }
      cue('tick');
      const id = setTimeout(() => setCountdown((n) => n - 1), COUNT_MS);
      return () => clearTimeout(id);
    }
    if (phase === 'recording') {
      const id = setTimeout(finishTake, RECORD_MS);
      return () => clearTimeout(id);
    }
    // The timers read everything else through refs.
  }, [phase, countdown]);

  useEffect(() => {
    if (!flash) return;
    const id = setTimeout(() => setFlash(null), FLASH_MS);
    return () => clearTimeout(id);
  }, [flash]);

  // Keep the selected word visible in the list (without scrolling the page).
  useEffect(() => {
    const list = listRef.current;
    const item = list?.querySelector<HTMLElement>('.is-active');
    if (!list || !item) return;
    const box = list.getBoundingClientRect();
    const r = item.getBoundingClientRect();
    if (r.top < box.top) list.scrollTop -= box.top - r.top;
    else if (r.bottom > box.bottom) list.scrollTop += r.bottom - box.bottom;
    if (list.contains(document.activeElement)) item.focus({ preventScroll: true });
  }, [selectedId, filter]);

  const onFrame = useCallback((f: EngineFrame) => {
    if (!readyRef.current) {
      readyRef.current = true;
      setReady(true);
    }

    const cap = capture.current;
    if (cap) {
      const video = videoRef.current;
      if (cap.push(f, video)) setCaptured(cap.vectors.length);
      const canvas = trailRef.current;
      const ctx = canvas?.getContext('2d');
      if (canvas && ctx && video?.videoWidth) {
        if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
        }
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawTrail(ctx, cap.trail, video.videoWidth / 150, video.videoWidth / 90);
      }
      return;
    }
    if (latest.current.phase !== 'idle') return;

    // Check mode: what does the recogniser read the hands as right now?
    const hit = f.commit ?? (f.candidate?.blocked ? f.candidate : null);
    const state = checkRef.current;
    if (hit) {
      if (state.check?.wordId !== hit.wordId || state.check.source !== hit.source) {
        state.check = { wordId: hit.wordId, source: hit.source };
        setCheck(state.check);
        if (hit.wordId === latest.current.selectedId) {
          setVerifiedId(hit.wordId);
          if (latest.current.beeps) beep('match');
        }
      }
      state.at = f.t;
    } else if (state.check && f.t - state.at > CHECK_HOLD_MS) {
      state.check = null;
      setCheck(null);
    }
  }, []);

  const keys = useRef({ start: startSeries, cancel: cancelSeries, step: (_dir: number) => {}, next: () => {} });
  useLayoutEffect(() => {
    keys.current = {
      start: startSeries,
      cancel: cancelSeries,
      step: (dir) => {
        const target = at === -1 ? listed[0] : listed[Math.min(listed.length - 1, Math.max(0, at + dir))];
        if (target) selectWord(target.id);
      },
      next: () => {
        if (nextWord) selectWord(nextWord.id);
      },
    };
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || e.defaultPrevented) return;
      const target = e.target instanceof HTMLElement ? e.target : null;
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return;
      const inList = Boolean(target?.closest('.word-list'));
      const idle = latest.current.phase === 'idle';
      const k = keys.current;
      switch (e.code) {
        case 'Space':
          // Other buttons keep their own Space behaviour.
          if (e.repeat || (target?.closest('button') && !inList)) return;
          e.preventDefault();
          if (idle) k.start();
          else k.cancel();
          break;
        case 'KeyR':
          if (!e.repeat && idle) k.start();
          break;
        case 'Escape':
          if (!idle) {
            e.preventDefault();
            k.cancel();
          }
          break;
        case 'ArrowDown':
        case 'ArrowUp':
          if (!idle || (target && target !== document.body && !inList)) return;
          e.preventDefault();
          k.step(e.code === 'ArrowDown' ? 1 : -1);
          break;
        case 'KeyN':
          if (!e.repeat && idle) k.next();
          break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const submitNewWord = (e: FormEvent) => {
    e.preventDefault();
    if (!newKk.trim()) return;
    const id = addUserWord(newKk);
    selectWord(id);
    setNewKk('');
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

  const idle = phase === 'idle';
  const slots = idle ? (frames < GOAL_FRAMES ? Math.max(0, 3 - wordTakes.length) : 0) : run.total - run.take - 1;
  const flashText = flash
    ? flash.ok
      ? `${t('train.takeSaved')} · ${t('train.frames', { n: flash.frames })}`
      : t('train.noHands')
    : '';

  const overlay = (
    <>
      <canvas ref={trailRef} className={`viewport__canvas rec-trail${phase === 'recording' ? ' is-live' : ''}`} />
      {!idle && <div className={`rec-frame rec-frame--${phase}`} aria-hidden="true" />}
      {phase === 'countdown' && (
        <div className="rec-count" aria-hidden="true">
          <div className="rec-count__dial" key={`${run.take}-${countdown}`}>
            <svg viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="54" className="rec-count__track" />
              <circle cx="60" cy="60" r="54" className="rec-count__bar" style={{ animationDuration: `${COUNT_MS}ms` }} />
            </svg>
            <span className="rec-count__n">{countdown || 1}</span>
          </div>
          <p className="rec-count__word" lang="kk">
            {capitalize(selected.kk)}
          </p>
          <p className="rec-count__label">
            {t('train.getReady')}
            {run.total > 1 && ` · ${t('train.takeOf', { i: run.take + 1, n: run.total })}`}
          </p>
        </div>
      )}
      {phase === 'recording' && (
        <>
          <div className="rec-hud" aria-hidden="true">
            <span className="rec-hud__rec">REC</span>
            <strong className="rec-hud__word" lang="kk">
              {capitalize(selected.kk)}
            </strong>
            {run.total > 1 && (
              <>
                <span className="rec-hud__sep" />
                <span>{t('train.takeOf', { i: run.take + 1, n: run.total })}</span>
              </>
            )}
            <span className="rec-hud__sep" />
            <span className="rec-hud__frames">{t('train.frames', { n: captured })}</span>
          </div>
          <div className="rec-progress" aria-hidden="true">
            <span style={{ animationDuration: `${RECORD_MS}ms` }} />
          </div>
        </>
      )}
      {flash && phase !== 'recording' && (
        <div className={`rec-flash${flash.ok ? '' : ' rec-flash--fail'}`} key={flash.id} aria-hidden="true">
          <span className="rec-flash__icon">
            <Icon name={flash.ok ? 'check' : 'x'} size={20} />
          </span>
          <div>
            <strong>{flash.ok ? t('train.takeSaved') : t('train.noHands')}</strong>
            {flash.ok && (
              <span>
                {t('train.frames', { n: flash.frames })} · {t(QUALITY_KEYS[qualityOf(flash.coverage)])}
              </span>
            )}
          </div>
        </div>
      )}
    </>
  );

  return (
    <div className="page train">
      <PageHead
        compact
        icon="graduate"
        eyebrow={t('page.train.eyebrow')}
        title={t('nav.train')}
        sub={t('page.train.sub')}
        aside={
          <Steps
            label={t('train.steps')}
            labels={[t('train.step.camera'), t('train.step.record'), t('train.step.check')]}
            done={[ready, frames >= GOAL_FRAMES, verifiedId === selected.id]}
          />
        }
      />
      <div className="train__grid">
        <div className="train__stage">
          <div className="train__camera" ref={cameraRef}>
            <CameraStage onFrame={onFrame} videoRef={videoRef} overlay={overlay} hideCandidate={!idle || flash !== null} />
          </div>
          <TakeStrip
            word={selected}
            takes={wordTakes}
            earlier={earlier}
            phase={phase}
            countdown={countdown}
            captured={captured}
            slots={slots}
            t={t}
            onRemove={(id) => {
              removeTake(id);
              useUi.getState().showToast(t('train.takeRemoved'));
            }}
          />
          <div className="train__notes">
            <p className="notice">{t('train.intro')}</p>
            {mode === 'templates' && <p className="notice notice--warn">{t('train.modeWarning')}</p>}
          </div>
        </div>

        <aside className="train__side">
          <section className={`card train-word${idle ? '' : ' is-recording'}`}>
            <header className="train-word__head">
              <div>
                <h2 lang="kk">{capitalize(selected.kk)}</h2>
                <p className="muted">{glossOf(selected, lang)}</p>
              </div>
              {frames > 0 && idle && (
                <button className="icon-btn" onClick={() => clearWord(selected.id)} title={t('train.clearWord')} aria-label={t('train.clearWord')}>
                  <Icon name="trash" size={16} />
                </button>
              )}
            </header>

            <Meter frames={frames} t={t} />

            {selected.gesture ? (
              <div className="train-word__template">
                <span className="label">{t('train.template')}</span>
                <GestureVisual spec={selected.gesture} lang={lang} />
                <p className="word-card__desc">{describeGesture(selected.gesture, lang)}</p>
              </div>
            ) : (
              <p className="muted train-word__none">{t('train.noTemplate')}</p>
            )}

            <div className="train-controls">
              <div className="train-controls__row">
                <span className="label">{t('train.series')}</span>
                <div className="segmented segmented--sm" role="group" aria-label={t('train.series')}>
                  {SERIES_OPTIONS.map((n) => (
                    <button
                      key={n}
                      className={n === series ? 'is-active' : undefined}
                      aria-pressed={n === series}
                      disabled={!idle}
                      onClick={() => updateSettings({ trainSeries: n })}
                    >
                      ×{n}
                    </button>
                  ))}
                </div>
                <button
                  className={`icon-btn${beeps ? ' is-on' : ''}`}
                  aria-pressed={beeps}
                  onClick={() => updateSettings({ trainBeeps: !beeps })}
                  title={t('train.beeps')}
                  aria-label={t('train.beeps')}
                >
                  <Icon name={beeps ? 'speaker' : 'speakerOff'} size={17} />
                </button>
              </div>

              {!cameraOn ? (
                <button className="btn btn--primary btn--lg" onClick={() => useUi.getState().setCameraOn(true)}>
                  <Icon name="video" /> {t('camera.start')}
                </button>
              ) : (
                <button
                  className={`btn btn--lg ${idle ? 'btn--record' : 'btn--stop'}`}
                  onClick={idle ? startSeries : cancelSeries}
                  disabled={idle && !ready}
                >
                  {idle ? (
                    <>
                      <Icon name="record" /> {t('train.record')}
                      {series > 1 && <span className="btn__meta">×{series}</span>}
                    </>
                  ) : (
                    <>
                      <Icon name="stop" /> {t('train.cancel')}
                    </>
                  )}
                </button>
              )}
            </div>

            <CheckRow phase={phase} ready={ready} check={check} selectedId={selected.id} userWords={userWords} t={t} />
            <p className="sr-only" role="status">
              {flashText}
            </p>

            {level === 3 && idle && nextWord && nextWord.id !== selected.id && (
              <button className="btn btn--primary next-word" onClick={() => selectWord(nextWord.id)}>
                {t('train.next')}: <span lang="kk">{capitalize(nextWord.kk)}</span>
                <Icon name="arrowRight" size={16} />
              </button>
            )}

            <p className="keys">
              <span>
                <kbd>{t('train.key.space')}</kbd>
                <kbd>R</kbd> {t('train.key.record')}
              </span>
              <span>
                <kbd>Esc</kbd> {t('train.key.stop')}
              </span>
              <span>
                <kbd>↑</kbd>
                <kbd>↓</kbd> {t('train.key.word')}
              </span>
              <span>
                <kbd>N</kbd> {t('train.key.next')}
              </span>
            </p>
            <p className="hint">{t('train.tip')}</p>

            {selected.category === 'custom' && idle && (
              <button
                className="btn btn--ghost btn--sm btn--danger"
                onClick={() => {
                  deleteUserWord(selected.id);
                  selectWord(words[0].id);
                }}
              >
                <Icon name="trash" size={14} /> {t('train.deleteWord')}
              </button>
            )}
          </section>

          <section className="card train-list">
            <label className="search search--compact">
              <Icon name="search" />
              <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('train.search')} aria-label={t('train.search')} />
            </label>
            <div className="segmented segmented--sm segmented--fill" role="group">
              {(Object.keys(FILTER_KEYS) as Filter[]).map((f) => (
                <button key={f} className={f === filter ? 'is-active' : undefined} aria-pressed={f === filter} onClick={() => setFilter(f)}>
                  {t(FILTER_KEYS[f])}
                  <span className="segmented__count">{counts[f]}</span>
                </button>
              ))}
            </div>
            <ul className="word-list" role="listbox" aria-label={t('train.search')} ref={listRef}>
              {listed.map((w) => {
                const n = samples[w.id]?.length ?? 0;
                return (
                  <li key={w.id}>
                    <button
                      role="option"
                      aria-selected={w.id === selected.id}
                      className={`word-list__item${w.id === selected.id ? ' is-active' : ''}`}
                      onClick={() => selectWord(w.id)}
                      disabled={!idle}
                      title={t('train.frames', { n })}
                    >
                      <span lang="kk">{capitalize(w.kk)}</span>
                      <small>{glossOf(w, lang)}</small>
                      <Dots frames={n} />
                    </button>
                  </li>
                );
              })}
              {listed.length === 0 && <li className="empty word-list__empty">{t('dict.nothing')}</li>}
            </ul>
          </section>

          <section className="card train-new">
            <h2 className="card__title">{t('train.newWord')}</h2>
            <form className="new-word" onSubmit={submitNewWord}>
              <input value={newKk} onChange={(e) => setNewKk(e.target.value)} placeholder={t('train.kk')} aria-label={t('train.kk')} lang="kk" maxLength={80} required />
              <button className="btn" type="submit">
                <Icon name="plus" /> {t('train.add')}
              </button>
            </form>
          </section>

          <section className="card train-data">
            <h2 className="card__title">{t('train.data')}</h2>
            <div className="bar" aria-hidden="true">
              <span style={{ width: `${words.length ? (trainedWords / words.length) * 100 : 0}%` }} />
            </div>
            <p className="muted">{t('train.stats', { w: trainedWords, t: words.length, n: totalSamples })}</p>
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
    </div>
  );
}
