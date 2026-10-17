import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type TokenSource = 'gesture' | 'tap';

export interface Token {
  key: string;
  wordId: string;
  source: TokenSource;
}

export interface Phrase {
  id: string;
  text: string;
  via: 'ai' | 'local';
  at: number;
  /** Word ids the phrase was built from — feeds next-word prediction. */
  words?: string[];
}

interface SessionStore {
  /** Words of the sentence being built. */
  tokens: Token[];
  /** Last time a word was added (ms since epoch). */
  lastActivity: number;
  composing: boolean;
  output: Phrase | null;
  history: Phrase[];
  /** Adds a word; returns its token key. */
  addWord: (wordId: string, source: TokenSource) => string;
  /** Replaces the last `count` words with one; returns the new key and the replaced ones. */
  replaceLast: (wordId: string, source: TokenSource, count?: number) => { key: string; replaced: string[] };
  removeToken: (key: string) => void;
  undo: () => void;
  clear: () => void;
  setComposing: (composing: boolean) => void;
  /** Stores a finished phrase and removes the tokens it was built from. */
  publish: (text: string, via: Phrase['via'], consumedKeys: readonly string[], words?: readonly string[]) => void;
  clearHistory: () => void;
}

const HISTORY_LIMIT = 80;
let counter = 0;
const newKey = () => `${Date.now().toString(36)}-${(counter++).toString(36)}`;

export const useSession = create<SessionStore>()(
  persist(
    (set, get) => ({
      tokens: [],
      lastActivity: 0,
      composing: false,
      output: null,
      history: [],

      addWord: (wordId, source) => {
        const key = newKey();
        set({ tokens: [...get().tokens, { key, wordId, source }], lastActivity: Date.now() });
        return key;
      },

      replaceLast: (wordId, source, count = 1) => {
        const tokens = get().tokens;
        const kept = tokens.slice(0, Math.max(0, tokens.length - count));
        const replaced = tokens.slice(kept.length).map((t) => t.key);
        const key = newKey();
        set({ tokens: [...kept, { key, wordId, source }], lastActivity: Date.now() });
        return { key, replaced };
      },

      removeToken: (key) => set({ tokens: get().tokens.filter((t) => t.key !== key) }),
      undo: () => set({ tokens: get().tokens.slice(0, -1) }),
      clear: () => set({ tokens: [] }),
      setComposing: (composing) => set({ composing }),

      publish: (text, via, consumedKeys, words) => {
        const phrase: Phrase = { id: newKey(), text, via, at: Date.now(), ...(words?.length ? { words: [...words] } : {}) };
        const consumed = new Set(consumedKeys);
        set({
          output: phrase,
          history: [phrase, ...get().history].slice(0, HISTORY_LIMIT),
          tokens: get().tokens.filter((t) => !consumed.has(t.key)),
          composing: false,
        });
      },

      clearHistory: () => set({ history: [] }),
    }),
    {
      name: 'qoldau.session',
      version: 1,
      partialize: (s) => ({ history: s.history, output: s.output }),
    },
  ),
);
