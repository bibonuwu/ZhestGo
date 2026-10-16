import type { FirebaseApp } from 'firebase/app';
import type { Auth } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore/lite';

/**
 * Firebase project “qoldau”: accounts (Authentication, e-mail + password) and
 * the leaderboard (Cloud Firestore). A web config is public by design; what
 * visitors may read and write is decided by firestore.rules.
 */
export const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyDO9Acn10veap52h15Q_Y6wbaOIU0-wnMU',
  authDomain: 'qoldau-4630c.firebaseapp.com',
  projectId: 'qoldau-4630c',
  storageBucket: 'qoldau-4630c.firebasestorage.app',
  messagingSenderId: '529384279018',
  appId: '1:529384279018:web:3229b607932a86a7934093',
};

export interface Firebase {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
  /** The firebase/auth module. */
  A: typeof import('firebase/auth');
  /** The firebase/firestore/lite module (no realtime listeners, a fraction of the size). */
  F: typeof import('firebase/firestore/lite');
}

let loading: Promise<Firebase> | null = null;

/** The SDK is downloaded on first use, so the home page does not wait for it. */
export function firebase(): Promise<Firebase> {
  loading ??= (async () => {
    const [{ initializeApp }, A, F] = await Promise.all([
      import('firebase/app'),
      import('firebase/auth'),
      import('firebase/firestore/lite'),
    ]);
    const app = initializeApp(FIREBASE_CONFIG);
    // initializeAuth without a popup resolver keeps the bundle small (e-mail sign-in only).
    const auth = A.initializeAuth(app, {
      persistence: [A.indexedDBLocalPersistence, A.browserLocalPersistence, A.browserSessionPersistence],
    });
    return { app, auth, db: F.getFirestore(app), A, F };
  })();
  loading.catch(() => {
    loading = null;
  });
  return loading;
}
