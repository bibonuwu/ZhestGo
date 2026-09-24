import { get as idbGet, set as idbSet } from 'idb-keyval';
import { create } from 'zustand';
import { FEATURE_LENGTH, type SampleSet } from '../gesture/knn';

export interface UserWord {
  id: string;
  kk: string;
  ru: string;
}

export interface TrainingExport {
  app: 'qoldau';
  version: 1;
  samples: SampleSet;
  userWords: UserWord[];
}

/** One recording made during this visit. Kept in memory only, so it can be shown back and undone. */
export interface Take {
  id: string;
  wordId: string;
  /** The same arrays that went into `samples`, so the take can be removed again. */
  vectors: number[][];
  /** Still frame with the hand's path drawn on it (JPEG data URL). */
  thumb: string | null;
  /** Share of recorded frames where the hand was visible, 0…1. */
  coverage: number;
}

const STORAGE_KEY = 'qoldau.training.v1';
const MAX_SAMPLES_PER_WORD = 150;
const MAX_TAKES = 60;

interface TrainingStore {
  loaded: boolean;
  samples: SampleSet;
  userWords: UserWord[];
  takes: Take[];
  load: () => Promise<void>;
  addSamples: (wordId: string, vectors: number[][]) => void;
  addTake: (wordId: string, vectors: number[][], meta: Pick<Take, 'thumb' | 'coverage'>) => void;
  removeTake: (id: string) => void;
  clearWord: (wordId: string) => void;
  addUserWord: (kk: string) => string;
  deleteUserWord: (id: string) => void;
  exportData: () => TrainingExport;
  /** Merges an exported file; returns how many words received samples. */
  importData: (data: unknown) => number;
  resetAll: () => void;
}

const isVector = (v: unknown): v is number[] =>
  Array.isArray(v) && v.length === FEATURE_LENGTH && v.every((n) => typeof n === 'number' && Number.isFinite(n));

function sanitizeSamples(value: unknown): SampleSet {
  const out: SampleSet = {};
  if (!value || typeof value !== 'object') return out;
  for (const [id, vectors] of Object.entries(value as Record<string, unknown>)) {
    if (!Array.isArray(vectors)) continue;
    const valid = vectors.filter(isVector).slice(-MAX_SAMPLES_PER_WORD);
    if (valid.length) out[id] = valid;
  }
  return out;
}

function sanitizeWords(value: unknown): UserWord[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((w): w is UserWord => typeof w?.id === 'string' && typeof w?.kk === 'string' && typeof w?.ru === 'string')
    .map((w) => ({ id: w.id.slice(0, 64), kk: w.kk.trim().slice(0, 80), ru: w.ru.trim().slice(0, 80) }))
    .filter((w) => w.kk);
}

export const useTraining = create<TrainingStore>((set, get) => {
  const save = () => {
    const { samples, userWords } = get();
    idbSet(STORAGE_KEY, { samples, userWords }).catch((err) => console.warn('[qoldau] could not save training data', err));
  };

  return {
    loaded: false,
    samples: {},
    userWords: [],
    takes: [],

    load: async () => {
      try {
        const data = (await idbGet(STORAGE_KEY)) as Partial<TrainingExport> | undefined;
        set({ samples: sanitizeSamples(data?.samples), userWords: sanitizeWords(data?.userWords), loaded: true });
      } catch (err) {
        console.warn('[qoldau] training data unavailable', err);
        set({ loaded: true });
      }
    },

    addSamples: (wordId, vectors) => {
      const valid = vectors.filter(isVector);
      if (!valid.length) return;
      const existing = get().samples[wordId] ?? [];
      set({ samples: { ...get().samples, [wordId]: [...existing, ...valid].slice(-MAX_SAMPLES_PER_WORD) } });
      save();
    },

    addTake: (wordId, vectors, meta) => {
      const valid = vectors.filter(isVector);
      if (!valid.length) return;
      get().addSamples(wordId, valid);
      const id = `take_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
      set({ takes: [...get().takes, { id, wordId, vectors: valid, ...meta }].slice(-MAX_TAKES) });
    },

    removeTake: (id) => {
      const take = get().takes.find((t) => t.id === id);
      if (!take) return;
      const drop = new Set(take.vectors);
      const { [take.wordId]: current = [], ...rest } = get().samples;
      const kept = current.filter((v) => !drop.has(v));
      set({ samples: kept.length ? { ...rest, [take.wordId]: kept } : rest, takes: get().takes.filter((t) => t.id !== id) });
      save();
    },

    clearWord: (wordId) => {
      const { [wordId]: _removed, ...rest } = get().samples;
      set({ samples: rest, takes: get().takes.filter((t) => t.wordId !== wordId) });
      save();
    },

    addUserWord: (kk) => {
      const id = `user_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
      set({ userWords: [...get().userWords, { id, kk: kk.trim().toLocaleLowerCase('kk'), ru: '' }] });
      save();
      return id;
    },

    deleteUserWord: (id) => {
      const { [id]: _removed, ...rest } = get().samples;
      set({ userWords: get().userWords.filter((w) => w.id !== id), samples: rest, takes: get().takes.filter((t) => t.wordId !== id) });
      save();
    },

    exportData: () => ({ app: 'qoldau', version: 1, samples: get().samples, userWords: get().userWords }),

    importData: (data) => {
      const d = data as Partial<TrainingExport> | null;
      if (!d || d.app !== 'qoldau') throw new Error('Not a Qoldau export');
      const samples = sanitizeSamples(d.samples);
      const words = sanitizeWords(d.userWords);
      const merged = { ...get().samples };
      for (const [id, vectors] of Object.entries(samples)) {
        merged[id] = [...(merged[id] ?? []), ...vectors].slice(-MAX_SAMPLES_PER_WORD);
      }
      const known = new Set(get().userWords.map((w) => w.id));
      set({ samples: merged, userWords: [...get().userWords, ...words.filter((w) => !known.has(w.id))] });
      save();
      return Object.keys(samples).length;
    },

    resetAll: () => {
      set({ samples: {}, userWords: [], takes: [] });
      save();
    },
  };
});
