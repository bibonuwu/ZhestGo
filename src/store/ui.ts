import { create } from 'zustand';

/** The browser's install prompt (Chrome/Edge), kept until the user asks to install. */
export interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/** A dialog over the page. */
export type Dialog = 'donate';

/** What a feedback message is about: the site in general, a video lesson or a spoken phrase. */
export type FeedbackTarget = { kind: 'site' } | { kind: 'lesson'; id: string; word: string } | { kind: 'phrase'; text: string };

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
  dialog: Dialog | null;
  /** Sign id whose video lesson is open. */
  lesson: string | null;
  /** Lesson ids the open lesson steps through with “Previous” / “Next”. */
  lessonList: readonly string[];
  /** The feedback / report form is open (it can open over a lesson). */
  feedback: FeedbackTarget | null;
  /** The Terms of Use and Privacy Policy are open (over any other dialog). */
  termsOpen: boolean;
  /** Page to return to after signing in (the hash it was opened from). */
  authReturn: string;
  /** The shared chat panel is open (it stays open across pages). */
  chatOpen: boolean;
  setChatOpen: (open: boolean) => void;
  /** Opens the sign-in or sign-up page and remembers where to come back to. */
  goAuth: (mode: 'login' | 'register') => void;
  openDialog: (dialog: Dialog) => void;
  closeDialog: () => void;
  openLesson: (id: string, list?: readonly string[]) => void;
  closeLesson: () => void;
  openFeedback: (target?: FeedbackTarget) => void;
  closeFeedback: () => void;
  setTermsOpen: (open: boolean) => void;
  setCameraOn: (on: boolean) => void;
  showToast: (text: string) => void;
}

let toastTimer: ReturnType<typeof setTimeout> | undefined;

const REOPEN_CHAT = 'qoldau.chat.reopen';

/** True once after reloadWithChat(). */
function takeReopenChat(): boolean {
  try {
    const reopen = sessionStorage.getItem(REOPEN_CHAT) === '1';
    sessionStorage.removeItem(REOPEN_CHAT);
    return reopen;
  } catch {
    return false;
  }
}

/**
 * Reloads the page and opens the chat again. Browsers keep a failed module
 * download (the chat offline) until the page reloads, so this is the retry.
 */
export function reloadWithChat(): void {
  try {
    sessionStorage.setItem(REOPEN_CHAT, '1');
  } catch {
    // Without storage the chat just stays closed after the reload.
  }
  window.location.reload();
}

export const useUi = create<UiStore>((set) => ({
  cameraOn: false,
  online: typeof navigator === 'undefined' ? true : navigator.onLine,
  toast: null,
  updateReady: false,
  applyUpdate: null,
  installPrompt: null,
  offlineReady: false,
  dialog: null,
  lesson: null,
  lessonList: [],
  feedback: null,
  termsOpen: false,
  authReturn: '',
  chatOpen: typeof window === 'undefined' ? false : takeReopenChat(),
  setChatOpen: (chatOpen) => set({ chatOpen }),
  goAuth: (mode) => {
    const here = window.location.hash;
    if (!/^#\/(login|register)\b/.test(here)) set({ authReturn: here || '#/' });
    window.location.hash = `#/${mode}`;
  },
  openDialog: (dialog) => set({ dialog }),
  closeDialog: () => set({ dialog: null }),
  openLesson: (lesson, list) => set((s) => ({ lesson, lessonList: list ?? s.lessonList })),
  closeLesson: () => set({ lesson: null }),
  openFeedback: (target = { kind: 'site' }) => set({ feedback: target }),
  closeFeedback: () => set({ feedback: null }),
  setTermsOpen: (termsOpen) => set({ termsOpen }),
  setCameraOn: (cameraOn) => set({ cameraOn }),
  showToast: (text) => {
    clearTimeout(toastTimer);
    set({ toast: { id: Date.now(), text } });
    toastTimer = setTimeout(() => set({ toast: null }), 2800);
  },
}));
