import { create } from 'zustand';
import { CloudError, fetchLeaderboard, type Leaderboard } from '../lib/cloud';
import { useAuth } from './auth';

interface LeaderboardStore {
  data: Leaderboard | null;
  /** unavailable: Firebase could not be reached (offline). */
  status: 'idle' | 'loading' | 'ready' | 'unavailable';
  /** How many top places to load: 3 on the home page, more on the leaderboard page. */
  size: number;
  refresh: () => Promise<void>;
  /** Loads at least `size` places. */
  want: (size: number) => void;
}

let inFlight: Promise<void> | null = null;

export const useLeaderboard = create<LeaderboardStore>((set, get) => ({
  data: null,
  status: 'idle',
  size: 3,
  refresh: () => {
    inFlight ??= (async () => {
      if (!get().data) set({ status: 'loading' });
      try {
        set({ data: await fetchLeaderboard(get().size, useAuth.getState().user), status: 'ready' });
      } catch (err) {
        // Keep the last result if a refresh fails.
        if (!get().data || (err instanceof CloudError && err.code === 'network')) set({ status: 'unavailable' });
      } finally {
        inFlight = null;
      }
    })();
    return inFlight;
  },
  want: (size) => {
    if (size <= get().size) return;
    set({ size });
    if (inFlight) void inFlight.then(() => get().refresh());
    else void get().refresh();
  },
}));
