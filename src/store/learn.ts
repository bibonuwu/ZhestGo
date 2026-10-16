import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { SIGNS } from '../data/signs';

/** Known sign ids only, without duplicates, in lesson order. */
export function orderSigns(ids: Iterable<string>): string[] {
  const set = new Set(ids);
  return SIGNS.filter((s) => set.has(s.id)).map((s) => s.id);
}

interface LearnStore {
  /** Learned sign ids. Kept on this device; mirrored to the account when signed in (see store/auth.ts). */
  learned: string[];
  toggle: (id: string) => void;
  /** Returns true when the sign was not learned before. */
  mark: (id: string) => boolean;
  /** Sends a forgotten sign back to the lessons. Returns true when it was learned. */
  unmark: (id: string) => boolean;
  replace: (ids: Iterable<string>) => void;
}

export const useLearn = create<LearnStore>()(
  persist(
    (set, get) => ({
      learned: [],
      toggle: (id) => {
        const { learned } = get();
        set({ learned: learned.includes(id) ? learned.filter((x) => x !== id) : orderSigns([...learned, id]) });
      },
      mark: (id) => {
        const { learned } = get();
        if (learned.includes(id)) return false;
        set({ learned: orderSigns([...learned, id]) });
        return true;
      },
      unmark: (id) => {
        const { learned } = get();
        if (!learned.includes(id)) return false;
        set({ learned: learned.filter((x) => x !== id) });
        return true;
      },
      replace: (ids) => set({ learned: orderSigns(ids) }),
    }),
    {
      name: 'qoldau.learned',
      partialize: ({ learned }) => ({ learned }),
      merge: (persisted, current) => ({
        ...current,
        learned: orderSigns((persisted as Partial<LearnStore> | undefined)?.learned ?? []),
      }),
    },
  ),
);
