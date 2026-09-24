import { create } from 'zustand';
import { fetchServerStatus, type ServerStatus } from '../lib/api';

interface StatusStore {
  server: ServerStatus | null;
  checked: boolean;
  refresh: () => Promise<void>;
}

export const useServerStatus = create<StatusStore>((set) => ({
  server: null,
  checked: false,
  refresh: async () => {
    set({ server: await fetchServerStatus(), checked: true });
  },
}));
