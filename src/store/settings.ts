import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Lang } from '../data/gestureText';
import type { RecognitionMode } from '../gesture/recognizer';
import type { HandSide } from '../gesture/types';
import type { VoiceId } from '../speech/voices';

export type Theme = 'system' | 'light' | 'dark';
/** auto: Azure if configured → offline Kazakh voice → browser voice. */
export type SpeechEngine = 'auto' | 'offline' | 'server' | 'browser';

export interface Settings {
  lang: Lang;
  theme: Theme;
  dominant: HandSide;
  holdMs: number;
  mode: RecognitionMode;
  /** Speak the sentence automatically once the hands have been down for `pauseMs`. */
  autoSpeak: boolean;
  pauseMs: number;
  speakWords: boolean;
  useAi: boolean;
  engine: SpeechEngine;
  /** Offline (Piper) voice. */
  voiceId: VoiceId;
  /** Browser speech-synthesis voice. */
  voiceURI: string;
  /** Add confirmed gestures to the personal training data. */
  autoLearn: boolean;
  /** Show next-word suggestions. */
  suggestions: boolean;
  rate: number;
  showSkeleton: boolean;
  showDebug: boolean;
  mirror: boolean;
  cameraId: string;
  /** Training: how many takes one press of “Record” makes. */
  trainSeries: number;
  /** Training: short beeps for the countdown and the start/end of a take. */
  trainBeeps: boolean;
}

const browserLang = (): Lang => {
  try {
    const code = navigator.language?.toLowerCase().slice(0, 2);
    return code === 'ru' || code === 'en' ? code : 'kk';
  } catch {
    return 'kk';
  }
};

export const DEFAULT_SETTINGS: Settings = {
  lang: browserLang(),
  theme: 'light',
  dominant: 'right',
  holdMs: 550,
  mode: 'both',
  autoSpeak: true,
  pauseMs: 2500,
  speakWords: false,
  useAi: true,
  engine: 'browser',
  voiceId: 'kk_KZ-raya-x_low',
  voiceURI: '',
  autoLearn: true,
  suggestions: true,
  rate: 1,
  showSkeleton: true,
  showDebug: true,
  mirror: true,
  cameraId: '',
  trainSeries: 3,
  trainBeeps: true,
};

interface SettingsStore extends Settings {
  update: (patch: Partial<Settings>) => void;
  reset: () => void;
}

export const useSettings = create<SettingsStore>()(
  persist(
    (set, get) => ({
      ...DEFAULT_SETTINGS,
      update: (patch) => set(patch),
      reset: () => set({ ...DEFAULT_SETTINGS, lang: get().lang }),
    }),
    {
      name: 'qoldau.settings',
      version: 3,
      partialize: ({ update: _update, reset: _reset, ...settings }) => settings,
      migrate: (persisted, version) => {
        const state = persisted as Partial<Settings>;
        // v2: the browser voice became the default speech engine.
        if (version < 2 && state.engine === 'auto') state.engine = 'browser';
        // v3: the light theme became the default instead of following the system.
        if (version < 3 && state.theme === 'system') state.theme = 'light';
        return state as SettingsStore;
      },
    },
  ),
);
