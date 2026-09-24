import { lookupWord, type AnyWord } from '../data/words';
import { useSession } from '../store/session';
import { useSettings } from '../store/settings';
import { useServerStatus } from '../store/status';
import { useUi } from '../store/ui';
import { useVoice } from '../store/voice';
import { composeWithAI } from './api';
import { composeLocal } from './compose';
import { learnFromConfirmed } from './learning';
import { speak, type SpeechResult } from './speech';

export function speakText(text: string): Promise<SpeechResult> {
  const { engine, voiceURI, rate, voiceId } = useSettings.getState();
  return speak(text, {
    engine,
    voiceURI,
    rate,
    serverTts: Boolean(useServerStatus.getState().server?.tts),
    offlineVoice: voiceId,
    offlineReady: useVoice.getState().status[voiceId] === 'ready',
    online: useUi.getState().online,
  });
}

const wordsOf = (ids: readonly string[]): AnyWord[] => ids.map((id) => lookupWord(id)).filter((w): w is AnyWord => Boolean(w));

/**
 * Turns the current words into a sentence (Kazakh grammar offline, or AI
 * grammar when a server key is configured), shows it, saves it to history,
 * learns from the confirmed gestures and speaks the sentence aloud.
 */
export async function finalizeSentence(): Promise<void> {
  const session = useSession.getState();
  if (session.composing || session.tokens.length === 0) return;

  const tokens = session.tokens;
  const words = wordsOf(tokens.map((t) => t.wordId));
  if (words.length === 0) {
    session.clear();
    return;
  }

  session.setComposing(true);
  let text = composeLocal(words);
  let via: 'ai' | 'local' = 'local';

  const canUseAi = useSettings.getState().useAi && useServerStatus.getState().server?.compose && useUi.getState().online;
  if (canUseAi && words.length > 1) {
    try {
      text = await composeWithAI(words.map((w) => w.kk));
      via = 'ai';
    } catch (err) {
      console.warn('[qoldau] AI composer unavailable, using the offline grammar', err);
    }
  }

  useSession.getState().publish(
    text,
    via,
    tokens.map((t) => t.key),
    words.map((w) => w.id),
  );
  learnFromConfirmed(tokens, useSession.getState().tokens.map((t) => t.key));
  await speakText(text);
}

/** Speaks a ready-made phrase (quick board) and records it in history. */
export async function sayPhrase(ids: readonly string[]): Promise<void> {
  const words = wordsOf(ids);
  const text = composeLocal(words);
  if (!text) return;
  useSession.getState().publish(
    text,
    'local',
    [],
    words.map((w) => w.id),
  );
  await speakText(text);
}

/** Re-speaks a phrase from history and moves it to the top. */
export async function repeatPhrase(text: string, words?: readonly string[]): Promise<void> {
  useSession.getState().publish(text, 'local', [], words);
  await speakText(text);
}
