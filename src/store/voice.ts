import { create } from 'zustand';
import { VOICES, cacheSupported, downloadVoice, isVoiceReady, removeVoice, type VoiceId } from '../speech/voices';

export type VoiceStatus = 'unknown' | 'absent' | 'downloading' | 'ready' | 'error';

interface VoiceStore {
  status: Record<VoiceId, VoiceStatus>;
  /** Download progress 0…1 of the voice being downloaded. */
  progress: number;
  error: string | null;
  refresh: () => Promise<void>;
  download: (id: VoiceId) => Promise<boolean>;
  remove: (id: VoiceId) => Promise<void>;
}

const ids = Object.keys(VOICES) as VoiceId[];

export const useVoice = create<VoiceStore>((set, get) => ({
  status: Object.fromEntries(ids.map((id) => [id, 'unknown'])) as Record<VoiceId, VoiceStatus>,
  progress: 0,
  error: null,

  refresh: async () => {
    if (!cacheSupported()) {
      set({ status: Object.fromEntries(ids.map((id) => [id, 'absent'])) as Record<VoiceId, VoiceStatus> });
      return;
    }
    const ready = await Promise.all(ids.map(isVoiceReady));
    const status = { ...get().status };
    ids.forEach((id, i) => {
      if (status[id] !== 'downloading') status[id] = ready[i] ? 'ready' : 'absent';
    });
    set({ status });
  },

  download: async (id) => {
    if (get().status[id] === 'downloading') return false;
    set({ status: { ...get().status, [id]: 'downloading' }, progress: 0, error: null });
    try {
      await downloadVoice(id, (progress) => set({ progress }));
      set({ status: { ...get().status, [id]: 'ready' }, progress: 1 });
      return true;
    } catch (err) {
      console.warn('[qoldau] voice download failed', err);
      set({ status: { ...get().status, [id]: 'error' }, error: err instanceof Error ? err.message : String(err) });
      return false;
    }
  },

  remove: async (id) => {
    await removeVoice(id);
    await get().refresh();
  },
}));
