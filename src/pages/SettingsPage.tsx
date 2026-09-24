import { useEffect, useState, type ReactNode } from 'react';
import { Icon } from '../components/Icon';
import { useVideoDevices } from '../hooks/useCamera';
import { useT } from '../i18n';
import { speakText } from '../lib/phrase';
import { browserSpeechSupported, isKazakhVoice, loadVoices } from '../lib/speech';
import { VOICES, type VoiceId } from '../speech/voices';
import { useSettings, type Settings } from '../store/settings';
import { useServerStatus } from '../store/status';
import { useUi } from '../store/ui';
import { useVoice } from '../store/voice';

const formatBytes = (n: number): string =>
  n >= 1024 ** 3 ? `${(n / 1024 ** 3).toFixed(1)} ГБ` : `${Math.max(1, Math.round(n / 1024 ** 2))} МБ`;

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
  const install = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    await installPrompt.userChoice.catch(() => undefined);
    useUi.setState({ installPrompt: null });
  };

  return (
    <section className="card settings__section">
      <h2 className="card__title">{t('settings.offline')}</h2>
      <p className="hint hint--flush">{t('settings.offline.intro')}</p>

      <div className="offline-row">
        <span className={`dot${appCached ? ' dot--ok' : ''}`} aria-hidden="true" />
        <div>
          <strong>{t('settings.offline.app')}</strong>
          <span className="field__hint">{appCached ? t('settings.offline.appReady') : t('settings.offline.appPending')}</span>
        </div>
      </div>

      <div className="offline-voices">
        <span className="field__label">{t('settings.offline.voice')}</span>
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
                  <span className="badge badge--trained">
                    <Icon name="check" size={12} /> {t('voice.ready')}
                  </span>
                  <button className="btn btn--ghost btn--sm" onClick={() => void remove(id)}>
                    {t('voice.remove')}
                  </button>
                </span>
              ) : st === 'downloading' ? (
                <div className="progress">
                  <span style={{ width: `${Math.round(progress * 100)}%` }} />
                  <small>{t('voice.downloading', { p: Math.round(progress * 100) })}</small>
                </div>
              ) : (
                <button className="btn btn--sm" disabled={!online} onClick={() => void download(id).then((ok) => ok && update({ voiceId: id }))}>
                  <Icon name="download" size={15} />{' '}
                  {st === 'error' ? t('voice.retry') : engineCached ? t('voice.downloadMore') : t('voice.download')}
                </button>
              )}
            </div>
          );
        })}
        <span className="field__hint">{t('voice.size')}</span>
        <span className="field__hint">
          Piper · ISSAI KazakhTTS ·{' '}
          <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">
            CC BY 4.0
          </a>
        </span>
        {error && <p className="notice notice--warn">{t('voice.failed', { e: error })}</p>}
      </div>

      {storage && (
        <div className="offline-row">
          <span className={`dot${storage.persisted ? ' dot--ok' : ''}`} aria-hidden="true" />
          <div>
            <strong>{t('settings.offline.storage', { used: formatBytes(storage.used), quota: formatBytes(storage.quota) })}</strong>
            {storage.persisted ? (
              <span className="field__hint">{t('settings.offline.persisted')}</span>
            ) : (
              <button className="btn btn--ghost btn--sm" onClick={() => void navigator.storage.persist?.().then(readStorage)}>
                {t('settings.offline.persist')}
              </button>
            )}
          </div>
        </div>
      )}

      <div className="offline-install">
        {installPrompt && (
          <button className="btn btn--primary" onClick={() => void install()}>
            <Icon name="download" /> {t('settings.install')}
          </button>
        )}
        <span className="field__hint">{t('settings.install.hint')}</span>
        <span className="field__hint">{t('settings.install.ios')}</span>
      </div>
    </section>
  );
}

function Field({ label, hint, children }: { label: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <div className="field">
      <div className="field__text">
        <span className="field__label">{label}</span>
        {hint && <span className="field__hint">{hint}</span>}
      </div>
      <div className="field__control">{children}</div>
    </div>
  );
}

function Toggle({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <label className={`toggle${disabled ? ' is-disabled' : ''}`}>
      <input type="checkbox" role="switch" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      <span className="toggle__track" aria-hidden="true" />
      <span className="toggle__label">{label}</span>
    </label>
  );
}

function Segmented<V extends string>({ value, options, onChange, label }: { value: V; options: Array<{ value: V; label: string }>; onChange: (v: V) => void; label: string }) {
  return (
    <div className="segmented" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} role="radio" aria-checked={value === o.value} className={value === o.value ? 'is-active' : ''} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function SettingsPage() {
  const t = useT();
  const s = useSettings();
  const update = (patch: Partial<Settings>) => s.update(patch);
  const server = useServerStatus((st) => st.server);
  const checked = useServerStatus((st) => st.checked);
  const devices = useVideoDevices();
  const voiceStatus = useVoice((st) => st.status[s.voiceId]);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    void loadVoices().then(setVoices);
  }, []);

  const kazakhVoices = voices.filter(isKazakhVoice);
  const otherVoices = voices.filter((v) => !isKazakhVoice(v) && /^(ru|tr|en)/i.test(v.lang));

  return (
    <div className="page settings">
      <section className="card settings__section">
        <h2 className="card__title">{t('settings.general')}</h2>
        <Field label={t('settings.language')}>
          <Segmented
            label={t('settings.language')}
            value={s.lang}
            onChange={(lang) => update({ lang })}
            options={[
              { value: 'kk', label: 'Қазақша' },
              { value: 'ru', label: 'Русский' },
            ]}
          />
        </Field>
        <Field label={t('settings.theme')}>
          <Segmented
            label={t('settings.theme')}
            value={s.theme}
            onChange={(theme) => update({ theme })}
            options={[
              { value: 'system', label: t('settings.theme.system') },
              { value: 'light', label: t('settings.theme.light') },
              { value: 'dark', label: t('settings.theme.dark') },
            ]}
          />
        </Field>
      </section>

      <section className="card settings__section">
        <h2 className="card__title">{t('settings.recognition')}</h2>
        <Field label={t('settings.dominant')}>
          <Segmented
            label={t('settings.dominant')}
            value={s.dominant}
            onChange={(dominant) => update({ dominant })}
            options={[
              { value: 'right', label: t('settings.right') },
              { value: 'left', label: t('settings.left') },
            ]}
          />
        </Field>
        <Field label={t('settings.hold')} hint={`${s.holdMs} ${t('unit.ms')}`}>
          <input type="range" min={300} max={1200} step={50} value={s.holdMs} onChange={(e) => update({ holdMs: Number(e.target.value) })} aria-label={t('settings.hold')} />
        </Field>
        <Field label={t('settings.mode')}>
          <select value={s.mode} onChange={(e) => update({ mode: e.target.value as Settings['mode'] })} aria-label={t('settings.mode')}>
            <option value="both">{t('settings.mode.both')}</option>
            <option value="templates">{t('settings.mode.templates')}</option>
            <option value="custom">{t('settings.mode.custom')}</option>
          </select>
        </Field>
        <Field label={t('settings.camera')}>
          <select value={s.cameraId} onChange={(e) => update({ cameraId: e.target.value })} aria-label={t('settings.camera')}>
            <option value="">{t('settings.camera.default')}</option>
            {devices.map((d, i) => (
              <option key={d.deviceId} value={d.deviceId}>
                {d.label || `${t('settings.camera')} ${i + 1}`}
              </option>
            ))}
          </select>
        </Field>
      </section>

      <section className="card settings__section">
        <h2 className="card__title">{t('settings.speech')}</h2>
        <Toggle checked={s.autoSpeak} onChange={(autoSpeak) => update({ autoSpeak })} label={t('settings.autoSpeak')} />
        {s.autoSpeak && (
          <Field label={t('settings.pause')} hint={`${(s.pauseMs / 1000).toFixed(1)} ${t('unit.s')}`}>
            <input type="range" min={1000} max={6000} step={250} value={s.pauseMs} onChange={(e) => update({ pauseMs: Number(e.target.value) })} aria-label={t('settings.pause')} />
          </Field>
        )}
        <Toggle checked={s.speakWords} onChange={(speakWords) => update({ speakWords })} label={t('settings.speakWords')} />
        <Toggle checked={s.useAi && Boolean(server?.compose)} disabled={!server?.compose} onChange={(useAi) => update({ useAi })} label={t('settings.useAi')} />
        {checked && !server?.compose && <p className="hint">{t('settings.aiOff')}</p>}

        <Field
          label={t('settings.engine')}
          hint={server?.tts ? t('settings.serverVoice', { v: server.ttsVoice ?? '' }) : t('settings.serverVoiceOff')}
        >
          <Segmented
            label={t('settings.engine')}
            value={s.engine}
            onChange={(engine) => update({ engine })}
            options={[
              { value: 'auto', label: t('settings.engine.auto') },
              { value: 'offline', label: t('settings.engine.offline') },
              { value: 'browser', label: t('settings.engine.browser') },
              ...(server?.tts ? [{ value: 'server' as const, label: t('settings.engine.server') }] : []),
            ]}
          />
        </Field>
        {browserSpeechSupported && (
          <Field label={t('settings.voice')}>
            <select value={s.voiceURI} onChange={(e) => update({ voiceURI: e.target.value })} aria-label={t('settings.voice')}>
              <option value="">{t('settings.voice.auto')}</option>
              {[...kazakhVoices, ...otherVoices].map((v) => (
                <option key={v.voiceURI} value={v.voiceURI}>
                  {v.name} ({v.lang})
                </option>
              ))}
            </select>
          </Field>
        )}
        {voices.length > 0 && kazakhVoices.length === 0 && !server?.tts && voiceStatus !== 'ready' && (
          <p className="notice notice--warn">{t('settings.noKazakhVoice')}</p>
        )}
        <Field label={t('settings.rate')} hint={`${s.rate.toFixed(2)}×`}>
          <input type="range" min={0.6} max={1.6} step={0.05} value={s.rate} onChange={(e) => update({ rate: Number(e.target.value) })} aria-label={t('settings.rate')} />
        </Field>
        <div>
          <button className="btn" onClick={() => void speakText(t('settings.testPhrase'))}>
            <Icon name="speaker" /> {t('settings.test')}
          </button>
        </div>
      </section>

      <OfflineSection />

      <section className="card settings__section">
        <h2 className="card__title">{t('settings.smart')}</h2>
        <Toggle checked={s.autoLearn} onChange={(autoLearn) => update({ autoLearn })} label={t('settings.autoLearn')} />
        <p className="hint">{t('settings.autoLearn.hint')}</p>
        <Toggle checked={s.suggestions} onChange={(suggestions) => update({ suggestions })} label={t('settings.suggestions')} />
      </section>

      <section className="card settings__section">
        <h2 className="card__title">{t('settings.display')}</h2>
        <Toggle checked={s.showSkeleton} onChange={(showSkeleton) => update({ showSkeleton })} label={t('settings.skeleton')} />
        <Toggle checked={s.showDebug} onChange={(showDebug) => update({ showDebug })} label={t('settings.debug')} />
        <Toggle checked={s.mirror} onChange={(mirror) => update({ mirror })} label={t('settings.mirror')} />
      </section>

      <section className="card settings__section">
        <h2 className="card__title">{t('settings.server')}</h2>
        <p className={`server-state${server ? ' server-state--ok' : ''}`}>
          <span className="dot" aria-hidden="true" />
          {server ? t('settings.server.online') : t('settings.server.offline')}
          {server?.model && <code>{server.model}</code>}
        </p>
        <div>
          <button className="btn btn--ghost" onClick={s.reset}>
            <Icon name="replay" /> {t('settings.reset')}
          </button>
        </div>
      </section>
    </div>
  );
}
