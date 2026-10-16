import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * all — the login cookie may be kept for 30 days;
 * necessary — only a browser-session login cookie (gone when the browser closes).
 */
export type ConsentChoice = 'all' | 'necessary';

interface ConsentStore {
  choice: ConsentChoice | null;
  /** When the choice was made (ms). */
  at: number | null;
  choose: (choice: ConsentChoice) => void;
}

export const useConsent = create<ConsentStore>()(
  persist(
    (set) => ({
      choice: null,
      at: null,
      choose: (choice) => set({ choice, at: Date.now() }),
    }),
    { name: 'qoldau.consent', partialize: ({ choice, at }) => ({ choice, at }) },
  ),
);
