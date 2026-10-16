import type { Firestore } from 'firebase/firestore';
import { CloudError, type PublicUser } from './cloud';
import { firebase } from './firebase';

/**
 * The shared chat for registered users, on Cloud Firestore.
 *
 * chat/{id}: { uid, name, text, createdAt }. Every message is written in one
 * batch with chatMeta/{uid}: { last }; firestore.rules accept that pair once
 * per few seconds per account (a spam guard) and check the name against the
 * author's profile, so only registered users can write.
 *
 * Messages arrive live (onSnapshot), which firestore/lite cannot do, so the
 * full Firestore SDK is used here. It is downloaded when the chat is opened.
 */
export interface ChatMessage {
  id: string;
  uid: string;
  name: string;
  text: string;
  /** Null only for a message from an older client without a time. */
  at: Date | null;
  /** Written on this device, not yet confirmed by the server. */
  pending: boolean;
}

/** How many of the latest messages are shown. */
export const CHAT_LIMIT = 80;
/** The same limit as firestore.rules. */
export const CHAT_MAX_LENGTH = 500;
/** firestore.rules accept one message per 3 s; a little more here for clock and network delays. */
export const CHAT_GAP_MS = 3500;

interface Live {
  db: Firestore;
  F: typeof import('firebase/firestore');
}

let loading: Promise<Live> | null = null;

function live(): Promise<Live> {
  loading ??= (async () => {
    const [{ app }, F] = await Promise.all([firebase(), import('firebase/firestore')]);
    return { db: F.getFirestore(app), F };
  })();
  loading.catch(() => {
    loading = null;
  });
  return loading;
}

/** Trims the text, keeps at most one empty line in a row and cuts it to the limit. */
export function cleanText(text: string): string {
  return text
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, CHAT_MAX_LENGTH);
}

/** Calls back with the latest messages, oldest first, now and after every change. */
export async function watchChat(onChange: (messages: ChatMessage[]) => void, onError: () => void): Promise<() => void> {
  const { db, F } = await live();
  const latest = F.query(F.collection(db, 'chat'), F.orderBy('createdAt', 'desc'), F.limit(CHAT_LIMIT));
  return F.onSnapshot(
    latest,
    (snap) => {
      const messages = snap.docs.map((d) => {
        const data = d.data({ serverTimestamps: 'estimate' }) as { uid?: string; name?: string; text?: string; createdAt?: { toDate(): Date } };
        return {
          id: d.id,
          uid: data.uid ?? '',
          name: data.name ?? '—',
          text: data.text ?? '',
          at: data.createdAt?.toDate() ?? null,
          pending: d.metadata.hasPendingWrites,
        };
      });
      onChange(messages.reverse());
    },
    (err) => {
      console.warn('[qoldau] chat:', err);
      onError();
    },
  );
}

export async function sendMessage(user: PublicUser, text: string): Promise<void> {
  const clean = cleanText(text);
  if (!clean) return;
  const { db, F } = await live();
  try {
    const batch = F.writeBatch(db);
    batch.set(F.doc(F.collection(db, 'chat')), { uid: user.id, name: user.name, text: clean, createdAt: F.serverTimestamp() });
    batch.set(F.doc(db, 'chatMeta', user.id), { last: F.serverTimestamp() });
    await batch.commit();
  } catch (err) {
    const code = (err as { code?: string } | null)?.code;
    throw new CloudError(code === 'permission-denied' ? 'denied' : code === 'unavailable' ? 'network' : 'unknown');
  }
}

export async function deleteMessage(id: string): Promise<void> {
  const { db, F } = await live();
  await F.deleteDoc(F.doc(db, 'chat', id));
}
