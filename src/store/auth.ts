import { create } from 'zustand';
import * as cloud from '../lib/cloud';
import type { PublicUser } from '../lib/cloud';
import { useLeaderboard } from './leaderboard';
import { useLearn } from './learn';

interface AuthStore {
  user: PublicUser | null;
  /** The saved session has been checked. */
  checked: boolean;
  /** False when Firebase could not be reached (offline): accounts are not available. */
  available: boolean;
  /** Starts following the Firebase session (once). */
  start: () => Promise<void>;
  register: (input: { name: string; email: string; password: string; remember: boolean }) => Promise<PublicUser>;
  login: (input: { email: string; password: string; remember: boolean }) => Promise<PublicUser>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<void>;
}

const sameList = (a: readonly string[], b: readonly string[]) => a.length === b.length && a.every((x, i) => x === b[i]);

/** Set while the local progress is replaced with the account's, so it is not sent straight back. */
let applying = false;
/** Set during an explicit sign-in or sign-up, which apply the account themselves. */
let signingIn = false;
/** Bumped by every sign-in/out, so a slow profile load cannot overwrite a newer state. */
let generation = 0;
let started: Promise<void> | null = null;

function applyProgress(learned: string[]): void {
  applying = true;
  useLearn.getState().replace(learned);
  applying = false;
}

/**
 * The device shows the account's progress. Right after signing in, signs
 * learned on this device as a guest are added to the account first.
 */
async function adopt(user: PublicUser, mergeLocal: boolean): Promise<PublicUser> {
  const merged = mergeLocal ? [...new Set([...user.learned, ...useLearn.getState().learned])] : user.learned;
  let result = user;
  if (merged.length !== user.learned.length) {
    try {
      result = { ...user, learned: await cloud.saveProgress(merged) };
    } catch {
      // The next change syncs again.
    }
  }
  applyProgress(result.learned);
  useAuth.setState({ user: result, available: true });
  void useLeaderboard.getState().refresh();
  return result;
}

async function signIn(run: () => Promise<PublicUser>): Promise<PublicUser> {
  signingIn = true;
  generation++;
  try {
    return await adopt(await run(), true);
  } finally {
    signingIn = false;
  }
}

function signedOut(): void {
  generation++;
  useAuth.setState({ user: null });
  // The progress belongs to the account; the next person on this device starts fresh.
  applyProgress([]);
  void useLeaderboard.getState().refresh();
}

export const useAuth = create<AuthStore>((set, get) => ({
  user: null,
  checked: false,
  available: true,
  start: () => {
    started ??= cloud
      .watchAuth((fbUser) => {
        set({ checked: true });
        if (signingIn) return;
        if (!fbUser) {
          if (get().user) signedOut();
          return;
        }
        if (get().user?.id === fbUser.uid) return;
        // A saved session (or a sign-in in another tab): load its profile.
        const mine = ++generation;
        cloud.loadProfile(fbUser).then(
          (profile) => {
            if (mine === generation && !signingIn) void adopt(profile, false);
          },
          () => undefined,
        );
      })
      .then(
        () => set({ available: true }),
        () => {
          started = null;
          set({ available: false, checked: true });
        },
      );
    return started;
  },
  register: (input) => signIn(() => cloud.register({ ...input, learned: useLearn.getState().learned })),
  login: (input) => signIn(() => cloud.login(input)),
  logout: async () => {
    await cloud.logout().catch(() => undefined);
    signedOut();
  },
  deleteAccount: async () => {
    await cloud.deleteAccount();
    signedOut();
  },
}));

// Signed in: every change to the learned signs is saved to the account (debounced).
let syncTimer: ReturnType<typeof setTimeout> | undefined;

useLearn.subscribe((state, prev) => {
  if (applying || state.learned === prev.learned || !useAuth.getState().user) return;
  clearTimeout(syncTimer);
  syncTimer = setTimeout(async () => {
    const learned = useLearn.getState().learned;
    const user = useAuth.getState().user;
    if (!user || sameList(learned, user.learned)) return;
    try {
      const saved = await cloud.saveProgress(learned);
      if (useAuth.getState().user?.id === user.id) useAuth.setState({ user: { ...user, learned: saved } });
      void useLeaderboard.getState().refresh();
    } catch {
      // Offline or signed out elsewhere: the next change tries again.
    }
  }, 600);
});
