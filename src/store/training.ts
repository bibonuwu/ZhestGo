import { del as idbDel, delMany as idbDelMany, get as idbGet, keys as idbKeys, set as idbSet } from 'idb-keyval';
import { create } from 'zustand';
import { FEATURE_LENGTH, type SampleSet } from '../gesture/knn';
import { HAND_SIZE } from '../gesture/signFeatures';

export interface UserWord {
  id: string;
  kk: string;
  ru: string;
}

/** A recorded take as written to an export file: what recognition needs, without pictures. */
interface ExportedTake {
  wordId: string;
  at: number;
  sign: number[][][];
}

export interface TrainingExport {
  app: 'qoldau';
  version: 1 | 2;
  samples: SampleSet;
  /** Words added by hand in earlier versions of the app. */
  userWords: UserWord[];
  /** Version 2: the signs of the recorded takes. */
  takes?: ExportedTake[];
}

/**
 * One recording of a word on the Train page. Takes stay in this browser
 * (IndexedDB) and are never sent anywhere.
 */
export interface Take {
  id: string;
  wordId: string;
  /** When it was recorded, ms. */
  at: number;
  /** Feature vectors it added to `samples`, so the take can be removed again. */
  vectors: number[][];
  /**
   * The sign as the video-sign matcher sees it (packed hands of each tick,
   * see signTemplates.ts): recognised like a video lesson. Null when the take
   * held no clear sign.
   */
  sign: number[][][] | null;
  /** Still frame with the hand's path drawn on it (JPEG data URL). */
  thumb: string | null;
  /** Share of recorded frames where the hand was visible, 0…1. */
  coverage: number;
  /** A video clip of the take is stored (see takeVideo). */
  video: boolean;
}

const STORAGE_KEY = 'qoldau.training.v1';
const TAKES_KEY = 'qoldau.takes.v1';
const VIDEO_KEY = 'qoldau.take.video.';
const MAX_SAMPLES_PER_WORD = 150;
const MAX_TAKES = 60;

interface TrainingStore {
  loaded: boolean;
  samples: SampleSet;
  userWords: UserWord[];
  takes: Take[];
  load: () => Promise<void>;
  addSamples: (wordId: string, vectors: number[][]) => void;
  /** Saves a take; returns its id. */
  addTake: (wordId: string, vectors: number[][], meta: Pick<Take, 'thumb' | 'coverage' | 'sign'>) => string;
  /** Stores the video clip of a take (it is ready a moment after the take). */
  attachVideo: (id: string, video: Blob) => Promise<void>;
  removeTake: (id: string) => void;
  clearWord: (wordId: string) => void;
  exportData: () => TrainingExport;
  /** Merges an exported file; returns how many words received samples or takes. */
  importData: (data: unknown) => number;
  resetAll: () => void;
}

const isVector = (v: unknown): v is number[] =>
  Array.isArray(v) && v.length === FEATURE_LENGTH && v.every((n) => typeof n === 'number' && Number.isFinite(n));

const isSign = (v: unknown): v is number[][][] =>
  Array.isArray(v) &&
  v.length > 0 &&
  v.every(
    (hands) =>
      Array.isArray(hands) &&
      (hands.length === 1 || hands.length === 2) &&
      hands.every((h) => Array.isArray(h) && h.length === HAND_SIZE && h.every((n) => typeof n === 'number' && Number.isFinite(n))),
  );

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

function sanitizeTakes(value: unknown): Take[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((t): t is Take => typeof t?.id === 'string' && typeof t?.wordId === 'string')
    .map((t) => ({
      id: t.id,
      wordId: t.wordId,
      at: Number(t.at) || 0,
      vectors: Array.isArray(t.vectors) ? t.vectors.filter(isVector) : [],
      sign: isSign(t.sign) ? t.sign : null,
      thumb: typeof t.thumb === 'string' && t.thumb.startsWith('data:image/') ? t.thumb : null,
      coverage: Number(t.coverage) || 0,
      video: t.video === true,
    }))
    .slice(-MAX_TAKES);
}

/** Vectors are compared by value: after a reload they are new arrays. */
const vectorKey = (v: readonly number[]) => v.join(',');

function withoutVectors(samples: SampleSet, wordId: string, vectors: readonly number[][]): SampleSet {
  const drop = new Set(vectors.map(vectorKey));
  const { [wordId]: current = [], ...rest } = samples;
  const kept = current.filter((v) => !drop.has(vectorKey(v)));
  return kept.length ? { ...rest, [wordId]: kept } : rest;
}

const newId = () => `take_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

/** The stored video clip of a take, if any. */
export async function takeVideo(id: string): Promise<Blob | null> {
  try {
    const blob = (await idbGet(VIDEO_KEY + id)) as unknown;
    return blob instanceof Blob ? blob : null;
  } catch {
    return null;
  }
}

function deleteVideos(takes: readonly Take[]): void {
  const keys = takes.filter((t) => t.video).map((t) => VIDEO_KEY + t.id);
  if (keys.length) idbDelMany(keys).catch(() => undefined);
}

export const useTraining = create<TrainingStore>((set, get) => {
  const save = () => {
    const { samples, userWords } = get();
    idbSet(STORAGE_KEY, { samples, userWords }).catch((err) => console.warn('[qoldau] could not save training data', err));
  };
  const saveTakes = () => {
    idbSet(TAKES_KEY, get().takes).catch((err) => console.warn('[qoldau] could not save the takes', err));
  };
  /** Keeps the newest MAX_TAKES takes; older ones lose their clips but keep their samples. */
  const setTakes = (takes: Take[]) => {
    deleteVideos(takes.slice(0, -MAX_TAKES));
    set({ takes: takes.slice(-MAX_TAKES) });
    saveTakes();
  };

  return {
    loaded: false,
    samples: {},
    userWords: [],
    takes: [],

    load: async () => {
      try {
        const [data, takes] = await Promise.all([
          idbGet(STORAGE_KEY) as Promise<Partial<TrainingExport> | undefined>,
          idbGet(TAKES_KEY) as Promise<unknown>,
        ]);
        set({ samples: sanitizeSamples(data?.samples), userWords: sanitizeWords(data?.userWords), takes: sanitizeTakes(takes), loaded: true });
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
      get().addSamples(wordId, valid);
      const id = newId();
      setTakes([...get().takes, { id, wordId, at: Date.now(), vectors: valid, ...meta, video: false }]);
      return id;
    },

    attachVideo: async (id, video) => {
      if (!get().takes.some((t) => t.id === id)) return;
      try {
        await idbSet(VIDEO_KEY + id, video);
      } catch (err) {
        console.warn('[qoldau] could not save the take video', err);
        return;
      }
      // The take may have been removed while the clip was being saved.
      if (!get().takes.some((t) => t.id === id)) {
        await idbDel(VIDEO_KEY + id).catch(() => undefined);
        return;
      }
      set({ takes: get().takes.map((t) => (t.id === id ? { ...t, video: true } : t)) });
      saveTakes();
    },

    removeTake: (id) => {
      const take = get().takes.find((t) => t.id === id);
      if (!take) return;
      set({ samples: withoutVectors(get().samples, take.wordId, take.vectors) });
      deleteVideos([take]);
      setTakes(get().takes.filter((t) => t.id !== id));
      save();
    },

    clearWord: (wordId) => {
      const { [wordId]: _removed, ...rest } = get().samples;
      deleteVideos(get().takes.filter((t) => t.wordId === wordId));
      set({ samples: rest });
      setTakes(get().takes.filter((t) => t.wordId !== wordId));
      save();
    },

    exportData: () => ({
      app: 'qoldau',
      version: 2,
      samples: get().samples,
      userWords: get().userWords,
      takes: get().takes.flatMap((t) => (t.sign ? [{ wordId: t.wordId, at: t.at, sign: t.sign }] : [])),
    }),

    importData: (data) => {
      const d = data as Partial<TrainingExport> | null;
      if (!d || d.app !== 'qoldau') throw new Error('Not a Qoldau export');
      const samples = sanitizeSamples(d.samples);
      const words = sanitizeWords(d.userWords);
      const merged = { ...get().samples };
      for (const [id, vectors] of Object.entries(samples)) {
        merged[id] = [...(merged[id] ?? []), ...vectors].slice(-MAX_SAMPLES_PER_WORD);
      }
      const known = new Set(get().takes.map((t) => `${t.wordId}@${t.at}`));
      const imported: Take[] = (Array.isArray(d.takes) ? d.takes : [])
        .filter((t) => typeof t?.wordId === 'string' && isSign(t.sign) && !known.has(`${t.wordId}@${t.at}`))
        .map((t, i) => ({ id: `${newId()}${i}`, wordId: t.wordId, at: Number(t.at) || 0, vectors: [], sign: t.sign, thumb: null, coverage: 1, video: false }));
      const knownWords = new Set(get().userWords.map((w) => w.id));
      set({ samples: merged, userWords: [...get().userWords, ...words.filter((w) => !knownWords.has(w.id))] });
      setTakes([...get().takes, ...imported].sort((a, b) => a.at - b.at));
      save();
      return new Set([...Object.keys(samples), ...imported.map((t) => t.wordId)]).size;
    },

    resetAll: () => {
      set({ samples: {}, userWords: [] });
      setTakes([]);
      save();
      // Also clips left behind by an interrupted save.
      idbKeys()
        .then((keys) => idbDelMany(keys.filter((k) => typeof k === 'string' && k.startsWith(VIDEO_KEY))))
        .catch(() => undefined);
    },
  };
});
