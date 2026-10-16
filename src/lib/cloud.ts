import type { User } from 'firebase/auth';
import { SIGNS } from '../data/signs';
import { firebase } from './firebase';

/**
 * Accounts and the leaderboard on Firebase.
 *
 * Firestore keeps one public profile per account in `users/{uid}`:
 * { name, learned: sign ids, learnedCount, createdAt, updatedAt }.
 * The e-mail and password stay in Firebase Authentication. firestore.rules
 * lets everyone read profiles (the leaderboard) and only the owner write one.
 */
export interface PublicUser {
  id: string;
  name: string;
  email: string;
  /** Learned sign ids. */
  learned: string[];
}

export interface LeaderRow {
  rank: number;
  name: string;
  learned: number;
  me: boolean;
}

export interface Leaderboard {
  /** How many signs there are to learn. */
  signs: number;
  users: number;
  /** Users who learned at least one sign. */
  learners: number;
  totalLearned: number;
  top: LeaderRow[];
  /** Null for guests; rank is null until the first sign is learned. */
  me: { rank: number | null; learned: number } | null;
}

/** An error with a short code the interface translates (see AuthDialog). */
export class CloudError extends Error {
  constructor(readonly code: string) {
    super(code);
  }
}

const AUTH_CODES: Record<string, string> = {
  'auth/email-already-in-use': 'email_taken',
  'auth/invalid-email': 'invalid_email',
  'auth/missing-email': 'invalid_email',
  'auth/weak-password': 'invalid_password',
  'auth/missing-password': 'invalid_password',
  'auth/invalid-credential': 'wrong_credentials',
  'auth/invalid-login-credentials': 'wrong_credentials',
  'auth/wrong-password': 'wrong_credentials',
  'auth/user-not-found': 'wrong_credentials',
  'auth/too-many-requests': 'rate_limited',
  'auth/network-request-failed': 'network',
  'auth/operation-not-allowed': 'not_configured',
  'auth/configuration-not-found': 'not_configured',
  'auth/requires-recent-login': 'relogin',
  unavailable: 'network',
  'permission-denied': 'denied',
};

function cloudError(err: unknown): CloudError {
  if (err instanceof CloudError) return err;
  const code = (err as { code?: string } | null)?.code ?? '';
  if (!AUTH_CODES[code]) console.warn('[qoldau] firebase:', err);
  return new CloudError(AUTH_CODES[code] ?? 'unknown');
}

/** Runs a Firebase call and turns its errors into CloudError codes. */
async function guard<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (err) {
    throw cloudError(err);
  }
}

/** Known sign ids only, without duplicates, in lesson order (firestore.rules checks the same). */
function cleanLearned(ids: readonly string[]): string[] {
  const set = new Set(ids);
  return SIGNS.filter((s) => set.has(s.id)).map((s) => s.id);
}

const nameOf = (u: User) => u.displayName?.trim() || u.email?.split('@')[0] || 'Qoldau';

const RECENT_SIGN_IN_MS = 4 * 60 * 1000;

async function setPersistence(remember: boolean) {
  const { auth, A } = await firebase();
  await A.setPersistence(auth, remember ? A.indexedDBLocalPersistence : A.browserSessionPersistence);
}

/** The account's profile; created if it is missing (e.g. the first write failed). */
export const loadProfile = (u: User) => guard(() => profile(u));

async function profile(u: User): Promise<PublicUser> {
  const { db, F } = await firebase();
  const ref = F.doc(db, 'users', u.uid);
  const snap = await F.getDoc(ref);
  if (snap.exists()) {
    const data = snap.data() as { name?: string; learned?: string[] };
    return { id: u.uid, name: data.name ?? nameOf(u), email: u.email ?? '', learned: cleanLearned(data.learned ?? []) };
  }
  const name = nameOf(u).slice(0, 40).padEnd(2, '·');
  await F.setDoc(ref, { name, learned: [], learnedCount: 0, createdAt: F.serverTimestamp(), updatedAt: F.serverTimestamp() });
  return { id: u.uid, name, email: u.email ?? '', learned: [] };
}

/** Calls back with the Firebase user (or null) now and after every sign-in or sign-out. */
export async function watchAuth(onChange: (user: User | null) => void): Promise<() => void> {
  const { auth, A } = await firebase();
  return A.onAuthStateChanged(auth, onChange);
}

export const register = (input: { name: string; email: string; password: string; remember: boolean; learned: string[] }) =>
  guard(async () => {
    const name = input.name.replace(/\s+/g, ' ').trim();
    if (name.length < 2 || name.length > 40 || /[<>]/.test(name)) throw new CloudError('invalid_name');
    await setPersistence(input.remember);
    const { auth, db, A, F } = await firebase();
    const { user } = await A.createUserWithEmailAndPassword(auth, input.email.trim(), input.password);
    await A.updateProfile(user, { displayName: name });
    const learned = cleanLearned(input.learned);
    await F.setDoc(F.doc(db, 'users', user.uid), {
      name,
      learned,
      learnedCount: learned.length,
      createdAt: F.serverTimestamp(),
      updatedAt: F.serverTimestamp(),
    });
    return { id: user.uid, name, email: user.email ?? '', learned } satisfies PublicUser;
  });

export const login = (input: { email: string; password: string; remember: boolean }) =>
  guard(async () => {
    await setPersistence(input.remember);
    const { auth, A } = await firebase();
    const { user } = await A.signInWithEmailAndPassword(auth, input.email.trim(), input.password);
    return profile(user);
  });

export const logout = () =>
  guard(async () => {
    const { auth, A } = await firebase();
    await A.signOut(auth);
  });

/** Deletes the profile (leaving the leaderboard), then the account itself. */
export const deleteAccount = () =>
  guard(async () => {
    const { auth, db, A, F } = await firebase();
    const user = auth.currentUser;
    if (!user) throw new CloudError('relogin');
    // Firebase only deletes an account signed in during the last few minutes.
    // Ask for a fresh sign-in first, so the progress is not removed without the account.
    if (Date.now() - Date.parse(user.metadata.lastSignInTime ?? '') > RECENT_SIGN_IN_MS) {
      await A.signOut(auth);
      throw new CloudError('relogin');
    }
    await F.deleteDoc(F.doc(db, 'users', user.uid));
    await A.deleteUser(user);
  });

export const saveProgress = (learned: string[]) =>
  guard(async () => {
    const { auth, db, F } = await firebase();
    const user = auth.currentUser;
    if (!user) throw new CloudError('relogin');
    const clean = cleanLearned(learned);
    await F.updateDoc(F.doc(db, 'users', user.uid), {
      learned: clean,
      learnedCount: clean.length,
      updatedAt: F.serverTimestamp(),
    });
    return clean;
  });

/** Top `size` learners plus totals; `me` is where the signed-in user stands. */
export const fetchLeaderboard = (size: number, me: PublicUser | null) =>
  guard(async (): Promise<Leaderboard> => {
    const { db, F } = await firebase();
    const users = F.collection(db, 'users');
    const learners = F.query(users, F.where('learnedCount', '>', 0));
    const [totals, learnerCount, top] = await Promise.all([
      F.getAggregate(users, { users: F.count(), learned: F.sum('learnedCount') }),
      F.getCount(learners),
      F.getDocs(F.query(learners, F.orderBy('learnedCount', 'desc'), F.orderBy('updatedAt', 'asc'), F.limit(size))),
    ]);
    const rows: LeaderRow[] = top.docs.map((d, i) => {
      const data = d.data() as { name?: string; learnedCount?: number };
      return { rank: i + 1, name: data.name ?? '—', learned: data.learnedCount ?? 0, me: d.id === me?.id };
    });

    let mine: Leaderboard['me'] = null;
    if (me) {
      const listed = rows.find((r) => r.me);
      let rank: number | null = listed?.rank ?? null;
      if (!rank && me.learned.length > 0) {
        const ahead = await F.getCount(F.query(users, F.where('learnedCount', '>', me.learned.length)));
        rank = ahead.data().count + 1;
      }
      mine = { rank, learned: me.learned.length };
    }

    return {
      signs: SIGNS.length,
      users: totals.data().users,
      learners: learnerCount.data().count,
      totalLearned: totals.data().learned ?? 0,
      top: rows,
      me: mine,
    };
  });
