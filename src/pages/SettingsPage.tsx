import { useCallback, useEffect, useId, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react';
import { Icon, type IconName } from '../components/Icon';
import { PageHead } from '../components/PageHead';
import { useVideoDevices } from '../hooks/useCamera';
import { LANGS } from '../data/gestureText';
import { LANG_NAMES, LOCALES, useT, type MessageKey, type Translate } from '../i18n';
import { speakText } from '../lib/phrase';
import { browserSpeechSupported, isKazakhVoice, loadVoices, type SpeechResult } from '../lib/speech';
import { VOICES, type VoiceId } from '../speech/voices';
import { DEFAULT_SETTINGS, useSettings, type Settings } from '../store/settings';
import { useServerStatus } from '../store/status';
import { useUi } from '../store/ui';
import { useVoice } from '../store/voice';

const SECTIONS = [
  { id: 'general', icon: 'globe', title: 'settings.general', desc: 'settings.general.desc' },
  { id: 'display', icon: 'video', title: 'settings.display', desc: 'settings.display.desc' },
  { id: 'recognition', icon: 'hand', title: 'settings.recognition', desc: 'settings.recognition.desc' },
  { id: 'sentence', icon: 'message', title: 'settings.sentence', desc: 'settings.sentence.desc' },
  { id: 'voice', icon: 'speaker', title: 'settings.speech', desc: 'settings.speech.desc' },
  { id: 'offline', icon: 'wifiOff', title: 'settings.offline', desc: 'settings.offline.intro' },
  { id: 'system', icon: 'server', title: 'settings.system', desc: 'settings.system.desc' },
] as const satisfies ReadonlyArray<{ id: string; icon: IconName; title: MessageKey; desc: MessageKey }>;

type SectionId = (typeof SECTIONS)[number]['id'];

const sectionEl = (id: SectionId) => document.getElementById(`settings-${id}`);

const SOURCE_LABELS: Record<Exclude<SpeechResult, 'none'>, MessageKey> = {
  server: 'settings.engine.server',
  offline: 'settings.engine.offline',
  browser: 'settings.engine.browser',
};

const formatBytes = (n: number, t: Translate): string =>
  n >= 1024 ** 3 ? `${(n / 1024 ** 3).toFixed(1)} ${t('unit.gb')}` : `${Math.max(1, Math.round(n / 1024 ** 2))} ${t('unit.mb')}`;

/** Formats a number with the interface language's decimal separator. */
function useFormatNumber() {
  const lang = useSettings((s) => s.lang);
  return useCallback(
    (v: number, minDigits: number, maxDigits = minDigits) =>
      v.toLocaleString(LOCALES[lang], { minimumFractionDigits: minDigits, maximumFractionDigits: maxDigits }),
    [lang],
  );
}

/** The section currently under the top of the viewport, and a way to scroll to one. */
function useActiveSection(): [SectionId, (id: SectionId) => void] {
  const [active, setActive] = useState<SectionId>(SECTIONS[0].id);
  // While a click scrolls the page, the clicked section stays highlighted.
  const lock = useRef(0);
  const seq = useRef(0);

  useEffect(() => {
    const onScroll = () => {
      if (lock.current) return;
      const line = window.innerHeight * 0.3;
      let current: SectionId = SECTIONS[0].id;
      for (const { id } of SECTIONS) {
        const el = sectionEl(id);
        if (el && el.getBoundingClientRect().top <= line) current = id;
      }
      // The last sections are too short to reach the line.
      const root = document.documentElement;
      if (window.scrollY > 0 && window.innerHeight + window.scrollY >= root.scrollHeight - 2) current = SECTIONS[SECTIONS.length - 1].id;
      setActive(current);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  const go = useCallback((id: SectionId) => {
    const token = ++seq.current;
    lock.current = token;
    const release = () => {
      if (lock.current === token) lock.current = 0;
    };
    window.addEventListener('scrollend', release, { once: true });
    window.setTimeout(release, 1200);
    setActive(id);
    const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    sectionEl(id)?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'start' });
  }, []);

  return [active, go];
}

// ── Building blocks ─────────────────────────────────────────────────────────

function Section({ id, children }: { id: SectionId; children: ReactNode }) {
  const t = useT();
  const { icon, title, desc } = SECTIONS.find((s) => s.id === id)!;
  return (
    <section id={`settings-${id}`} className="card settings-section" aria-labelledby={`settings-${id}-title`}>
      <header className="settings-section__head">
        <span className="settings-section__icon">
          <Icon name={icon} size={18} />
        </span>
        <div>
          <h2 id={`settings-${id}-title`}>{t(title)}</h2>
          <p>{t(desc)}</p>
        </div>
      </header>
      {children}
    </section>
  );
}

interface RowProps {
  label: ReactNode;
  hint?: ReactNode;
  /** Id of the native control, so clicking the label focuses it. */
  htmlFor?: string;
  /** Depends on the row above. */
  nested?: boolean;
  disabled?: boolean;
  danger?: boolean;
  /** Full-width content under the label and the control. */
  below?: ReactNode;
  children?: ReactNode;
}

function Row({ label, hint, htmlFor, nested, disabled, danger, below, children }: RowProps) {
  const cls = ['setting', nested && 'setting--nested', danger && 'setting--danger', disabled && 'is-disabled'].filter(Boolean).join(' ');
  return (
    <div className={cls}>
      <div className="setting__text">
        {htmlFor ? (
          <label className="setting__label" htmlFor={htmlFor}>
            {label}
          </label>
        ) : (
          <span className="setting__label">{label}</span>
        )}
        {hint && <span className="setting__hint">{hint}</span>}
      </div>
      {children && <div className="setting__control">{children}</div>}
      {below && <div className="setting__below">{below}</div>}
    </div>
  );
}

function SwitchRow({
  label,
  hint,
  checked,
  onChange,
  disabled,
}: {
  label: ReactNode;
  hint?: ReactNode;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <label className={`setting setting--switch${disabled ? ' is-disabled' : ''}`}>
      <span className="setting__text">
        <span className="setting__label" id={`${id}-label`}>
          {label}
        </span>
        {hint && (
          <span className="setting__hint" id={`${id}-hint`}>
            {hint}
          </span>
        )}
      </span>
      <span className="switch">
        <input
          type="checkbox"
          role="switch"
          checked={checked}
          disabled={disabled}
          aria-labelledby={`${id}-label`}
          aria-describedby={hint ? `${id}-hint` : undefined}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span className="switch__track" aria-hidden="true" />
      </span>
    </label>
  );
}

const ARROW_STEPS: Partial<Record<string, number>> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };

interface SegmentedOption<V extends string> {
  value: V;
  label: string;
  icon?: IconName;
  lang?: string;
}

function Segmented<V extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: V;
  options: ReadonlyArray<SegmentedOption<V>>;
  onChange: (v: V) => void;
  label: string;
}) {
  const focusable = options.some((o) => o.value === value) ? value : options[0]?.value;

  // Arrow keys move the choice, like native radio buttons.
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = ARROW_STEPS[e.key];
    if (!step) return;
    e.preventDefault();
    const index = (options.findIndex((o) => o.value === focusable) + step + options.length) % options.length;
    onChange(options[index].value);
    e.currentTarget.querySelectorAll<HTMLButtonElement>('[role="radio"]')[index]?.focus();
  };

  return (
    <div className="segmented" role="radiogroup" aria-label={label} onKeyDown={onKeyDown}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          lang={o.lang}
          aria-checked={value === o.value}
          tabIndex={o.value === focusable ? 0 : -1}
          className={value === o.value ? 'is-active' : ''}
          onClick={() => onChange(o.value)}
        >
          {o.icon && <Icon name={o.icon} size={15} />}
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Select({ id, value, onChange, children }: { id: string; value: string; onChange: (v: string) => void; children: ReactNode }) {
  return (
    <span className="select">
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)}>
        {children}
      </select>
      <Icon name="chevronDown" size={16} />
    </span>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  defaultValue,
  format,
  onChange,
  disabled,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  defaultValue: number;
  format: (v: number) => string;
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  const t = useT();
  const changed = Math.abs(value - defaultValue) > 1e-6;
  const restore = t('settings.restore', { v: format(defaultValue) });
  return (
    <div className="slider">
      <input
        type="range"
        className="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        aria-label={label}
        aria-valuetext={format(value)}
        style={{ '--p': `${((value - min) / (max - min)) * 100}%` } as CSSProperties}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <output className="slider__value">{format(value)}</output>
      <button
        type="button"
        className="icon-btn"
        disabled={disabled || !changed}
        data-hidden={changed ? undefined : ''}
        title={restore}
        aria-label={restore}
        onClick={() => onChange(defaultValue)}
      >
        <Icon name="replay" size={14} />
      </button>
    </div>
  );
}

type Tone = 'ok' | 'off' | 'bad' | 'busy';

function Status({ tone, title, children }: { tone: Tone; title?: string; children: ReactNode }) {
  return (
    <span className={`status status--${tone}`} title={title}>
      {children}
    </span>
  );
}

// ── Sections ────────────────────────────────────────────────────────────────

function GeneralSection() {
  const t = useT();
  const lang = useSettings((s) => s.lang);
  const theme = useSettings((s) => s.theme);
  const update = useSettings((s) => s.update);

  return (
    <Section id="general">
      <Row label={t('settings.language')} hint={t('settings.language.hint')}>
        <Segmented
          label={t('settings.language')}
          value={lang}
          onChange={(lang) => update({ lang })}
          options={LANGS.map((value) => ({ value, label: LANG_NAMES[value], lang: value }))}
        />
      </Row>
      <Row label={t('settings.theme')} hint={t('settings.theme.hint')}>
        <Segmented
          label={t('settings.theme')}
          value={theme}
          onChange={(theme) => update({ theme })}
          options={[
            { value: 'system', label: t('settings.theme.system'), icon: 'monitor' },
            { value: 'light', label: t('settings.theme.light'), icon: 'sun' },
            { value: 'dark', label: t('settings.theme.dark'), icon: 'moon' },
          ]}
        />
      </Row>
    </Section>
  );
}

function DisplaySection() {
  const t = useT();
  const s = useSettings();
  const devices = useVideoDevices();
  // Browsers hide camera names until the page may use the camera.
  const named = devices.length > 0 && devices.every((d) => d.label);

  return (
    <Section id="display">
      <Row label={t('settings.camera')} hint={named ? t('settings.camera.hint') : t('settings.camera.noLabels')} htmlFor="settings-camera">
        <Select id="settings-camera" value={s.cameraId} onChange={(cameraId) => s.update({ cameraId })}>
          <option value="">{t('settings.camera.default')}</option>
          {devices.map((d, i) => (
            <option key={d.deviceId} value={d.deviceId}>
              {d.label || `${t('settings.camera')} ${i + 1}`}
            </option>
          ))}
        </Select>
      </Row>
      <SwitchRow label={t('settings.mirror')} hint={t('settings.mirror.hint')} checked={s.mirror} onChange={(mirror) => s.update({ mirror })} />
      <SwitchRow
        label={t('settings.skeleton')}
        hint={t('settings.skeleton.hint')}
        checked={s.showSkeleton}
        onChange={(showSkeleton) => s.update({ showSkeleton })}
      />
      <SwitchRow label={t('settings.debug')} hint={t('settings.debug.hint')} checked={s.showDebug} onChange={(showDebug) => s.update({ showDebug })} />
    </Section>
  );
}

function RecognitionSection() {
  const t = useT();
  const s = useSettings();

  return (
    <Section id="recognition">
      <Row label={t('settings.dominant')} hint={t('settings.dominant.hint')}>
        <Segmented
          label={t('settings.dominant')}
          value={s.dominant}
          onChange={(dominant) => s.update({ dominant })}
          options={[
            { value: 'right', label: t('settings.right') },
            { value: 'left', label: t('settings.left') },
          ]}
        />
      </Row>
      <Row label={t('settings.mode')} hint={t('settings.mode.hint')} htmlFor="settings-mode">
        <Select id="settings-mode" value={s.mode} onChange={(mode) => s.update({ mode: mode as Settings['mode'] })}>
          <option value="both">{t('settings.mode.both')}</option>
          <option value="templates">{t('settings.mode.templates')}</option>
          <option value="custom">{t('settings.mode.custom')}</option>
        </Select>
      </Row>
      <Row label={t('settings.hold')} hint={t('settings.hold.hint')}>
        <Slider
          label={t('settings.hold')}
          min={300}
          max={1200}
          step={50}
          value={s.holdMs}
          defaultValue={DEFAULT_SETTINGS.holdMs}
          format={(v) => `${v} ${t('unit.ms')}`}
          onChange={(holdMs) => s.update({ holdMs })}
        />
      </Row>
      <SwitchRow
        label={t('settings.autoLearn')}
        hint={t('settings.autoLearn.hint')}
        checked={s.autoLearn}
        onChange={(autoLearn) => s.update({ autoLearn })}
      />
    </Section>
  );
}

function SentenceSection() {
  const t = useT();
  const s = useSettings();
  const num = useFormatNumber();
  const server = useServerStatus((st) => st.server);
  const checked = useServerStatus((st) => st.checked);
  const aiReady = Boolean(server?.compose);

  return (
    <Section id="sentence">
      <SwitchRow
        label={t('settings.autoSpeak')}
        hint={t('settings.autoSpeak.hint')}
        checked={s.autoSpeak}
        onChange={(autoSpeak) => s.update({ autoSpeak })}
      />
      <Row nested disabled={!s.autoSpeak} label={t('settings.pause')} hint={t('settings.pause.hint')}>
        <Slider
          label={t('settings.pause')}
          disabled={!s.autoSpeak}
          min={1000}
          max={6000}
          step={250}
          value={s.pauseMs}
          defaultValue={DEFAULT_SETTINGS.pauseMs}
          format={(v) => `${num(v / 1000, 1, 2)} ${t('unit.s')}`}
          onChange={(pauseMs) => s.update({ pauseMs })}
        />
      </Row>
      <SwitchRow
        label={t('settings.speakWords')}
        hint={t('settings.speakWords.hint')}
        checked={s.speakWords}
        onChange={(speakWords) => s.update({ speakWords })}
      />
      <SwitchRow
        label={t('settings.suggestions')}
        hint={t('settings.suggestions.hint')}
        checked={s.suggestions}
        onChange={(suggestions) => s.update({ suggestions })}
      />
      <SwitchRow
        label={
          <>
            {t('settings.useAi')}
            <span className="badge badge--ai">
              <Icon name="sparkles" size={12} /> Claude
            </span>
          </>
        }
        hint={checked && !aiReady ? t('settings.aiOff') : t('settings.useAi.hint')}
        checked={s.useAi && aiReady}
        disabled={!aiReady}
        onChange={(useAi) => s.update({ useAi })}
      />
    </Section>
  );
}

function VoiceSection({ onGetVoice }: { onGetVoice: () => void }) {
  const t = useT();
  const s = useSettings();
  const num = useFormatNumber();
  const server = useServerStatus((st) => st.server);
  const voiceStatus = useVoice((st) => st.status[s.voiceId]);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [test, setTest] = useState<{ busy: boolean; result?: SpeechResult }>({ busy: false });

  useEffect(() => {
    void loadVoices().then(setVoices);
  }, []);

  // A result only describes the voice settings it was played with.
  useEffect(() => {
    setTest((prev) => (prev.busy ? prev : { busy: false }));
  }, [s.engine, s.voiceURI, s.voiceId, s.rate]);

  const kazakhVoices = voices.filter(isKazakhVoice);
  const otherVoices = voices.filter((v) => !isKazakhVoice(v) && /^(ru|tr|en)/i.test(v.lang));
  const voiceOption = (v: SpeechSynthesisVoice) => (
    <option key={v.voiceURI} value={v.voiceURI}>
      {v.name} ({v.lang})
    </option>
  );

  const runTest = async () => {
    setTest({ busy: true });
    const result = await speakText(t('settings.testPhrase')).catch((): SpeechResult => 'none');
    setTest({ busy: false, result });
  };

  const testHint =
    test.result === undefined ? (
      <q lang="kk">{t('settings.testPhrase')}</q>
    ) : test.result === 'none' ? (
      t('settings.test.failed')
    ) : (
      t('settings.test.via', { v: t(SOURCE_LABELS[test.result]) })
    );

  return (
    <Section id="voice">
      <Row label={t('settings.engine')} hint={t('settings.engine.hint')}>
        <Segmented
          label={t('settings.engine')}
          value={s.engine}
          onChange={(engine) => s.update({ engine })}
          options={[
            { value: 'auto', label: t('settings.engine.auto') },
            { value: 'offline', label: t('settings.engine.offline') },
            { value: 'browser', label: t('settings.engine.browser') },
            ...(server?.tts ? [{ value: 'server' as const, label: t('settings.engine.server') }] : []),
          ]}
        />
      </Row>
      {browserSpeechSupported && (
        <Row label={t('settings.voice')} hint={t('settings.voice.hint')} htmlFor="settings-voice">
          <Select id="settings-voice" value={s.voiceURI} onChange={(voiceURI) => s.update({ voiceURI })}>
            <option value="">{t('settings.voice.auto')}</option>
            {kazakhVoices.length > 0 && <optgroup label={LANG_NAMES.kk}>{kazakhVoices.map(voiceOption)}</optgroup>}
            {otherVoices.length > 0 && <optgroup label={t('settings.voice.other')}>{otherVoices.map(voiceOption)}</optgroup>}
          </Select>
        </Row>
      )}
      {voices.length > 0 && kazakhVoices.length === 0 && !server?.tts && voiceStatus !== 'ready' && (
        <div className="setting setting--notice">
          <div className="notice notice--warn">
            <span>{t('settings.noKazakhVoice')}</span>
            <button type="button" className="btn btn--sm" onClick={onGetVoice}>
              <Icon name="download" size={15} /> {t('settings.goOffline')}
            </button>
          </div>
        </div>
      )}
      <Row label={t('settings.rate')}>
        <Slider
          label={t('settings.rate')}
          min={0.6}
          max={1.6}
          step={0.05}
          value={s.rate}
          defaultValue={DEFAULT_SETTINGS.rate}
          format={(v) => `${num(v, 2)}×`}
          onChange={(rate) => s.update({ rate })}
        />
      </Row>
      <Row label={t('settings.test')} hint={<span aria-live="polite">{testHint}</span>}>
        <button type="button" className="btn" disabled={test.busy} onClick={() => void runTest()}>
          {test.busy ? <span className="mini-spinner" aria-hidden="true" /> : <Icon name="play" size={15} />} {t('settings.play')}
        </button>
      </Row>
    </Section>
  );
}

function OfflineSection() {
  const t = useT();
  const lang = useSettings((s) => s.lang);
  const voiceId = useSettings((s) => s.voiceId);
  const update = useSettings((s) => s.update);
  const status = useVoice((s) => s.status);
  const progress = useVoice((s) => s.progress);
  const error = useVoice((s) => s.error);
  const download = useVoice((s) => s.download);
  const remove = useVoice((s) => s.remove);
  const online = useUi((s) => s.online);
  const offlineReady = useUi((s) => s.offlineReady);
  const installPrompt = useUi((s) => s.installPrompt);
  const [storage, setStorage] = useState<{ used: number; quota: number; persisted: boolean } | null>(null);

  const readStorage = async () => {
    if (!navigator.storage?.estimate) return;
    const [{ usage = 0, quota = 0 }, persisted] = await Promise.all([
      navigator.storage.estimate(),
      navigator.storage.persisted?.() ?? Promise.resolve(false),
    ]);
    setStorage({ used: usage, quota, persisted });
  };
  useEffect(() => {
    void readStorage();
  }, [status]);

  const appCached = offlineReady || Boolean(navigator.serviceWorker?.controller);
  const installed =
    window.matchMedia?.('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
  const install = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    await installPrompt.userChoice.catch(() => undefined);
    useUi.setState({ installPrompt: null });
  };

  return (
    <Section id="offline">
      <Row label={t('settings.offline.app')} hint={appCached ? t('settings.offline.appReady') : t('settings.offline.appPending')}>
        <Status tone={appCached ? 'ok' : 'busy'}>{appCached ? t('settings.state.ready') : t('settings.state.pending')}</Status>
      </Row>

      <Row
        label={t('settings.offline.voice')}
        hint={t('voice.size')}
        below={
          <>
            <div className="voice-list">
              {(Object.keys(VOICES) as VoiceId[]).map((id) => {
                const st = status[id];
                const engineCached = (Object.keys(VOICES) as VoiceId[]).some((other) => other !== id && status[other] === 'ready');
                return (
                  <div key={id} className={`voice-option${voiceId === id ? ' is-active' : ''}`}>
                    <label>
                      <input type="radio" name="offline-voice" checked={voiceId === id} onChange={() => update({ voiceId: id })} />
                      <span>{VOICES[id].label[lang]}</span>
                    </label>
                    {st === 'ready' ? (
                      <span className="voice-option__state">
                        <Status tone="ok" title={t('voice.ready')}>
                          {t('settings.state.ready')}
                        </Status>
                        <button type="button" className="btn btn--ghost btn--sm" onClick={() => void remove(id)}>
                          <Icon name="trash" size={14} /> {t('voice.remove')}
                        </button>
                      </span>
                    ) : st === 'downloading' ? (
                      <div className="progress">
                        <span style={{ width: `${Math.round(progress * 100)}%` }} />
                        <small>{t('voice.downloading', { p: Math.round(progress * 100) })}</small>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="btn btn--sm"
                        disabled={!online}
                        onClick={() => void download(id).then((ok) => ok && update({ voiceId: id }))}
                      >
                        <Icon name="download" size={15} />{' '}
                        {st === 'error' ? t('voice.retry') : engineCached ? t('voice.downloadMore') : t('voice.download')}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
            {error && <p className="notice notice--warn">{t('voice.failed', { e: error })}</p>}
            <span className="setting__hint">
              Piper · ISSAI KazakhTTS ·{' '}
              <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">
                CC BY 4.0
              </a>
            </span>
          </>
        }
      />

      {storage && (
        <Row
          label={t('settings.storage')}
          hint={t('settings.offline.storage', { used: formatBytes(storage.used, t), quota: formatBytes(storage.quota, t) })}
        >
          {storage.persisted ? (
            <Status tone="ok">{t('settings.offline.persisted')}</Status>
          ) : (
            <button type="button" className="btn btn--sm" onClick={() => void navigator.storage.persist?.().then(readStorage)}>
              {t('settings.offline.persist')}
            </button>
          )}
        </Row>
      )}

      <Row
        label={t('settings.install')}
        hint={
          <>
            {t('settings.install.hint')}
            {!installed && !installPrompt && (
              <>
                <br />
                {t('settings.install.ios')}
              </>
            )}
          </>
        }
      >
        {installed ? (
          <Status tone="ok">{t('settings.installed')}</Status>
        ) : (
          installPrompt && (
            <button type="button" className="btn btn--primary btn--sm" onClick={() => void install()}>
              <Icon name="download" size={15} /> {t('settings.installShort')}
            </button>
          )
        )}
      </Row>
    </Section>
  );
}

function SystemSection() {
  const t = useT();
  const server = useServerStatus((st) => st.server);
  const checked = useServerStatus((st) => st.checked);
  const online = useUi((st) => st.online);
  const [busy, setBusy] = useState(false);

  const recheck = async () => {
    setBusy(true);
    try {
      await useServerStatus.getState().refresh();
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    if (!window.confirm(t('settings.reset.confirm'))) return;
    useSettings.getState().reset();
    useUi.getState().showToast(t('settings.reset.done'));
  };

  const serverTone: Tone = server ? 'ok' : online && (busy || !checked) ? 'busy' : 'bad';
  const serverLabel =
    serverTone === 'ok' ? t('settings.state.connected') : serverTone === 'busy' ? t('settings.state.checking') : t('settings.state.unavailable');

  return (
    <Section id="system">
      <Row label={t('settings.server')} hint={serverTone === 'bad' ? t('settings.server.offline') : undefined}>
        <Status tone={serverTone}>{serverLabel}</Status>
        <button type="button" className="btn btn--ghost btn--sm" disabled={busy || !online} onClick={() => void recheck()}>
          <Icon name="replay" size={14} /> {t('settings.recheck')}
        </button>
      </Row>
      <Row label={t('status.ai')} hint={server?.compose ? server.model && <code>{server.model}</code> : t('settings.aiOff')}>
        <Status tone={server?.compose ? 'ok' : 'off'}>{server?.compose ? t('settings.state.on') : t('settings.state.off')}</Status>
      </Row>
      <Row label={t('status.voice')} hint={server?.tts ? server.ttsVoice && <code>{server.ttsVoice}</code> : t('settings.serverVoiceOff')}>
        <Status tone={server?.tts ? 'ok' : 'off'}>{server?.tts ? t('settings.state.on') : t('settings.state.off')}</Status>
      </Row>
      <Row danger label={t('settings.reset')} hint={t('settings.reset.hint')}>
        <button type="button" className="btn btn--sm btn--danger" onClick={reset}>
          <Icon name="replay" size={14} /> {t('settings.resetShort')}
        </button>
      </Row>
    </Section>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────

export function SettingsPage() {
  const t = useT();
  const [active, go] = useActiveSection();
  const navRef = useRef<HTMLElement>(null);

  // On phones the section list scrolls sideways; keep the current one in view.
  useEffect(() => {
    const nav = navRef.current;
    const button = nav?.querySelector<HTMLElement>(`[data-section="${active}"]`);
    if (!nav || !button || nav.scrollWidth <= nav.clientWidth) return;
    nav.scrollTo({ left: button.offsetLeft - (nav.clientWidth - button.offsetWidth) / 2, behavior: 'smooth' });
  }, [active]);

  return (
    <div className="page settings">
      <PageHead icon="sliders" eyebrow={t('page.settings.eyebrow')} title={t('nav.settings')} sub={t('settings.subtitle')} />

      <div className="settings__layout">
        <nav ref={navRef} className="settings__nav" aria-label={t('settings.sections')}>
          {SECTIONS.map((section) => (
            <button
              key={section.id}
              type="button"
              data-section={section.id}
              className={active === section.id ? 'is-active' : ''}
              aria-current={active === section.id ? 'true' : undefined}
              onClick={() => go(section.id)}
            >
              <Icon name={section.icon} size={17} />
              <span>{t(section.title)}</span>
            </button>
          ))}
        </nav>

        <div className="settings__content">
          <GeneralSection />
          <DisplaySection />
          <RecognitionSection />
          <SentenceSection />
          <VoiceSection onGetVoice={() => go('offline')} />
          <OfflineSection />
          <SystemSection />
        </div>
      </div>
    </div>
  );
}
