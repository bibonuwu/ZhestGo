import { create } from 'zustand';

/** The browser's install prompt (Chrome/Edge), kept until the user asks to install. */
export interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface UiStore {
  /** Camera switched on during this visit; other pages start it without asking again. */
  cameraOn: boolean;
  online: boolean;
  toast: { id: number; text: string } | null;
  /** A new version of the app is downloaded and waiting. */
  updateReady: boolean;
  applyUpdate: (() => void) | null;
  installPrompt: InstallPromptEvent | null;
  /** The app shell is cached and works offline. */
  offlineReady: boolean;
  setCameraOn: (on: boolean) => void;
  showToast: (text: string) => void;
}

let toastTimer: ReturnType<typeof setTimeout> | undefined;

export const useUi = create<UiStore>((set) => ({
  cameraOn: false,
  online: typeof navigator === 'undefined' ? true : navigator.onLine,
  toast: null,
  updateReady: false,
  applyUpdate: null,
  installPrompt: null,
  offlineReady: false,
  setCameraOn: (cameraOn) => set({ cameraOn }),
  showToast: (text) => {
    clearTimeout(toastTimer);
    set({ toast: { id: Date.now(), text } });
    toastTimer = setTimeout(() => set({ toast: null }), 2800);
  },
}));
