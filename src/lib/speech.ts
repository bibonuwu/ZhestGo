import { synthesizeOffline } from '../speech/piperClient';
import type { VoiceId } from '../speech/voices';
import type { SpeechEngine } from '../store/settings';
import { fetchSpeech } from './api';

export interface SpeakOptions {
  engine: SpeechEngine;
  voiceURI: string;
  rate: number;
  /** The server has a Kazakh neural voice (Azure) configured. */
  serverTts: boolean;
  offlineVoice: VoiceId;
  /** The offline voice is downloaded. */
  offlineReady: boolean;
  online: boolean;
}

export type SpeechResult = 'server' | 'offline' | 'browser' | 'none';
type Source = Exclude<SpeechResult, 'none'>;

export const browserSpeechSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

const AUDIO_CACHE_LIMIT = 60;
const audioCache = new Map<string, string>();
let audio: HTMLAudioElement | null = null;
/** Held so Chrome does not garbage-collect the utterance mid-sentence. */
let currentUtterance: SpeechSynthesisUtterance | null = null;
let finished: Promise<void> = Promise.resolve();

/** Settles when the last speech that started has ended or was stopped. */
export const speechFinished = (): Promise<void> => finished;

function untilEnded(media: HTMLAudioElement): Promise<void> {
  if (media.paused || media.ended) return Promise.resolve();
  return new Promise((resolve) => {
    const events = ['ended', 'pause', 'emptied', 'error'] as const;
    const done = () => {
      for (const e of events) media.removeEventListener(e, done);
      resolve();
    };
    for (const e of events) media.addEventListener(e, done);
  });
}

export function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  if (!browserSpeechSupported) return Promise.resolve([]);
  const voices = speechSynthesis.getVoices();
  if (voices.length) return Promise.resolve(voices);
  // Chrome and Edge populate the list asynchronously.
  return new Promise((resolve) => {
    const done = () => {
      speechSynthesis.removeEventListener('voiceschanged', done);
      resolve(speechSynthesis.getVoices());
    };
    speechSynthesis.addEventListener('voiceschanged', done);
    setTimeout(done, 1500);
  });
}

export const isKazakhVoice = (v: SpeechSynthesisVoice): boolean => v.lang.toLowerCase().startsWith('kk');

/** The chosen voice, else a Kazakh voice, else Russian (reads Cyrillic best), else the default. */
export function pickVoice(voices: readonly SpeechSynthesisVoice[], voiceURI: string): SpeechSynthesisVoice | null {
  return (
    voices.find((v) => v.voiceURI === voiceURI) ??
    voices.find(isKazakhVoice) ??
    voices.find((v) => v.lang.toLowerCase().startsWith('ru')) ??
    voices.find((v) => v.default) ??
    null
  );
}

/** A Kazakh browser voice that can actually speak right now (online voices need a network). */
export async function usableKazakhBrowserVoice(online: boolean): Promise<SpeechSynthesisVoice | null> {
  const voices = await loadVoices();
  return voices.find((v) => isKazakhVoice(v) && (online || v.localService)) ?? null;
}

export function stopSpeaking(): void {
  audio?.pause();
  if (browserSpeechSupported) speechSynthesis.cancel();
}

async function playCached(key: string, make: () => Promise<Blob>): Promise<void> {
  let url = audioCache.get(key);
  if (!url) {
    url = URL.createObjectURL(await make());
    audioCache.set(key, url);
    if (audioCache.size > AUDIO_CACHE_LIMIT) {
      const [oldKey, oldUrl] = audioCache.entries().next().value!;
      URL.revokeObjectURL(oldUrl);
      audioCache.delete(oldKey);
    }
  }
  audio ??= new Audio();
  audio.src = url;
  await audio.play();
  finished = untilEnded(audio);
}

async function speakWithBrowser(text: string, voiceURI: string, rate: number): Promise<void> {
  if (!browserSpeechSupported) throw new Error('speechSynthesis is not supported');
  const voice = pickVoice(await loadVoices(), voiceURI);
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = voice?.lang ?? 'kk-KZ';
  if (voice) utterance.voice = voice;
  utterance.rate = rate;
  finished = new Promise((resolve) => {
    utterance.onend = () => {
      if (currentUtterance === utterance) currentUtterance = null;
      resolve();
    };
    // Also when cancelled by the next speech.
    utterance.onerror = () => resolve();
  });
  currentUtterance = utterance;
  speechSynthesis.cancel();
  speechSynthesis.speak(utterance);
}

function order(opts: SpeakOptions): Source[] {
  switch (opts.engine) {
    case 'server':
      return ['server', 'offline', 'browser'];
    case 'offline':
      return ['offline', 'browser'];
    case 'browser':
      return ['browser'];
    default:
      return opts.online ? ['server', 'offline', 'browser'] : ['offline', 'browser'];
  }
}

export async function speak(text: string, opts: SpeakOptions): Promise<SpeechResult> {
  if (!text.trim()) return 'none';
  stopSpeaking();
  for (const source of order(opts)) {
    try {
      if (source === 'server') {
        if (!opts.serverTts || !opts.online) continue;
        await playCached(`server|${opts.rate}|${text}`, () => fetchSpeech(text, opts.rate));
      } else if (source === 'offline') {
        if (!opts.offlineReady) continue;
        await playCached(`${opts.offlineVoice}|${opts.rate}|${text}`, () => synthesizeOffline(text, opts.offlineVoice, opts.rate));
      } else {
        await speakWithBrowser(text, opts.voiceURI, opts.rate);
      }
      return source;
    } catch (err) {
      console.warn(`[qoldau] ${source} voice failed`, err);
    }
  }
  return 'none';
}
